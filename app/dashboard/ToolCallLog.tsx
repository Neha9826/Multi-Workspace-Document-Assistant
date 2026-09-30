"use client";

import { useMemo, useState } from "react";

type ToolCallLogRecord = {
  id: string;
  workspace_id: string;
  workspace_name: string;
  conversation_id: string | null;
  tool_name: string;
  arguments: unknown;
  result: unknown;
  success: boolean;
  error: string | null;
  created_at: string;
};

type ToolCallLogProps = {
  logs: ToolCallLogRecord[];
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ToolCallLog({ logs }: ToolCallLogProps) {
  const [workspaceId, setWorkspaceId] = useState("all");

  const workspaceOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const log of logs) {
      map.set(log.workspace_id, log.workspace_name);
    }

    return Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [logs]);

  const filteredLogs =
    workspaceId === "all"
      ? logs
      : logs.filter((log) => log.workspace_id === workspaceId);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">
            Tool-call log
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Read-only audit history for workspace-scoped tool executions.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-400">
          <span>Workspace</span>

          <select
            value={workspaceId}
            onChange={(event) => setWorkspaceId(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
          >
            <option value="all">All workspaces</option>

            {workspaceOptions.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-700 p-8 text-center">
          <p className="font-medium">No tool calls recorded yet.</p>

          <p className="mt-2 text-sm text-slate-400">
            Tool executions will appear here after a chat tool call.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {filteredLogs.map((log) => (
            <article
              key={log.id}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">
                    {log.tool_name}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      log.success
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-red-950 text-red-300"
                    }`}
                  >
                    {log.success ? "Success" : "Failed"}
                  </span>

                  <span className="text-sm text-slate-500">
                    {log.workspace_name}
                  </span>
                </div>

                <time
                  dateTime={log.created_at}
                  className="text-xs text-slate-500"
                >
                  {formatDate(log.created_at)}
                </time>
              </div>

              {log.error && (
                <p className="mt-3 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-300">
                  {log.error}
                </p>
              )}

              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-blue-300 hover:text-blue-200">
                  View arguments and result
                </summary>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Arguments
                    </p>

                    <pre className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                      {formatJson(log.arguments)}
                    </pre>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Result
                    </p>

                    <pre className="max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                      {formatJson(log.result)}
                    </pre>
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
