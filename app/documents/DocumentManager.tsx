"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type DocumentFile = {
  name: string;
  id: string | null;
  created_at?: string | null;
  metadata?: {
    size?: number;
    mimetype?: string;
  } | null;
};

type DocumentManagerProps = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
};

const BUCKET = "documents";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatSize(bytes?: number) {
  if (bytes == null) return "—";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

export default function DocumentManager({
  userId,
  workspaceId,
  workspaceName,
}: DocumentManagerProps) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(
    null,
  );
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = useMemo(() => createClient(), []);

  // All operations are scoped to this user's selected workspace.
  const workspacePath = `${userId}/${workspaceId}`;

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: listError } = await supabase.storage
        .from(BUCKET)
        .list(workspacePath, {
          limit: 100,
          sortBy: {
            column: "created_at",
            order: "desc",
          },
        });

      if (listError) {
        setError(listError.message);
        setFiles([]);
        return;
      }

      setFiles(
        (data ?? []).filter(
          (file) => file.name && !file.name.startsWith("."),
        ),
      );
    } catch {
      setError("An unexpected error occurred while loading documents.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, workspacePath]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFiles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFiles]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    setMessage("");
    setError("");

    if (file.type !== "application/pdf") {
      setError("Please select a PDF file.");
      input.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("The file exceeds the 50 MB upload limit.");
      input.value = "";
      return;
    }

    setUploading(true);

    try {
      const safeName = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "_");

      const fileName = `${crypto.randomUUID()}-${safeName}`;
      const filePath = `${workspacePath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      setMessage("PDF uploaded successfully.");
      await loadFiles();
    } catch {
      setError("An unexpected error occurred while uploading.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function handleDownload(fileName: string) {
    setError("");
    setMessage("");
    setDownloadingFile(fileName);

    try {
      const filePath = `${workspacePath}/${fileName}`;

      const { data, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(filePath);

      if (downloadError) {
        setError(downloadError.message);
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      setMessage("Document download started.");
    } catch {
      setError("An unexpected error occurred while downloading.");
    } finally {
      setDownloadingFile(null);
    }
  }

  async function handleDelete(fileName: string) {
    const confirmed = window.confirm(
      `Delete "${fileName}" from "${workspaceName}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingFile(fileName);

    try {
      const filePath = `${workspacePath}/${fileName}`;

      const { error: deleteError } = await supabase.storage
        .from(BUCKET)
        .remove([filePath]);

      if (deleteError) {
        setError(deleteError.message);
        return;
      }

      setMessage("Document deleted.");
      await loadFiles();
    } catch {
      setError("An unexpected error occurred while deleting.");
    } finally {
      setDeletingFile(null);
    }
  }

  const busy = uploading || downloadingFile !== null || deletingFile !== null;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-blue-400 hover:underline"
          >
            ← Back to dashboard
          </Link>

          <p className="mt-5 text-sm text-blue-400">Current workspace</p>

          <h1 className="mt-1 break-words text-3xl font-bold">
            {workspaceName}
          </h1>

          <p className="mt-2 text-slate-400">
            Upload and manage PDFs in this workspace.
          </p>
        </div>

        <label
          className={`inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 ${
            uploading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {uploading ? "Uploading..." : "Upload PDF"}

          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={busy}
            onChange={handleUpload}
          />
        </label>
      </header>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-green-800 bg-green-950 p-3 text-green-300"
        >
          {message}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-red-300"
        >
          {error}
        </p>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Uploaded documents</h2>
            <p className="mt-1 text-sm text-slate-400">
              Files in {workspaceName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading || busy}
            className="text-sm text-blue-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-slate-400">Loading documents...</p>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 px-4 py-12 text-center">
            <p className="font-medium">No documents in this workspace yet</p>
            <p className="mt-2 text-sm text-slate-400">
              Upload a PDF to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {files.map((file) => (
              <li
                key={file.id ?? file.name}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="break-all font-medium">{file.name}</p>

                  <p className="mt-1 text-sm text-slate-400">
                    {formatSize(file.metadata?.size)}
                    {file.created_at
                      ? ` · ${formatDate(file.created_at)}`
                      : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownload(file.name)}
                    disabled={busy}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-blue-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingFile === file.name
                      ? "Downloading..."
                      : "Download"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(file.name)}
                    disabled={busy}
                    className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingFile === file.name ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}