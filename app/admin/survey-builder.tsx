"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import type { QuestionType, SurveyDraftQuestion } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Publishing survey..." : "Publish survey"}
    </button>
  );
}

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "single_choice", label: "Single choice" },
  { value: "rating", label: "1-5 rating" },
  { value: "text", label: "Open text" },
];

const initialQuestions: Array<SurveyDraftQuestion & { id: string }> = [
  {
    id: "question-1",
    prompt: "How satisfied are you with the onboarding experience?",
    type: "rating",
    required: true,
    options: [],
  },
  {
    id: "question-2",
    prompt: "Which part of the product needs the most attention next?",
    type: "single_choice",
    required: true,
    options: ["Performance", "Design", "Documentation"],
  },
];

export function SurveyBuilder({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [nextId, setNextId] = useState(3);

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
        options: type === "single_choice" ? ["Option A", "Option B"] : [],
      },
    ]);
    setNextId((current) => current + 1);
  }

  return (
    <form action={action} className="glass-panel rounded-[2rem] p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <span className="pill inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[var(--accent-deep)]">
            <Sparkles className="size-3.5" />
            Survey builder
          </span>
          <h2 className="display-font text-3xl font-semibold tracking-tight md:text-4xl">
            Design questions for anonymous feedback.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[color:rgba(18,33,23,0.72)] md:text-base">
            Create a survey, publish a shareable link, and start collecting responses without asking people to sign in.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => addQuestion("single_choice")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Choice
          </button>
          <button
            type="button"
            onClick={() => addQuestion("rating")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Rating
          </button>
          <button
            type="button"
            onClick={() => addQuestion("text")}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium"
          >
            <Plus className="size-4" />
            Text
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Survey title</span>
          <input name="title" className="field" placeholder="Quarterly Product Pulse" required minLength={3} />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Publishing</span>
          <span className="flex h-[58px] items-center justify-between rounded-[1.25rem] border border-[var(--line)] bg-white/65 px-4">
            <span>
              <span className="block text-sm font-semibold">Accept anonymous responses</span>
              <span className="block text-xs text-[color:rgba(18,33,23,0.6)]">Turn this off to keep the survey as a draft.</span>
            </span>
            <input name="isActive" type="checkbox" defaultChecked className="size-5 accent-[var(--accent)]" />
          </span>
        </label>
      </div>

      <label className="mt-5 block space-y-2">
        <span className="text-sm font-semibold">What should respondents know?</span>
        <textarea
          name="description"
          className="field min-h-28"
          placeholder="Tell people why you are collecting responses and how long the survey will take."
          required
          minLength={12}
        />
      </label>

      <input type="hidden" name="questionsPayload" value={payload} readOnly />

      <div className="mt-8 space-y-4">
        {questions.map((question, index) => (
          <section key={question.id} className="rounded-[1.75rem] border border-[var(--line)] bg-white/68 p-5 shadow-[0_18px_48px_rgba(72,49,21,0.06)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-cool)]">
                  Question {index + 1}
                </p>
                <p className="text-sm text-[color:rgba(18,33,23,0.64)]">
                  Choose the input style and whether respondents must answer.
                </p>
              </div>
              {questions.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--accent-deep)]"
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_0.6fr_0.6fr]">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Prompt</span>
                <input
                  className="field"
                  value={question.prompt}
                  onChange={(event) => updateQuestion(question.id, { prompt: event.target.value })}
                  placeholder="Ask a clear, specific question"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Type</span>
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
                            : ["Option A", "Option B"]
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
                <span className="text-sm font-semibold">Required</span>
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
                <span className="text-sm font-semibold">Options</span>
                <textarea
                  className="field min-h-28"
                  value={(question.options ?? []).join("\n")}
                  onChange={(event) =>
                    updateQuestion(question.id, {
                      options: event.target.value.split("\n"),
                    })
                  }
                  placeholder="One option per line"
                />
              </label>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-[var(--line)] pt-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-sm leading-7 text-[color:rgba(18,33,23,0.68)]">
          Links are anonymous by default. Share the survey URL from the dashboard after publishing and respondents can answer without authentication.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}