import { withDatabase } from "./db";
import type {
  QuestionAnalytics,
  SurveyAnalytics,
  SurveyDetail,
  SurveyQuestion,
  SurveySummary,
} from "./types";

type RecordValue = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown) {
  return value === true;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function parseOptions(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === "string");
      }
    } catch {
      return [];
    }
  }

  return [];
}

function mapSummary(row: RecordValue): SurveySummary {
  return {
    id: asText(row.id),
    slug: asText(row.slug),
    title: asText(row.title),
    description: asText(row.description),
    isActive: asBoolean(row.is_active),
    questionCount: asNumber(row.question_count),
    responseCount: asNumber(row.response_count),
    createdAt: asText(row.created_at),
  };
}

function mapQuestion(row: RecordValue): SurveyQuestion {
  return {
    id: asText(row.id),
    prompt: asText(row.prompt),
    type: asText(row.type) as SurveyQuestion["type"],
    required: asBoolean(row.required),
    position: asNumber(row.position),
    options: parseOptions(row.options),
  };
}

async function listSurveySummaries(includeInactive: boolean) {
  const surveys = await withDatabase(async (sql) => {
    const rows = (await sql`
      SELECT
        surveys.id,
        surveys.slug,
        surveys.title,
        surveys.description,
        surveys.is_active,
        surveys.created_at,
        COUNT(DISTINCT survey_questions.id)::int AS question_count,
        COUNT(DISTINCT survey_responses.id)::int AS response_count
      FROM surveys
      LEFT JOIN survey_questions
        ON survey_questions.survey_id = surveys.id
      LEFT JOIN survey_responses
        ON survey_responses.survey_id = surveys.id
      WHERE ${includeInactive} OR surveys.is_active = TRUE
      GROUP BY surveys.id
      ORDER BY surveys.created_at DESC
    `) as RecordValue[];

    return rows.map(mapSummary);
  });

  return surveys ?? [];
}

  async function listOwnerSurveySummaries(userId: string) {
    const surveys = await withDatabase(async (sql) => {
      const rows = (await sql`
        SELECT
          surveys.id,
          surveys.slug,
          surveys.title,
          surveys.description,
          surveys.is_active,
          surveys.created_at,
          COUNT(DISTINCT survey_questions.id)::int AS question_count,
          COUNT(DISTINCT survey_responses.id)::int AS response_count
        FROM surveys
        LEFT JOIN survey_questions
          ON survey_questions.survey_id = surveys.id
        LEFT JOIN survey_responses
          ON survey_responses.survey_id = surveys.id
        WHERE surveys.user_id = ${userId}
        GROUP BY surveys.id
        ORDER BY surveys.created_at DESC
      `) as RecordValue[];

      return rows.map(mapSummary);
    });

    return surveys ?? [];
  }

async function getSurveyQuestions(surveyId: string) {
  const questions = await withDatabase(async (sql) => {
    const rows = (await sql`
      SELECT id, prompt, type, required, position, options
      FROM survey_questions
      WHERE survey_id = ${surveyId}
      ORDER BY position ASC
    `) as RecordValue[];

    return rows.map(mapQuestion);
  });

  return questions ?? [];
}

export async function listActiveSurveys() {
  return listSurveySummaries(false);
}

export async function getSurveyBySlug(slug: string): Promise<SurveyDetail | null> {
  const summary = await withDatabase(async (sql) => {
    const rows = (await sql`
      SELECT
        surveys.id,
        surveys.slug,
        surveys.title,
        surveys.description,
        surveys.is_active,
        surveys.created_at,
        COUNT(DISTINCT survey_questions.id)::int AS question_count,
        COUNT(DISTINCT survey_responses.id)::int AS response_count
      FROM surveys
      LEFT JOIN survey_questions
        ON survey_questions.survey_id = surveys.id
      LEFT JOIN survey_responses
        ON survey_responses.survey_id = surveys.id
      WHERE surveys.slug = ${slug}
      GROUP BY surveys.id
      LIMIT 1
    `) as RecordValue[];

    return rows[0] ? mapSummary(rows[0]) : null;
  });

  if (!summary) {
    return null;
  }

  return {
    ...summary,
    questions: await getSurveyQuestions(summary.id),
  };
}

  export async function getSurveyByIdForOwner(
    surveyId: string,
    userId: string,
  ): Promise<SurveyDetail | null> {
    const summary = await withDatabase(async (sql) => {
      const rows = (await sql`
        SELECT
          surveys.id,
          surveys.slug,
          surveys.title,
          surveys.description,
          surveys.is_active,
          surveys.created_at,
          COUNT(DISTINCT survey_questions.id)::int AS question_count,
          COUNT(DISTINCT survey_responses.id)::int AS response_count
        FROM surveys
        LEFT JOIN survey_questions
          ON survey_questions.survey_id = surveys.id
        LEFT JOIN survey_responses
          ON survey_responses.survey_id = surveys.id
        WHERE surveys.id = ${surveyId}
          AND surveys.user_id = ${userId}
        GROUP BY surveys.id
        LIMIT 1
      `) as RecordValue[];

      return rows[0] ? mapSummary(rows[0]) : null;
    });

    if (!summary) {
      return null;
    }

    return {
      ...summary,
      questions: await getSurveyQuestions(summary.id),
    };
  }

export async function getSurveyForSubmission(surveyId: string): Promise<SurveyDetail | null> {
  const survey = await withDatabase(async (sql) => {
    const rows = (await sql`
      SELECT
        surveys.id,
        surveys.slug,
        surveys.title,
        surveys.description,
        surveys.is_active,
        surveys.created_at,
        COUNT(DISTINCT survey_questions.id)::int AS question_count,
        COUNT(DISTINCT survey_responses.id)::int AS response_count
      FROM surveys
      LEFT JOIN survey_questions
        ON survey_questions.survey_id = surveys.id
      LEFT JOIN survey_responses
        ON survey_responses.survey_id = surveys.id
      WHERE surveys.id = ${surveyId}
      GROUP BY surveys.id
      LIMIT 1
    `) as RecordValue[];

    return rows[0] ? mapSummary(rows[0]) : null;
  });

  if (!survey || !survey.isActive) {
    return null;
  }

  return {
    ...survey,
    questions: await getSurveyQuestions(survey.id),
  };
}

function buildDistribution(question: SurveyQuestion, answers: RecordValue[]): QuestionAnalytics {
  const options =
    question.type === "rating"
      ? ["1", "2", "3", "4", "5"]
      : question.options;

  const counts = new Map(options.map((option) => [option, 0]));
  const textAnswers: string[] = [];

  for (const answer of answers) {
    const valueOption = asText(answer.value_option);
    const valueText = asText(answer.value_text).trim();
    const valueNumber = answer.value_number;

    if (question.type === "single_choice" && counts.has(valueOption)) {
      counts.set(valueOption, (counts.get(valueOption) ?? 0) + 1);
    }

    if (question.type === "rating" && valueNumber !== null && valueNumber !== undefined) {
      const label = String(asNumber(valueNumber));

      if (counts.has(label)) {
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }

    if (question.type === "text" && valueText) {
      textAnswers.push(valueText);
    }
  }

  return {
    questionId: question.id,
    prompt: question.prompt,
    type: question.type,
    totalAnswers:
      question.type === "text"
        ? textAnswers.length
        : [...counts.values()].reduce((total, count) => total + count, 0),
    options,
    distribution: options.map((label) => ({
      label,
      count: counts.get(label) ?? 0,
    })),
    textAnswers,
  };
}

export async function getAdminSurveyAnalytics(userId: string): Promise<SurveyAnalytics[]> {
  const summaries = await listOwnerSurveySummaries(userId);

  if (summaries.length === 0) {
    return [];
  }

  const results: SurveyAnalytics[] = [];

  for (const survey of summaries) {
    const questions = await getSurveyQuestions(survey.id);
    const answerRows =
      (await withDatabase(async (sql) => {
        return (await sql`
          SELECT
            survey_questions.id AS question_id,
            survey_answers.value_text,
            survey_answers.value_option,
            survey_answers.value_number
          FROM survey_questions
          LEFT JOIN survey_answers
            ON survey_answers.question_id = survey_questions.id
          WHERE survey_questions.survey_id = ${survey.id}
          ORDER BY survey_questions.position ASC
        `) as RecordValue[];
      })) ?? [];

    results.push({
      ...survey,
      questions,
      results: questions.map((question) => {
        const matchingAnswers = answerRows.filter(
          (answer) => asText(answer.question_id) === question.id,
        );

        return buildDistribution(question, matchingAnswers);
      }),
    });
  }

  return results;
}