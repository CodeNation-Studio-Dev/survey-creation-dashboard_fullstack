"use client";

import { Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitSurveyResponseAction } from "@/lib/actions";
import type { SurveyQuestion } from "@/lib/types";

function getQuestionTypeLabel(type: "single_choice" | "rating" | "text") {
  if (type === "single_choice") {
    return "Opcion unica";
  }

  if (type === "rating") {
    return "Calificacion";
  }

  return "Pregunta abierta";
}

function SubmitButton({ disabledByValidation }: { disabledByValidation: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabledByValidation || pending}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar respuesta"}
      <Send className="size-4" />
    </button>
  );
}

export function SurveyResponseForm({
  surveyId,
  questions,
}: {
  surveyId: string;
  questions: SurveyQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const isMissingRequiredAnswers = useMemo(() => {
    return questions.some((question) => {
      if (!question.required) {
        return false;
      }

      const value = answers[question.id] ?? "";

      if (question.type === "text") {
        return value.trim().length === 0;
      }

      return value.length === 0;
    });
  }, [answers, questions]);

  return (
    <form action={submitSurveyResponseAction} className="mt-8 space-y-5">
      <input type="hidden" name="surveyId" value={surveyId} />

      {questions.map((question, index) => (
        <section key={question.id} className="rounded-[1.8rem] border border-[var(--line)] bg-white/72 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
              Pregunta {index + 1}
            </span>
            <span className="pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cool)]">
              {getQuestionTypeLabel(question.type)}
            </span>
            {question.required ? (
              <span className="pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
                Obligatoria
              </span>
            ) : null}
          </div>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight">{question.prompt}</h2>

          {question.type === "text" ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-[color:rgba(18,33,23,0.65)]">Respuesta abierta</p>
              <textarea
                name={`question_${question.id}`}
                required={question.required}
                className="field min-h-32"
                placeholder="Comparte tu respuesta"
                value={answers[question.id] ?? ""}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
              />
            </div>
          ) : null}

          {question.type === "single_choice" ? (
            <div className="mt-5 grid gap-3">
              {question.options.map((option, optionIndex) => (
                <label
                  key={`${question.id}-${option}`}
                  className="flex cursor-pointer items-center gap-3 rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-4"
                >
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={option}
                    checked={(answers[question.id] ?? "") === option}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    required={question.required && optionIndex === 0}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="font-medium">{option}</span>
                </label>
              ))}
            </div>
          ) : null}

          {question.type === "rating" ? (
            <div className="mt-5 grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((rating) => (
                <label
                  key={`${question.id}-${rating}`}
                  className="flex cursor-pointer flex-col items-center gap-3 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-4 text-center"
                >
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={rating}
                    checked={(answers[question.id] ?? "") === String(rating)}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [question.id]: event.target.value,
                      }))
                    }
                    required={question.required && rating === 1}
                    className="size-4 accent-[var(--accent)]"
                  />
                  <span className="display-font text-3xl font-semibold">{rating}</span>
                </label>
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-sm leading-7 text-[color:rgba(18,33,23,0.68)]">
          Tu respuesta se registra de forma anonima. No se requiere cuenta ni datos identificables.
        </p>
        <SubmitButton disabledByValidation={isMissingRequiredAnswers} />
      </div>
    </form>
  );
}
