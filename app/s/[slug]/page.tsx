import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { getSurveyBySlug } from "@/lib/data";
import { SurveyResponseForm } from "./survey-response-form";

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);

  if (!survey || !survey.isActive) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/62 px-4 py-2 text-sm font-medium">
          <ArrowLeft className="size-4" />
          Volver al portal de encuestas
        </Link>
      </div>

      <section className="glass-panel rounded-[2.3rem] px-6 py-8 md:px-10 md:py-12">
        <div className="max-w-3xl space-y-5">
          <span className="pill inline-flex w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-deep)]">
            Encuesta anonima
          </span>
          <h1 className="display-font text-4xl font-semibold tracking-tight md:text-5xl">{survey.title}</h1>
          <p className="text-base leading-8 text-[color:rgba(18,33,23,0.72)] md:text-lg">{survey.description}</p>
        </div>

        <SurveyResponseForm surveyId={survey.id} questions={survey.questions} />
      </section>
    </main>
  );
}