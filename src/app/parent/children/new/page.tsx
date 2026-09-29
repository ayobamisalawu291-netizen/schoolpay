import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { ChildForm } from "@/components/parent/parent-forms";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function NewChildPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Add a child" status={context.status}/>;
  return <DashboardShell audience="parent" title="Add a child">
    <div className="parent-form-panel"><Link className="back-link" href="/parent/children"><ArrowLeft size={15}/>My Children</Link><h2>Who are you adding?</h2><p>Child records are private to your account. You can add more than one child.</p><ChildForm/></div>
  </DashboardShell>;
}
