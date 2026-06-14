import Link from "next/link";
import { ArrowRight, BarChart3, Link2, Sparkles } from "lucide-react";

import { listActiveSurveys } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [surveys, databaseConfigured] = await Promise.all([
    listActiveSurveys(),
    Promise.resolve(hasDatabaseConfig()),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:px-8 md:py-10">
      <section className="hero-grid glass-panel overflow-hidden rounded-[2.5rem] px-6 py-8 md:px-10 md:py-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-5">
            <span className="pill inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">
              <Sparkles className="size-3.5" />
              Survey Studio
            </span>
            <h1 className="display-font max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
              Create anonymous surveys with a sharp admin dashboard and live response graphs.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[color:rgba(18,33,23,0.72)] md:text-lg">
              Launch a survey, share the public link, and review answer patterns from one curated interface backed by Neon.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
              >
                Open admin
                <ArrowRight className="size-4" />
              </Link>
              <span className="rounded-full border border-[var(--line)] bg-white/62 px-5 py-3 text-sm font-medium">
                {databaseConfigured ? "Neon connection ready" : "Add DATABASE_URL to activate Neon"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/72 p-5">
              <BarChart3 className="size-5 text-[var(--accent-cool)]" />
              <p className="mt-4 text-3xl font-semibold">{surveys.length}</p>
              <p className="mt-2 text-sm text-[color:rgba(18,33,23,0.66)]">Active surveys</p>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/72 p-5">
              <Link2 className="size-5 text-[var(--accent)]" />
              <p className="mt-4 text-3xl font-semibold">Public</p>
              <p className="mt-2 text-sm text-[color:rgba(18,33,23,0.66)]">Anonymous share links</p>
            </div>
            <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/72 p-5">
              <Sparkles className="size-5 text-[var(--foreground)]" />
              <p className="mt-4 text-3xl font-semibold">Live</p>
              <p className="mt-2 text-sm text-[color:rgba(18,33,23,0.66)]">Updated result summaries</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
        <div className="glass-panel rounded-[2rem] p-6 md:p-8">
          <h2 className="display-font text-3xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[color:rgba(18,33,23,0.72)] md:text-base">
            <p>Create surveys in the admin area, define question types, and publish the form in one pass.</p>
            <p>Share the generated survey link with anyone. Respondents can submit feedback without logging in.</p>
            <p>Return to the dashboard to view counts, rating distributions, and recent written responses.</p>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="display-font text-3xl font-semibold tracking-tight">Available surveys</h2>
              <p className="mt-2 text-sm leading-7 text-[color:rgba(18,33,23,0.68)] md:text-base">
                Open any live survey below using its anonymous share link.
              </p>
            </div>
            <Link href="/admin" className="rounded-full border border-[var(--line)] bg-white/62 px-4 py-2 text-sm font-medium">
              Manage surveys
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {surveys.length > 0 ? (
              surveys.map((survey) => (
                <article
                  key={survey.id}
                  className="rounded-[1.6rem] border border-[var(--line)] bg-white/70 p-5 shadow-[0_18px_48px_rgba(72,49,21,0.06)]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h3 className="display-font text-2xl font-semibold tracking-tight">{survey.title}</h3>
                      <p className="max-w-2xl text-sm leading-7 text-[color:rgba(18,33,23,0.68)] md:text-base">
                        {survey.description}
                      </p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <span className="pill rounded-full px-3 py-2 font-semibold">{survey.questionCount} questions</span>
                      <span className="pill rounded-full px-3 py-2 font-semibold">{survey.responseCount} responses</span>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/s/${survey.slug}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Start survey
                      <ArrowRight className="size-4" />
                    </Link>
                    <span className="rounded-full border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[color:rgba(18,33,23,0.72)]">
                      /s/{survey.slug}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] bg-white/48 p-8 text-center">
                <h3 className="display-font text-2xl font-semibold">No live surveys yet</h3>
                <p className="mt-3 text-sm leading-7 text-[color:rgba(18,33,23,0.68)] md:text-base">
                  Head to the admin area to create your first survey and publish an anonymous response link.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
