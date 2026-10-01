import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatManager from "./ChatManager";

type ChatPageProps = {
  searchParams: Promise<{
    workspace?: string;
    document?: string;
    conversation?: string;
  }>;
};

export default async function ChatPage({
  searchParams,
}: ChatPageProps) {
  const {
    workspace: workspaceId,
    document: documentId,
    conversation: conversationId,
  } = await searchParams;

  if (!workspaceId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: workspace } =
    await supabase
      .from("workspaces")
      .select("id, name")
      .eq("id", workspaceId)
      .eq("owner_id", user.id)
      .maybeSingle();

  if (!workspace) {
    redirect("/dashboard");
  }

  let document: {
    id: string;
    file_name: string;
    workspace_id: string;
  } | null = null;

  if (documentId) {
    const { data } =
      await supabase
        .from("documents")
        .select(
          "id, file_name, workspace_id",
        )
        .eq("id", documentId)
        .eq(
          "workspace_id",
          workspaceId,
        )
        .maybeSingle();

    if (!data) {
      redirect(
        `/documents?workspace=${workspaceId}`,
      );
    }

    document = data;
  }

  let validConversationId:
    | string
    | null = null;

  if (conversationId) {
    let query =
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

    query = documentId
      ? query.eq(
          "document_id",
          documentId,
        )
      : query.is(
          "document_id",
          null,
        );

    const { data: conversation } =
      await query.maybeSingle();

    if (conversation) {
      validConversationId =
        conversation.id;
    }
  }

  return (
    <ChatManager
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      documentId={
        document?.id ?? null
      }
      documentName={
        document?.file_name ?? null
      }
      initialConversationId={
        validConversationId
      }
    />
  );
}