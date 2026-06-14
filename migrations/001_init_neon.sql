BEGIN;

CREATE TABLE IF NOT EXISTS surveys (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_questions (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  position INTEGER NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS survey_answers (
  id UUID PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  value_text TEXT,
  value_option TEXT,
  value_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS survey_questions_survey_id_idx
ON survey_questions (survey_id, position);

CREATE INDEX IF NOT EXISTS survey_responses_survey_id_idx
ON survey_responses (survey_id, created_at DESC);

CREATE INDEX IF NOT EXISTS survey_answers_question_id_idx
ON survey_answers (question_id);

COMMIT;