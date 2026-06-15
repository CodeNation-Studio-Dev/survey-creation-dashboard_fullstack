import Link from "next/link";

import { getCurrentUser } from "@/lib/auth";
import { loginAction, registerAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, user] = await Promise.all([searchParams, getCurrentUser()]);

  if (user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 md:px-8 md:py-12">
        <section className="glass-panel w-full rounded-[2.2rem] p-8 text-center md:p-10">
          <h1 className="display-font text-4xl font-semibold tracking-tight">Sesion activa</h1>
          <p className="mt-3 text-sm leading-7 text-[color:rgba(18,33,23,0.68)] md:text-base">
            Ya iniciaste sesion como {user.email}.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
            >
              Ir al panel
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 md:px-8 md:py-12">
      <section className="hero-grid glass-panel rounded-[2.4rem] border border-[var(--line)] px-6 py-8 md:px-10 md:py-12">
        <h1 className="display-font text-4xl font-semibold tracking-tight md:text-5xl">
          Crea tu cuenta y administra tus encuestas
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:rgba(18,33,23,0.7)] md:text-base">
          Inicia sesion con correo y contrasena para ver y editar solo tus propias encuestas.
        </p>
      </section>

      {params.error ? (
        <section className="mt-6 rounded-[1.5rem] border border-[var(--line)] bg-[rgba(201,72,22,0.08)] px-5 py-4 text-sm font-medium text-[var(--accent-deep)]">
          {params.error}
        </section>
      ) : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <form action={registerAction} className="glass-panel rounded-[2rem] p-6 md:p-8">
          <h2 className="display-font text-3xl font-semibold tracking-tight">Crear cuenta</h2>
          <p className="mt-2 text-sm leading-7 text-[color:rgba(18,33,23,0.68)]">
            Registra un correo y contrasena para guardar tus encuestas en tu propio espacio.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Correo</span>
              <input
                name="email"
                type="email"
                className="field"
                placeholder="tu-correo@ejemplo.com"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Contrasena</span>
              <input
                name="password"
                type="password"
                className="field"
                placeholder="Minimo 8 caracteres"
                required
                minLength={8}
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex items-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
          >
            Crear cuenta
          </button>
        </form>

        <form action={loginAction} className="glass-panel rounded-[2rem] p-6 md:p-8">
          <h2 className="display-font text-3xl font-semibold tracking-tight">Iniciar sesion</h2>
          <p className="mt-2 text-sm leading-7 text-[color:rgba(18,33,23,0.68)]">
            Accede con tu correo y contrasena para administrar tus encuestas publicadas.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Correo</span>
              <input
                name="email"
                type="email"
                className="field"
                placeholder="tu-correo@ejemplo.com"
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Contrasena</span>
              <input
                name="password"
                type="password"
                className="field"
                placeholder="Tu contrasena"
                required
                minLength={8}
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex items-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white"
          >
            Entrar
          </button>
        </form>
      </section>
    </main>
  );
}
