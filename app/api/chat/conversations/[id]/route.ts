import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const title =
      typeof body.title === "string"
        ? body.title.trim()
        : "";

    const workspaceId =
      typeof body.workspaceId === "string"
        ? body.workspaceId
        : "";

    if (!id || !workspaceId) {
      return NextResponse.json(
        {
          error:
            "Conversation and workspace are required.",
        },
        { status: 400 },
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          error:
            "Chat title cannot be empty.",
        },
        { status: 400 },
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        {
          error:
            "Chat title cannot exceed 100 characters.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const { data: conversation } =
      await supabase
        .from("chat_conversations")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (!conversation) {
      return NextResponse.json(
        {
          error:
            "Conversation not found.",
        },
        { status: 404 },
      );
    }

    const { data, error } =
      await supabase
        .from("chat_conversations")
        .update({
          title,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .select(
          "id, title, created_at, updated_at",
        )
        .single();

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      conversation: data,
    });
  } catch (error) {
    console.error(
      "Rename conversation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to rename conversation.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    const body = await request.json().catch(
      () => ({}),
    );

    const workspaceId =
      typeof body.workspaceId === "string"
        ? body.workspaceId
        : "";

    if (!id || !workspaceId) {
      return NextResponse.json(
        {
          error:
            "Conversation and workspace are required.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 },
      );
    }

    const { data: conversation } =
      await supabase
        .from("chat_conversations")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    if (!conversation) {
      return NextResponse.json(
        {
          error:
            "Conversation not found.",
        },
        { status: 404 },
      );
    }

    const { error } =
      await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId);

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Delete conversation error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete conversation.",
      },
      { status: 500 },
    );
  }
}