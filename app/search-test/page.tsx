"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

type Source = {
  documentId: string;
  chunkIndex: number;
  similarity: number;
  content: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

function SearchTestContent() {
  const searchParams = useSearchParams();

  const workspaceId = searchParams.get("workspace") ?? "";

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const question = query.trim();

    if (!question || loading) {
      return;
    }

    if (!workspaceId) {
      setError("No workspace selected.");
      return;
    }

    setError("");
    setQuery("");

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: question,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: question,
          workspaceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get answer.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources ?? [],
        },
      ]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-6 py-8">
        <div className="border-b border-slate-800 pb-5">
          <h1 className="text-2xl font-semibold">
            Document Assistant
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Ask questions about your uploaded documents.
          </p>
        </div>

        <div className="flex-1 space-y-6 py-8">
          {messages.length === 0 && (
            <div className="flex min-h-[50vh] items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-medium">
                  Ask your documents
                </h2>

                <p className="mt-2 max-w-md text-sm text-slate-500">
                  Ask a question and the assistant will
                  retrieve relevant document sections before
                  generating an answer.
                </p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-2xl rounded-2xl bg-white px-5 py-4 text-sm text-slate-950"
                    : "max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4"
                }
              >
                <p className="whitespace-pre-wrap leading-7">
                  {message.content}
                </p>

                {message.sources &&
                  message.sources.length > 0 && (
                    <details className="mt-5 border-t border-slate-800 pt-4">
                      <summary className="cursor-pointer text-xs font-medium text-slate-400">
                        View retrieved sources (
                        {message.sources.length})
                      </summary>

                      <div className="mt-3 space-y-3">
                        {message.sources.map(
                          (source, sourceIndex) => (
                            <div
                              key={`${source.documentId}-${source.chunkIndex}`}
                              className="rounded-lg bg-slate-950 p-3"
                            >
                              <div className="mb-2 text-xs text-slate-500">
                                Source{" "}
                                {sourceIndex + 1} · Chunk{" "}
                                {source.chunkIndex} · Similarity{" "}
                                {source.similarity.toFixed(3)}
                              </div>

                              <p className="text-xs leading-6 text-slate-400">
                                {source.content}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </details>
                  )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-sm text-slate-400">
                Searching your documents and generating an
                answer...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 border-t border-slate-800 bg-slate-950 pt-4">
          <div className="flex gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Ask something about your documents..."
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-slate-500 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || !query.trim()}
              className="rounded-xl bg-white px-6 py-3 text-sm font-medium text-slate-950 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Thinking..." : "Ask"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SearchTestPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 text-white">
          <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
            <p className="text-sm text-slate-400">
              Loading document assistant...
            </p>
          </div>
        </main>
      }
    >
      <SearchTestContent />
    </Suspense>
  );
}