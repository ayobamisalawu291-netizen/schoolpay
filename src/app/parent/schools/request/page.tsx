import { DashboardShell } from "@/components/dashboard-shell";
import { SchoolRequestForm } from "@/components/parent/parent-forms";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function RequestSchoolPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Request a School" status={context.status}/>;
  return <DashboardShell audience="parent" title="Request a School"><div className="parent-form-panel"><h2>Tell us about the school</h2><p>SchoolPay will review this request. Submitting it does not verify the school or confirm that your child attends it.</p><SchoolRequestForm/></div></DashboardShell>;
}
