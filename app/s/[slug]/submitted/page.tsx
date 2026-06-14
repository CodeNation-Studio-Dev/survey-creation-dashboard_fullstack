import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { getSurveyBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SurveySubmittedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getSurveyBySlug(slug);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-8 md:px-8 md:py-12">
      <section className="glass-panel w-full rounded-[2.4rem] px-6 py-10 text-center md:px-10 md:py-14">
        <CheckCircle2 className="mx-auto size-16 text-[var(--accent-cool)]" />
        <h1 className="display-font mt-6 text-4xl font-semibold tracking-tight md:text-5xl">
          Gracias por compartir tu opinion.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-[color:rgba(18,33,23,0.7)] md:text-lg">
          {survey
            ? `Tu respuesta para ${survey.title} fue registrada de forma anonima.`
            : "Tu respuesta fue registrada de forma anonima."}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white">
            Volver al inicio
          </Link>
          <Link href="/admin" className="rounded-full border border-[var(--line)] bg-white/62 px-5 py-3 text-sm font-semibold">
            Abrir panel de administracion
          </Link>
        </div>
      </section>
    </main>
  );
}