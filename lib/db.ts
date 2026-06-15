import { neon } from "@neondatabase/serverless";

let schemaReadyPromise: Promise<void> | null = null;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  return neon(databaseUrl);
}

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureSchema() {
  const sql = getSql();

  if (!sql) {
    return null;
  }

  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          session_token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS surveys (
          id UUID PRIMARY KEY,
          user_id UUID,
          slug TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS survey_questions (
          id UUID PRIMARY KEY,
          survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          prompt TEXT NOT NULL,
          type TEXT NOT NULL,
          required BOOLEAN NOT NULL DEFAULT TRUE,
          position INTEGER NOT NULL,
          options JSONB NOT NULL DEFAULT '[]'::jsonb
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS survey_responses (
          id UUID PRIMARY KEY,
          survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS survey_answers (
          id UUID PRIMARY KEY,
          response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
          question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
          value_text TEXT,
          value_option TEXT,
          value_number INTEGER,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      await sql`
        ALTER TABLE surveys
        ADD COLUMN IF NOT EXISTS user_id UUID
      `;

      await sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'surveys_user_id_fkey'
          ) THEN
            ALTER TABLE surveys
            ADD CONSTRAINT surveys_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE;
          END IF;
        END
        $$
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS survey_questions_survey_id_idx
        ON survey_questions (survey_id, position)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS survey_responses_survey_id_idx
        ON survey_responses (survey_id, created_at DESC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS survey_answers_question_id_idx
        ON survey_answers (question_id)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS surveys_user_id_idx
        ON surveys (user_id, created_at DESC)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
        ON auth_sessions (user_id)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
        ON auth_sessions (expires_at)
      `;
    })();
  }

  await schemaReadyPromise;
  return sql;
}

export async function withDatabase<T>(
  work: (sql: NonNullable<ReturnType<typeof getSql>>) => Promise<T>,
) {
  const sql = await ensureSchema();

  if (!sql) {
    return null;
  }

  return work(sql);
}