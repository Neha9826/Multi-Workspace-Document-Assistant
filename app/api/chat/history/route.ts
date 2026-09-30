import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);

    const workspaceId =
      url.searchParams.get("workspace");

    const documentId =
      url.searchParams.get("document");

    const conversationId =
      url.searchParams.get("conversation");

    if (!workspaceId || !documentId) {
      return NextResponse.json(
        {
          error:
            "Workspace and document are required.",
        },
        { status: 400 },
      );
    }

    /*
     * Verify workspace ownership.
     */
    const {
      data: workspace,
      error: workspaceError,
    } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (workspaceError) {
      console.error(
        "History workspace verification failed:",
        workspaceError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to verify workspace.",
        },
        { status: 500 },
      );
    }

    if (!workspace) {
      return NextResponse.json(
        {
          error: "Workspace not found.",
        },
        { status: 404 },
      );
    }

    /*
     * Verify document belongs to workspace.
     */
    const {
      data: document,
      error: documentError,
    } = await supabase
      .from("documents")
      .select("id, file_name")
      .eq("id", documentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (documentError) {
      console.error(
        "History document verification failed:",
        documentError,
      );

      return NextResponse.json(
        {
          error:
            "Failed to verify document.",
        },
        { status: 500 },
      );
    }

    if (!document) {
      return NextResponse.json(
        {
          error: "Document not found.",
        },
        { status: 404 },
      );
    }

    /*
     * Load conversations for this exact:
     *
     * user + workspace + document
     */
    const {
      data: conversations,
      error: conversationsError,
    } = await supabase
      .from("chat_conversations")
      .select(
        "id, title, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .eq("workspace_id", workspaceId)
      .eq("document_id", documentId)
      .order("updated_at", {
        ascending: false,
      });

    if (conversationsError) {
      console.error(
        "Conversation history query failed:",
        conversationsError,
      );

      return NextResponse.json(
        {
          error:
            conversationsError.message ||
            "Failed to load chat history.",
        },
        { status: 500 },
      );
    }

    let messages: unknown[] = [];

    /*
     * If a conversation was requested,
     * load its messages as well.
     */
    if (conversationId) {
      const {
        data: conversation,
        error: conversationError,
      } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .eq("document_id", documentId)
        .maybeSingle();

      if (conversationError) {
        console.error(
          "Conversation verification failed:",
          conversationError,
        );

        return NextResponse.json(
          {
            error:
              "Failed to verify conversation.",
          },
          { status: 500 },
        );
      }

      if (!conversation) {
        return NextResponse.json(
          {
            error:
              "Conversation not found.",
          },
          { status: 404 },
        );
      }

      const {
        data: conversationMessages,
        error: messagesError,
      } = await supabase
        .from("chat_messages")
        .select(
          "id, role, content, sources, created_at",
        )
        .eq(
          "conversation_id",
          conversationId,
        )
        .order("created_at", {
          ascending: true,
        });

      if (messagesError) {
        console.error(
          "Conversation messages query failed:",
          messagesError,
        );

        return NextResponse.json(
          {
            error:
              messagesError.message ||
              "Failed to load conversation messages.",
          },
          { status: 500 },
        );
      }

      messages = conversationMessages ?? [];
    }

    return NextResponse.json({
      success: true,
      conversations:
        conversations ?? [],
      messages,
    });
  } catch (error) {
    console.error(
      "Chat history error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}