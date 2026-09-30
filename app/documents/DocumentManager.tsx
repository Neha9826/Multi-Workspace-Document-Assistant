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

type DocumentRecord = {
  id: string;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

type DocumentManagerProps = {
  userId: string;
  workspaceId: string;
  workspaceName: string;
};

const BUCKET = "documents";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function formatSize(bytes: number) {
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
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(
    null,
  );
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const workspacePath = `${userId}/${workspaceId}`;

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: documentsError } = await supabase
        .from("documents")
        .select(
          "id, file_name, storage_path, mime_type, size_bytes, uploaded_by, created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (documentsError) {
        setError(documentsError.message);
        setDocuments([]);
        return;
      }

      setDocuments(data ?? []);
    } catch {
      setError("An unexpected error occurred while loading documents.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDocuments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDocuments]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

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
      const storagePath = `${workspacePath}/${fileName}`;

      // Step 1: Upload the actual PDF to Supabase Storage.
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      // Step 2: Store document metadata in PostgreSQL.
      const { data: document, error: metadataError } = await supabase
        .from("documents")
        .insert({
          workspace_id: workspaceId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || "application/pdf",
          size_bytes: file.size,
          uploaded_by: userId,
        })
        .select(
          "id, file_name, storage_path, mime_type, size_bytes, uploaded_by, created_at",
        )
        .single();

      // Compensating cleanup:
      // If the database insert fails, remove the Storage object so we
      // don't leave an orphaned PDF behind.
      if (metadataError || !document) {
        await supabase.storage.from(BUCKET).remove([storagePath]);

        setError(
          metadataError?.message ??
            "Document metadata could not be saved.",
        );

        return;
      }

      setDocuments((current) => [document, ...current]);
      setMessage("PDF uploaded successfully.");
    } catch {
      setError("An unexpected error occurred while uploading.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  }

  async function handleDownload(document: DocumentRecord) {
    setError("");
    setMessage("");
    setDownloadingFile(document.id);

    try {
      const { data, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(document.storage_path);

      if (downloadError) {
        setError(downloadError.message);
        return;
      }

      const url = URL.createObjectURL(data);
      const link = window.document.createElement("a");

      link.href = url;
      link.download = document.file_name;

      window.document.body.appendChild(link);
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

  async function handleDelete(document: DocumentRecord) {
    const confirmed = window.confirm(
      `Delete "${document.file_name}" from "${workspaceName}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");
    setDeletingFile(document.id);

    try {
      // Step 1: Remove the actual file from Storage.
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([document.storage_path]);

      if (storageError) {
        setError(storageError.message);
        return;
      }

      // Step 2: Remove its metadata row.
      const { error: metadataError } = await supabase
        .from("documents")
        .delete()
        .eq("id", document.id)
        .eq("workspace_id", workspaceId);

      if (metadataError) {
        setError(
          `The file was removed from storage, but its metadata could not be deleted: ${metadataError.message}`,
        );

        await loadDocuments();
        return;
      }

      setDocuments((current) =>
        current.filter((item) => item.id !== document.id),
      );

      setMessage("Document deleted.");
    } catch {
      setError("An unexpected error occurred while deleting.");
    } finally {
      setDeletingFile(null);
    }
  }

  const busy =
    uploading ||
    downloadingFile !== null ||
    deletingFile !== null;

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

          <p className="mt-5 text-sm text-blue-400">
            Current workspace
          </p>

          <h1 className="mt-1 break-words text-3xl font-bold">
            {workspaceName}
          </h1>

          <p className="mt-2 text-slate-400">
            Upload and manage PDFs in this workspace.
          </p>
        </div>

        <label
          className={`inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 ${
            busy
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer"
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
            <h2 className="text-lg font-semibold">
              Uploaded documents
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Files in {workspaceName}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDocuments()}
            disabled={loading || busy}
            className="text-sm text-blue-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-slate-400">
            Loading documents...
          </p>
        ) : documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 px-4 py-12 text-center">
            <p className="font-medium">
              No documents in this workspace yet
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Upload a PDF to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-800">
            {documents.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="break-all font-medium">
                    {document.file_name}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {formatSize(document.size_bytes)}
                    {" · "}
                    {formatDate(document.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDownload(document)}
                    disabled={busy}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-blue-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingFile === document.id
                      ? "Downloading..."
                      : "Download"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(document)}
                    disabled={busy}
                    className="rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingFile === document.id
                      ? "Deleting..."
                      : "Delete"}
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