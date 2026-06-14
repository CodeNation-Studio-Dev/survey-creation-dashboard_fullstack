import Link from "next/link";
import { BarChart3, Link2, ShieldCheck, Users } from "lucide-react";

import { SurveyBuilder } from "./survey-builder";
import { createSurveyAction } from "@/lib/actions";
import { getAdminSurveyAnalytics } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/db";
import type { QuestionAnalytics } from "@/lib/types";

export const dynamic = "force-dynamic";

function ResultCard({ result }: { result: QuestionAnalytics }) {
  if (result.type === "text") {
    return (
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-lg font-semibold">{result.prompt}</h4>
          <span className="pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            {result.totalAnswers} text replies
          </span>
        </div>
        <div className="mt-4 grid gap-3">
          {result.textAnswers.length > 0 ? (
            result.textAnswers.slice(0, 5).map((answer) => (
              <blockquote
                key={`${result.questionId}-${answer}`}
                className="rounded-[1.2rem] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-7 text-[color:rgba(18,33,23,0.78)]"
              >
                “{answer}”
              </blockquote>
            ))
          ) : (
            <p className="text-sm text-[color:rgba(18,33,23,0.64)]">No written responses yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-lg font-semibold">{result.prompt}</h4>
        <span className="pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
          {result.totalAnswers} answers
        </span>
      </div>
      <div className="mt-5 space-y-4">
        {result.distribution.map((entry) => {
          const percentage = result.totalAnswers === 0 ? 0 : (entry.count / result.totalAnswers) * 100;

          return (
            <div key={`${result.questionId}-${entry.label}`} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm font-medium">
                <span>{entry.label}</span>
                <span className="text-[color:rgba(18,33,23,0.62)]">{entry.count}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[rgba(18,33,23,0.08)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-cool))]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const [surveys, databaseConfigured] = await Promise.all([
    getAdminSurveyAnalytics(),
    Promise.resolve(hasDatabaseConfig()),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:px-8 md:py-10">
      <section className="hero-grid glass-panel overflow-hidden rounded-[2.4rem] border border-[var(--line)] px-6 py-8 md:px-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-5">
            <span className="pill inline-flex w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">
              Admin console
            </span>
            <h1 className="display-font max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
              Publish surveys, monitor answers, and share anonymous response links.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[color:rgba(18,33,23,0.72)] md:text-lg">
              Survey Studio keeps the workflow tight: define questions, copy the share link, and track what people are saying from one place.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/70 p-5">
              <Users className="size-5 text-[var(--accent)]" />
              <p className="mt-4 text-3xl font-semibold">{surveys.reduce((sum, survey) => sum + survey.responseCount, 0)}</p>
              <p className="mt-2 text-sm text-[color:rgba(18,33,23,0.68)]">Total anonymous responses</p>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/70 p-5">
              <BarChart3 className="size-5 text-[var(--accent-cool)]" />
              <p className="mt-4 text-3xl font-semibold">{surveys.length}</p>
              <p className="mt-2 text-sm text-[color:rgba(18,33,23,0.68)]">Surveys in the workspace</p>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/70 p-5">
              <ShieldCheck className="size-5 text-[var(--foreground)]" />
              <p className="mt-4 text-3xl font-semibold">Anon</p>
              <p className="mt-2 text-sm text-[color:rgba(18,33,23,0.68)]">Public links, no sign-in required</p>
            </div>
          </div>
        </div>
      </section>

      {!databaseConfigured ? (
        <section className="glass-panel mt-8 rounded-[2rem] border border-[var(--line)] p-6 md:p-8">
          <h2 className="display-font text-2xl font-semibold">Database setup needed</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:rgba(18,33,23,0.72)] md:text-base">
            Add a Neon connection string in the DATABASE_URL environment variable before creating surveys. The schema is created automatically on first use.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-[rgba(18,33,23,0.04)] p-4 text-sm">
DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require
          </pre>
        </section>
      ) : null}

      <section className="mt-8">
        <SurveyBuilder action={createSurveyAction} />
      </section>

      <section className="mt-8 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="display-font text-3xl font-semibold tracking-tight">Published surveys</h2>
            <p className="mt-2 text-sm leading-7 text-[color:rgba(18,33,23,0.68)] md:text-base">
              Every survey gets an anonymous share link and a live result view.
            </p>
          </div>
          <Link href="/" className="rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm font-medium">
            View public hub
          </Link>
        </div>

        {surveys.length === 0 ? (
          <div className="glass-panel rounded-[2rem] border border-dashed border-[var(--line)] p-10 text-center">
            <h3 className="display-font text-2xl font-semibold">No surveys yet</h3>
            <p className="mt-3 text-sm leading-7 text-[color:rgba(18,33,23,0.68)] md:text-base">
              Build your first survey above and a shareable public link will appear here.
            </p>
          </div>
        ) : (
          surveys.map((survey) => (
            <article key={survey.id} className="glass-panel rounded-[2rem] p-6 md:p-8">
              <div className="flex flex-col gap-5 border-b border-[var(--line)] pb-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="display-font text-3xl font-semibold tracking-tight">{survey.title}</h3>
                    <span className="pill rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                      {survey.isActive ? "Live" : "Draft"}
                    </span>
                  </div>
                  <p className="max-w-3xl text-sm leading-7 text-[color:rgba(18,33,23,0.7)] md:text-base">
                    {survey.description}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 md:min-w-[330px]">
                  <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/62 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">Questions</p>
                    <p className="mt-2 text-2xl font-semibold">{survey.questionCount}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/62 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-cool)]">Responses</p>
                    <p className="mt-2 text-2xl font-semibold">{survey.responseCount}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-[var(--line)] bg-white/62 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]">Share</p>
                    <Link href={`/s/${survey.slug}`} className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                      <Link2 className="size-4" />
                      /s/{survey.slug}
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {survey.results.map((result) => (
                  <ResultCard key={result.questionId} result={result} />
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}