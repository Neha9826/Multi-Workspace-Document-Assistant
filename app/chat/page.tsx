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

  if (!workspaceId || !documentId) {
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

  const { data: document } =
    await supabase
      .from("documents")
      .select(
        "id, file_name, workspace_id",
      )
      .eq("id", documentId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

  if (!document) {
    redirect(
      `/documents?workspace=${workspaceId}`,
    );
  }

  let validConversationId:
    | string
    | null = null;

  if (conversationId) {
    const { data: conversation } =
      await supabase
        .from("chat_conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .eq("document_id", documentId)
        .maybeSingle();

    if (conversation) {
      validConversationId =
        conversation.id;
    }
  }

  return (
    <ChatManager
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      documentId={document.id}
      documentName={document.file_name}
      initialConversationId={
        validConversationId
      }
    />
  );
}