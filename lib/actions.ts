"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  changePasswordForUser,
  clearUserSession,
  createUserSession,
  loginWithPassword,
  registerWithPassword,
  requireUser,
} from "./auth";
import { ensureSchema } from "./db";
import { getSurveyByIdForOwner, getSurveyForSubmission } from "./data";

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

const credentialsSchema = z.object({
  email: z.string().trim().email("Ingresa un correo valido."),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
});

const resetPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contrasena actual."),
    newPassword: z.string().min(8, "La nueva contrasena debe tener al menos 8 caracteres."),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "La nueva contrasena debe ser diferente a la actual.",
    path: ["newPassword"],
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
  const user = await requireUser();

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
    INSERT INTO surveys (id, user_id, slug, title, description, is_active)
    VALUES (
      ${surveyId},
      ${user.id},
      ${slug},
      ${parsed.data.title},
      ${parsed.data.description},
      ${parsed.data.isActive}
    )
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

function normalizeQuestionPayload(
  questions: Array<{
    prompt: string;
    type: "single_choice" | "rating" | "text";
    required: boolean;
    options?: string[];
  }>,
) {
  return questions.map((question) => ({
    prompt: question.prompt.trim(),
    type: question.type,
    required: question.required,
    options:
      question.type === "single_choice"
        ? (question.options ?? []).map((option) => option.trim()).filter(Boolean)
        : [],
  }));
}

export async function updateSurveyAction(formData: FormData) {
  const user = await requireUser();
  const surveyId = formData.get("surveyId");

  if (typeof surveyId !== "string") {
    throw new Error("Falta informacion de la encuesta.");
  }

  const parsed = createSurveySchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    isActive: formData.get("isActive") === "on",
    questions: parseQuestionsPayload(formData),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "No se pudo actualizar la encuesta.");
  }

  const existingSurvey = await getSurveyByIdForOwner(surveyId, user.id);

  if (!existingSurvey) {
    throw new Error("No tienes acceso a esta encuesta.");
  }

  const sql = await ensureSchema();

  if (!sql) {
    throw new Error("Configura DATABASE_URL antes de editar encuestas.");
  }

  const responseRows = (await sql`
    SELECT COUNT(*)::int AS total
    FROM survey_responses
    WHERE survey_id = ${surveyId}
  `) as Array<Record<string, unknown>>;

  const responseCount = Number(responseRows[0]?.total ?? 0);

  const incomingQuestions = normalizeQuestionPayload(parsed.data.questions);
  const existingQuestions = normalizeQuestionPayload(existingSurvey.questions);
  const questionsChanged = JSON.stringify(incomingQuestions) !== JSON.stringify(existingQuestions);

  if (responseCount > 0 && questionsChanged) {
    throw new Error("No puedes editar las preguntas de una encuesta que ya tiene respuestas.");
  }

  await sql`
    UPDATE surveys
    SET
      title = ${parsed.data.title},
      description = ${parsed.data.description},
      is_active = ${parsed.data.isActive}
    WHERE id = ${surveyId}
      AND user_id = ${user.id}
  `;

  if (responseCount === 0 && questionsChanged) {
    await sql`
      DELETE FROM survey_questions
      WHERE survey_id = ${surveyId}
    `;

    for (const [index, question] of incomingQuestions.entries()) {
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
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/s/${existingSurvey.slug}`);
  redirect("/admin");
}

export async function registerAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/auth?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos invalidos")}`);
  }

  try {
    const user = await registerWithPassword(parsed.data.email, parsed.data.password);
    await createUserSession(user.id);
    redirect("/admin");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la cuenta.";
    redirect(`/auth?error=${encodeURIComponent(message)}`);
  }
}

export async function loginAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect(`/auth?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Datos invalidos")}`);
  }

  try {
    const user = await loginWithPassword(parsed.data.email, parsed.data.password);
    await createUserSession(user.id);
    redirect("/admin");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar sesion.";
    redirect(`/auth?error=${encodeURIComponent(message)}`);
  }
}

export async function logoutAction() {
  await clearUserSession();
  redirect("/");
}

export async function resetPasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = resetPasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "No se pudo actualizar la contrasena.";
    redirect(`/admin?passwordError=${encodeURIComponent(message)}`);
  }

  try {
    await changePasswordForUser(user.id, parsed.data.currentPassword, parsed.data.newPassword);
    redirect("/admin?passwordUpdated=1");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la contrasena.";
    redirect(`/admin?passwordError=${encodeURIComponent(message)}`);
  }
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