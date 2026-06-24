"use client";

import { GripVertical, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import type { QuestionType, SurveyDraftQuestion } from "@/lib/types";

function SubmitButton({ submitLabel }: { submitLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Guardando cambios..." : submitLabel}
    </button>
  );
}

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "single_choice", label: "Opcion unica" },
  { value: "rating", label: "Calificacion 1-5" },
  { value: "text", label: "Texto abierto" },
];

const initialQuestions: Array<SurveyDraftQuestion & { id: string }> = [
  {
    id: "question-1",
    prompt: "Que tan satisfecho/a estas con la experiencia de incorporacion?",
    type: "rating",
    required: true,
    options: [],
  },
  {
    id: "question-2",
    prompt: "Que parte del producto necesita mas atencion ahora?",
    type: "single_choice",
    required: true,
    options: ["Rendimiento", "Diseno", "Documentacion"],
  },
  {
    id: "question-3",
    prompt: "Que sugerencia concreta nos darias para mejorar?",
    type: "text",
    required: false,
    options: [],
  },
];

export function SurveyBuilder({
  action,
  initial,
  surveyId,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  initial?: {
    title: string;
    description: string;
    isActive: boolean;
    questions: Array<SurveyDraftQuestion & { id?: string }>;
  };
  surveyId?: string;
  submitLabel?: string;
}) {
  const seedQuestions =
    initial?.questions.map((question, index) => ({
      ...question,
      id: question.id ?? `question-${index + 1}`,
      options: question.options ?? [],
    })) ?? initialQuestions;

  const [questions, setQuestions] = useState(seedQuestions);
  const [nextId, setNextId] = useState(seedQuestions.length + 1);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [dragOverQuestionId, setDragOverQuestionId] = useState<string | null>(null);

  const payload = JSON.stringify(
    questions.map((question) => ({
      prompt: question.prompt,
      type: question.type,
      required: question.required,
      options:
        question.type === "single_choice"
          ? (question.options ?? []).map((option) => option.trim()).filter(Boolean)
          : [],
    })),
  );

  function updateQuestion(id: string, updates: Partial<(typeof questions)[number]>) {
    setQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, ...updates } : question)),
    );
  }

  function addQuestion(type: QuestionType) {
    setQuestions((current) => [
      ...current,
      {
        id: `question-${nextId}`,
        prompt: "",
        type,
        required: true,
        options: type === "single_choice" ? ["Opcion A", "Opcion B"] : [],
      },
    ]);
    setNextId((current) => current + 1);
  }

  function moveQuestionBefore(targetId: string) {
    if (!draggingQuestionId || draggingQuestionId === targetId) {
      return;
    }

    setQuestions((current) => {
      const fromIndex = current.findIndex((question) => question.id === draggingQuestionId);
      const toIndex = current.findIndex((question) => question.id === targetId);

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return current;
      }

      const next = [...current];
      const [movedQuestion] = next.splice(fromIndex, 1);
      const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      next.splice(adjustedToIndex, 0, movedQuestion);

      return next;
    });
  }

  function moveQuestionToEnd() {
    if (!draggingQuestionId) {
      return;
    }

    setQuestions((current) => {
      const fromIndex = current.findIndex((question) => question.id === draggingQuestionId);

      if (fromIndex === -1 || fromIndex === current.length - 1) {
        return current;
      }

      const next = [...current];
      const [movedQuestion] = next.splice(fromIndex, 1);
      next.push(movedQuestion);

      return next;
    });
  }

  return (
    <form action={action} className="glass-panel rounded-[2rem] p-6 md:p-8">
      {surveyId ? <input type="hidden" name="surveyId" value={surveyId} /> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <span className="pill inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[var(--accent-deep)]">
            <Sparkles className="size-3.5" />
            Constructor de encuestas
          </span>
          <h2 className="display-font text-3xl font-semibold tracking-tight md:text-4xl">
            Disena preguntas para feedback anonimo.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[color:rgba(18,33,23,0.72)] md:text-base">
            Crea una encuesta, publica un enlace para compartir y empieza a recolectar respuestas sin pedir inicio de sesion.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => addQuestion("single_choice")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Opcion
          </button>
          <button
            type="button"
            onClick={() => addQuestion("rating")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Calificacion
          </button>
          <button
            type="button"
            onClick={() => addQuestion("text")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Pregunta abierta
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Titulo de la encuesta</span>
          <input
            name="title"
            className="field"
            placeholder="Pulso trimestral del producto"
            defaultValue={initial?.title ?? ""}
            required
            minLength={3}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Publicacion</span>
          <span className="flex h-[58px] items-center justify-between rounded-[1.25rem] border border-[var(--line)] bg-white/65 px-4">
            <span>
              <span className="block text-sm font-semibold">Aceptar respuestas anonimas</span>
              <span className="block text-xs text-[color:rgba(18,33,23,0.6)]">Desactiva esto para dejar la encuesta como borrador.</span>
            </span>
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={initial?.isActive ?? true}
              className="size-5 accent-[var(--accent)]"
            />
          </span>
        </label>
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-sm font-semibold">Que deben saber los participantes?</span>
        <textarea
          name="description"
          className="field min-h-28"
          placeholder="Explica por que recopilas respuestas y cuanto tiempo toma la encuesta."
          defaultValue={initial?.description ?? ""}
          required
          minLength={12}
        />
      </label>

      <input type="hidden" name="questionsPayload" value={payload} readOnly />

      <div
        className="mt-8 space-y-4"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          moveQuestionToEnd();
          setDraggingQuestionId(null);
          setDragOverQuestionId(null);
        }}
      >
        {questions.map((question, index) => (
          <section
            key={question.id}
            className={`rounded-[1.75rem] border bg-white/68 p-5 shadow-[0_18px_48px_rgba(72,49,21,0.06)] transition-colors ${
              dragOverQuestionId === question.id && draggingQuestionId !== question.id
                ? "border-[var(--accent-cool)] bg-[color:rgba(93,154,139,0.12)]"
                : "border-[var(--line)]"
            }`}
            onDragEnter={() => {
              if (draggingQuestionId && draggingQuestionId !== question.id) {
                setDragOverQuestionId(question.id);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (draggingQuestionId && draggingQuestionId !== question.id) {
                setDragOverQuestionId(question.id);
              }
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDragOverQuestionId((current) => (current === question.id ? null : current));
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              moveQuestionBefore(question.id);
              setDraggingQuestionId(null);
              setDragOverQuestionId(null);
            }}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-cool)]">
                  Pregunta {index + 1}
                </p>
                <p className="text-sm text-[color:rgba(18,33,23,0.64)]">
                  Elige el tipo de entrada y si la respuesta sera obligatoria.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    setDraggingQuestionId(question.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", question.id);
                  }}
                  onDragEnd={() => {
                    setDraggingQuestionId(null);
                    setDragOverQuestionId(null);
                  }}
                  title="Arrastra para reordenar"
                  aria-label="Arrastrar pregunta para reordenar"
                  className="inline-flex cursor-grab items-center justify-center rounded-full border border-[var(--line)] bg-white/75 p-2 text-[var(--accent-deep)] active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </button>
                {questions.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--accent-deep)]"
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_0.6fr_0.6fr]">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Enunciado</span>
                <input
                  className="field"
                  value={question.prompt}
                  onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                  placeholder="Escribe una pregunta clara y especifica"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Tipo</span>
                <select
                  className="field"
                  value={question.type}
                  onChange={(event) =>
                    updateQuestion(question.id, {
                      type: event.target.value as QuestionType,
                      options:
                        event.target.value === "single_choice"
                          ? question.options?.length
                            ? question.options
                            : ["Opcion A", "Opcion B"]
                          : [],
                    })
                  }
                >
                  {questionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Obligatoria</span>
                <span className="flex h-[58px] items-center justify-center rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-strong)]">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                    className="size-5 accent-[var(--accent)]"
                  />
                </span>
              </label>
            </div>

            {question.type === "single_choice" ? (
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-semibold">Opciones</span>
                <textarea
                  className="field min-h-28"
                  value={(question.options ?? []).join("\n")}
                  onChange={(event) =>
                    updateQuestion(question.id, {
                      options: event.target.value.split("\n"),
                    })
                  }
                  placeholder="Una opcion por linea"
                />
              </label>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-8 border-t border-[var(--line)] pt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm leading-7 text-[color:rgba(18,33,23,0.68)]">
            Los enlaces son anonimos por defecto. Comparte la URL desde el panel y las personas podran responder sin autenticarse.
          </p>
          <SubmitButton submitLabel={submitLabel ?? "Publicar encuesta"} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => addQuestion("single_choice")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Agregar opcion unica
          </button>
          <button
            type="button"
            onClick={() => addQuestion("rating")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Agregar calificacion
          </button>
          <button
            type="button"
            onClick={() => addQuestion("text")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Agregar pregunta abierta
          </button>
        </div>
      </div>
    </form>
  );
}