import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentManager from "./DocumentManager";

type DocumentsPageProps = {
  searchParams: Promise<{
    workspace?: string;
  }>;
};

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const { workspace: workspaceId } = await searchParams;

  // A workspace must be selected.
  if (!workspaceId) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // Verify that this workspace belongs to the signed-in user.
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("id", workspaceId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (workspaceError || !workspace) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <DocumentManager
        userId={user.id}
        workspaceId={workspace.id}
        workspaceName={workspace.name}
      />
    </main>
  );
}