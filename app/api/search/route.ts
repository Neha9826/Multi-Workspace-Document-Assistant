import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // ----------------------------------------
    // 1. Authenticate user
    // ----------------------------------------

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // ----------------------------------------
    // 2. Parse request
    // ----------------------------------------

    const body = await request.json();

    const query =
      typeof body.query === "string"
        ? body.query.trim()
        : "";

    const workspaceId =
      typeof body.workspaceId === "string"
        ? body.workspaceId
        : "";

    if (!query) {
      return NextResponse.json(
        {
          error: "Query is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        {
          error: "Workspace ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    // ----------------------------------------
    // 3. Verify workspace ownership
    // ----------------------------------------

    const { data: workspace, error: workspaceError } =
      await supabase
        .from("workspaces")
        .select("id, name")
        .eq("id", workspaceId)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (workspaceError) {
      console.error(
        "Workspace lookup failed:",
        workspaceError,
      );

      return NextResponse.json(
        {
          error: "Failed to verify workspace.",
        },
        {
          status: 500,
        },
      );
    }

    if (!workspace) {
      return NextResponse.json(
        {
          error: "Workspace not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ----------------------------------------
    // 4. Generate query embedding
    // ----------------------------------------

    console.log(
      `[Search] Generating embedding for: "${query}"`,
    );

    const queryEmbedding =
      await generateEmbedding(query);

    console.log(
      `[Search] Query embedding dimensions: ${queryEmbedding.length}`,
    );

    // ----------------------------------------
    // 5. Semantic vector search
    // ----------------------------------------

    const { data: matches, error: searchError } =
      await supabase.rpc(
        "match_document_chunks",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.0,
          match_count: 5,
          filter_workspace_id: workspaceId,
        },
      );

    if (searchError) {
      console.error(
        "Semantic search failed:",
        searchError,
      );

      return NextResponse.json(
        {
          error:
            searchError.message ||
            "Semantic search failed.",
        },
        {
          status: 500,
        },
      );
    }

    // ----------------------------------------
    // 6. Return matching chunks
    // ----------------------------------------

    return NextResponse.json({
      success: true,
      query,
      workspaceId,
      results: matches ?? [],
    });
  } catch (error) {
    console.error(
      "Search API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected search error.",
      },
      {
        status: 500,
      },
    );
  }
}