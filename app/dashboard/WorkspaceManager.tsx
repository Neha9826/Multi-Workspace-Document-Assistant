"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Workspace = {
  id: string;
  name: string;
  created_at: string;
};

// Use a consistent date format on both server and client.
function formatDate(dateString: string) {
  const date = new Date(dateString);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

export default function WorkspaceManager({
  initialWorkspaces,
  userId,
}: {
  initialWorkspaces: Workspace[];
  userId: string;
}) {
  const [workspaces, setWorkspaces] =
    useState<Workspace[]>(initialWorkspaces);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleCreateWorkspace(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 100) {
      setError("Workspace name must be between 1 and 100 characters.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    const supabase = createClient();

    try {
      const { data, error: createError } = await supabase
        .from("workspaces")
        .insert({
          name: trimmedName,
          owner_id: userId,
        })
        .select("id, name, created_at")
        .single();

      if (createError) {
        setError(createError.message);
        return;
      }

      setWorkspaces((current) => [data, ...current]);
      setName("");
      setMessage("Workspace created successfully.");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Create workspace */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">
          Create a workspace
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Keep documents organized by project, client, or team.
        </p>

        <form
          onSubmit={handleCreateWorkspace}
          className="mt-5 flex flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Personal, Project Alpha"
            maxLength={100}
            required
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create workspace"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            className="mt-4 text-sm text-emerald-400"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-red-400"
          >
            {error}
          </p>
        )}
      </section>

      {/* Workspace list */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">
          Your workspaces
        </h2>

        {workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
            <p className="font-medium">No workspaces yet</p>

            <p className="mt-2 text-sm text-slate-400">
              Create your first workspace above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <article
                key={workspace.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <h3 className="break-words text-lg font-semibold">
                  {workspace.name}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Created {formatDate(workspace.created_at)}
                </p>

                <Link
                  href={`/documents?workspace=${workspace.id}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-blue-300 transition hover:bg-slate-800"
                >
                  Open workspace
                  <span aria-hidden="true">{"→"}</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}