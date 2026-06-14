"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ensureSchema } from "./db";
import { getSurveyForSubmission } from "./data";

const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "El enunciado de la pregunta es obligatorio."),
    type: z.enum(["single_choice", "rating", "text"]),
    required: z.boolean().default(true),
    options: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((question, context) => {
    if (question.type === "single_choice" && (!question.options || question.options.length < 2)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las preguntas de opcion unica necesitan al menos dos opciones.",
        path: ["options"],
      });
    }
  });

const createSurveySchema = z.object({
  title: z.string().trim().min(3, "El titulo de la encuesta es obligatorio."),
  description: z.string().trim().min(12, "Agrega una descripcion breve para los participantes."),
  isActive: z.boolean(),
  questions: z.array(questionSchema).min(1, "Agrega al menos una pregunta."),
});

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || "survey"}-${crypto.randomUUID().slice(0, 6)}`;
}

function parseQuestionsPayload(formData: FormData) {
  const payload = formData.get("questionsPayload");

  if (typeof payload !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(payload) as Array<{
      prompt?: string;
      type?: "single_choice" | "rating" | "text";
      required?: boolean;
      options?: string[];
    }>;

    return parsed.map((question) => ({
      prompt: question.prompt ?? "",
      type: question.type ?? "text",
      required: question.required ?? true,
      options: question.options?.map((option) => option.trim()).filter(Boolean),
    }));
  } catch {
    return [];
  }
}

export async function createSurveyAction(formData: FormData) {
  const parsed = createSurveySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isActive: formData.get("isActive") === "on",
    questions: parseQuestionsPayload(formData),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "No se pudo crear la encuesta.");
  }

  const sql = await ensureSchema();

  if (!sql) {
    throw new Error("Configura DATABASE_URL antes de crear encuestas.");
  }

  const surveyId = crypto.randomUUID();
  const slug = slugify(parsed.data.title);

  await sql`
    INSERT INTO surveys (id, slug, title, description, is_active)
    VALUES (${surveyId}, ${slug}, ${parsed.data.title}, ${parsed.data.description}, ${parsed.data.isActive})
  `;

  for (const [index, question] of parsed.data.questions.entries()) {
    await sql`
      INSERT INTO survey_questions (id, survey_id, prompt, type, required, position, options)
      VALUES (
        ${crypto.randomUUID()},
        ${surveyId},
        ${question.prompt},
        ${question.type},
        ${question.required},
        ${index},
        ${JSON.stringify(question.options ?? [])}::jsonb
      )
    `;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

export async function submitSurveyResponseAction(formData: FormData) {
  const surveyId = formData.get("surveyId");

  if (typeof surveyId !== "string") {
    throw new Error("Falta informacion de la encuesta.");
  }

  const survey = await getSurveyForSubmission(surveyId);

  if (!survey) {
    throw new Error("Esta encuesta ya no acepta respuestas.");
  }

  const answers = survey.questions.map((question) => {
    const rawValue = formData.get(`question_${question.id}`);
    const value = typeof rawValue === "string" ? rawValue.trim() : "";

    if (question.required && !value) {
      throw new Error("Responde todas las preguntas obligatorias.");
    }

    if (question.type === "single_choice" && value && !question.options.includes(value)) {
      throw new Error("Una de las respuestas seleccionadas no es valida.");
    }

    if (question.type === "rating" && value) {
      const rating = Number(value);

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        throw new Error("La calificacion debe estar entre 1 y 5.");
      }
    }

    return {
      question,
      value,
    };
  });

  const sql = await ensureSchema();

  if (!sql) {
    throw new Error("Configura DATABASE_URL antes de recopilar respuestas.");
  }

  const responseId = crypto.randomUUID();

  await sql`
    INSERT INTO survey_responses (id, survey_id)
    VALUES (${responseId}, ${survey.id})
  `;

  for (const answer of answers) {
    await sql`
      INSERT INTO survey_answers (id, response_id, question_id, value_text, value_option, value_number)
      VALUES (
        ${crypto.randomUUID()},
        ${responseId},
        ${answer.question.id},
        ${answer.question.type === "text" ? answer.value : null},
        ${answer.question.type === "single_choice" ? answer.value : null},
        ${answer.question.type === "rating" && answer.value ? Number(answer.value) : null}
      )
    `;
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/s/${survey.slug}`);
  redirect(`/s/${survey.slug}/submitted`);
}