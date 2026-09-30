import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractText } from "unpdf";
import { generateEmbeddings } from "@/lib/embeddings";

export const runtime = "nodejs";

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 200;

function createChunks(text: string) {
  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalizedText) {
    return [];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    let end = Math.min(start + CHUNK_SIZE, normalizedText.length);

    if (end < normalizedText.length) {
      const paragraphBreak = normalizedText.lastIndexOf("\n\n", end);
      const sentenceBreak = normalizedText.lastIndexOf(". ", end);
      const wordBreak = normalizedText.lastIndexOf(" ", end);

      if (paragraphBreak > start + CHUNK_SIZE / 2) {
        end = paragraphBreak;
      } else if (sentenceBreak > start + CHUNK_SIZE / 2) {
        end = sentenceBreak + 1;
      } else if (wordBreak > start + CHUNK_SIZE / 2) {
        end = wordBreak;
      }
    }

    const chunk = normalizedText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalizedText.length) {
      break;
    }

    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();

    const documentId =
      typeof body.documentId === "string" ? body.documentId : "";

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required." },
        { status: 400 },
      );
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select(
        "id, workspace_id, file_name, storage_path, mime_type, uploaded_by",
      )
      .eq("id", documentId)
      .eq("uploaded_by", user.id)
      .maybeSingle();

    if (documentError) {
      return NextResponse.json(
        { error: documentError.message },
        { status: 500 },
      );
    }

    if (!document) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 },
      );
    }

    if (document.mime_type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF documents can be ingested." },
        { status: 400 },
      );
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.storage_path);

    if (downloadError) {
      return NextResponse.json(
        { error: downloadError.message },
        { status: 500 },
      );
    }

    const buffer = await file.arrayBuffer();

    console.log("Starting PDF extraction:", {
      fileName: document.file_name,
      bytes: buffer.byteLength,
    });

    const { text, totalPages } = await extractText(
      new Uint8Array(buffer),
      {
        mergePages: true,
      },
    );

    console.log("PDF extraction completed:", {
      fileName: document.file_name,
      pages: totalPages,
      characters: text.length,
    });

    const chunks = createChunks(text);

    if (chunks.length === 0) {
      return NextResponse.json(
        {
          error: "No extractable text was found in this PDF.",
        },
        { status: 422 },
      );
    }

    console.log("Generating embeddings:", {
      fileName: document.file_name,
      chunks: chunks.length,
    });

    const embeddings = await generateEmbeddings(chunks);

    console.log("Embeddings generated:", {
      chunks: chunks.length,
      dimensions: embeddings[0]?.length ?? 0,
    });

    const { error: deleteExistingError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", document.id);

    if (deleteExistingError) {
      return NextResponse.json(
        { error: deleteExistingError.message },
        { status: 500 },
      );
    }

    const rows = chunks.map((content, index) => ({
      document_id: document.id,
      chunk_index: index,
      content,
      embedding: embeddings[index],
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(rows);

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      fileName: document.file_name,
      pages: totalPages,
      characters: text.length,
      chunks: chunks.length,
      embeddings: embeddings.length,
      embeddingDimensions: embeddings[0]?.length ?? 0,
    });
  } catch (error) {
    console.error("Document ingestion failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: `Failed to process the PDF: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}