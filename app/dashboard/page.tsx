import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
        <div>
          <h1 className="text-xl font-bold">
            Abstrabit Doc Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Your workspace dashboard
          </p>
        </div>

        <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
            >
            Manage Documents
            <span aria-hidden="true">→</span>
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm text-emerald-400">
            Authentication successful
          </p>

          <h2 className="mt-3 text-2xl font-semibold">
            Welcome to your dashboard
          </h2>

          <p className="mt-3 text-slate-400">
            Signed in as {user.email}
          </p>

          <p className="mt-6 text-sm text-slate-500">
            Your workspaces, documents, and AI conversations
            will appear here.
          </p>
        </div>
      </section>
    </main>
  );
}