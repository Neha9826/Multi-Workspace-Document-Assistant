"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const BUCKET = "documents";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function DocumentManager({
  userId,
}: {
  userId: string;
}) {
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

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");

    const { data, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(userId, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (listError) {
      setError(listError.message);
      setFiles([]);
    } else {
      setFiles(
        (data ?? []).filter(
          (file) => file.name && !file.name.startsWith("."),
        ),
      );
    }

    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFiles();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadFiles]);

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
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

      const filePath = `${userId}/${crypto.randomUUID()}-${safeName}`;

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
      const filePath = `${userId}/${fileName}`;

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
      `Delete "${fileName}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingFile(fileName);

    try {
      const { error: deleteError } = await supabase.storage
        .from(BUCKET)
        .remove([`${userId}/${fileName}`]);

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

  function formatSize(bytes?: number) {
    if (bytes == null) return "—";

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <a
            href="/dashboard"
            className="text-sm text-blue-400 hover:underline"
          >
            ← Back to dashboard
          </a>

          <h1 className="mt-3 text-3xl font-bold">
            Your Documents
          </h1>

          <p className="mt-2 text-gray-400">
            Upload and manage your PDF documents securely.
          </p>
        </div>

        <label
          className={`cursor-pointer rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 ${
            uploading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {uploading ? "Uploading..." : "Upload PDF"}

          <input
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      </header>

      {message && (
        <p className="mb-4 rounded-lg border border-green-800 bg-green-950 p-3 text-green-300">
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

      <section className="rounded-xl border border-gray-800 bg-slate-900/60 p-5">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Uploaded files</h2>

          <button
            type="button"
            onClick={() => void loadFiles()}
            disabled={loading}
            className="text-sm text-blue-400 hover:underline disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading documents...</p>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 px-4 py-12 text-center">
            <p className="font-medium">No documents yet</p>
            <p className="mt-2 text-sm text-gray-400">
              Upload a PDF to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {files.map((file) => (
              <li
                key={file.id ?? file.name}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="break-all font-medium">
                    {file.name}
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    {formatSize(file.metadata?.size)}
                    {file.created_at &&
                      ` · ${new Date(file.created_at).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownload(file.name)}
                    disabled={
                      downloadingFile !== null ||
                      deletingFile !== null
                    }
                    className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-blue-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingFile === file.name
                      ? "Downloading..."
                      : "Download"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(file.name)}
                    disabled={
                      deletingFile !== null ||
                      downloadingFile !== null
                    }
                    className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingFile === file.name
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}