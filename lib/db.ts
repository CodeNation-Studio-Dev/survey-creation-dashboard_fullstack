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
        CREATE TABLE IF NOT EXISTS surveys (
          id UUID PRIMARY KEY,
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