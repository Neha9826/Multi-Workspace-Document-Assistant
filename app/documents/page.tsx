import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DocumentManager from "./DocumentManager";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <DocumentManager userId={user.id} />;
}