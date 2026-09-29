import { notFound } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { ChildForm } from "@/components/parent/parent-forms";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Edit child" status={context.status}/>;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data, error } = await context.supabase.from("children").select("id,first_name,middle_name,last_name,grade").eq("id", id).eq("parent_id", context.userId).is("archived_at", null).maybeSingle();
  if (error || !data) notFound();
  return <DashboardShell audience="parent" title="Edit child"><div className="parent-form-panel"><h2>Update child details</h2><p>Changes are saved to the child record connected to your account.</p><ChildForm child={data}/><Link className="subtle-link" href={`/parent/children/${id}`}>Back to child</Link></div></DashboardShell>;
}
