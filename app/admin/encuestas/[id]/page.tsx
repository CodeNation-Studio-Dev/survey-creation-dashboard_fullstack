import Link from "next/link";
import { notFound } from "next/navigation";

import { SurveyBuilder } from "@/app/admin/survey-builder";
import { updateSurveyAction } from "@/lib/actions";
import { requireUser } from "@/lib/auth";
import { getSurveyByIdForOwner } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const survey = await getSurveyByIdForOwner(id, user.id);

  if (!survey) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="rounded-full border border-[var(--line)] bg-white/62 px-4 py-2 text-sm font-medium">
          Volver a administracion
        </Link>
        <Link href={`/s/${survey.slug}`} className="rounded-full border border-[var(--line)] bg-white/62 px-4 py-2 text-sm font-medium">
          Ver encuesta publica
        </Link>
      </div>

      <SurveyBuilder
        action={updateSurveyAction}
        surveyId={survey.id}
        submitLabel="Guardar cambios"
        initial={{
          title: survey.title,
          description: survey.description,
          isActive: survey.isActive,
          questions: survey.questions,
        }}
      />

      {survey.responseCount > 0 ? (
        <section className="glass-panel mt-6 rounded-[1.6rem] border border-[var(--line)] p-5 text-sm leading-7 text-[color:rgba(18,33,23,0.72)]">
          Esta encuesta ya tiene respuestas. Puedes editar titulo, descripcion y estado de publicacion. Para proteger los datos, no se permiten cambios de preguntas cuando ya existen respuestas.
        </section>
      ) : null}
    </main>
  );
}
