import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
) {
  try {
    const supabase =
      await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { searchParams } =
      new URL(request.url);

    const workspaceId =
      searchParams.get("workspace")?.trim() ||
      "";

    const documentId =
      searchParams.get("document")?.trim() ||
      null;

    const conversationId =
      searchParams
        .get("conversation")
        ?.trim() || null;

    if (!workspaceId) {
      return NextResponse.json(
        {
          error:
            "Workspace is required.",
        },
        { status: 400 },
      );
    }

    /*
     * Workspace isolation
     */
    const { data: workspace } =
      await supabase
        .from("workspaces")
        .select("id")
        .eq("id", workspaceId)
        .eq("owner_id", user.id)
        .maybeSingle();

    if (!workspace) {
      return NextResponse.json(
        {
          error:
            "Workspace not found.",
        },
        { status: 404 },
      );
    }

    /*
     * Document isolation
     */
    if (documentId) {
      const { data: document } =
        await supabase
          .from("documents")
          .select("id")
          .eq("id", documentId)
          .eq(
            "workspace_id",
            workspaceId,
          )
          .maybeSingle();

      if (!document) {
        return NextResponse.json(
          {
            error:
              "Document not found in this workspace.",
          },
          { status: 404 },
        );
      }
    }

    /*
     * Conversation list
     */
    let conversationsQuery =
      supabase
        .from("chat_conversations")
        .select(
          "id, title, created_at, updated_at",
        )
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "workspace_id",
          workspaceId,
        );

    conversationsQuery =
      documentId
        ? conversationsQuery.eq(
            "document_id",
            documentId,
          )
        : conversationsQuery.is(
            "document_id",
            null,
          );

    const {
      data: conversations,
      error:
        conversationsError,
    } =
      await conversationsQuery.order(
        "updated_at",
        {
          ascending: false,
        },
      );

    if (conversationsError) {
      return NextResponse.json(
        {
          error:
            conversationsError.message,
        },
        { status: 500 },
      );
    }

    /*
     * Selected conversation messages
     */
    let messages: unknown[] = [];

    if (conversationId) {
      let conversationQuery =
        supabase
          .from("chat_conversations")
          .select("id")
          .eq(
            "id",
            conversationId,
          )
          .eq(
            "user_id",
            user.id,
          )
          .eq(
            "workspace_id",
            workspaceId,
          );

      conversationQuery =
        documentId
          ? conversationQuery.eq(
              "document_id",
              documentId,
            )
          : conversationQuery.is(
              "document_id",
              null,
            );

      const {
        data: conversation,
        error:
          conversationError,
      } =
        await conversationQuery.maybeSingle();

      if (conversationError) {
        return NextResponse.json(
          {
            error:
              conversationError.message,
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
        error:
          messagesError,
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
        return NextResponse.json(
          {
            error:
              messagesError.message,
          },
          { status: 500 },
        );
      }

      messages =
        conversationMessages ?? [];
    }

    return NextResponse.json({
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
            : "Something went wrong.",
      },
      { status: 500 },
    );
  }
}