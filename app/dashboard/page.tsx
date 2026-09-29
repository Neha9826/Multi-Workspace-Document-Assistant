import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";
import WorkspaceManager from "./WorkspaceManager";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: workspaces, error: workspaceError } =
    await supabase
      .from("workspaces")
      .select("id, name, created_at")
      .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <div>
          <h1 className="text-xl font-bold">
            Abstrabit Doc Assistant
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Your workspace dashboard
          </p>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </form>
      </header>

      <section className="mx-auto max-w-5xl space-y-8 px-6 py-12">
        <div>
          <p className="text-sm text-emerald-400">
            Authentication successful
          </p>

          <h2 className="mt-3 text-3xl font-semibold">
            Welcome to your dashboard
          </h2>

          <p className="mt-3 text-slate-400">
            Signed in as {user.email}
          </p>
        </div>

        {workspaceError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300"
          >
            Could not load workspaces: {workspaceError.message}
          </div>
        ) : (
          <WorkspaceManager
            initialWorkspaces={workspaces ?? []}
            userId={user.id}
          />
        )}
      </section>
    </main>
  );
}