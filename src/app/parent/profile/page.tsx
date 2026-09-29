import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentProfileForm } from "@/components/parent/parent-forms";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ParentProfilePage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Profile" status={context.status}/>;
  if (!context.profile) redirect("/parent/onboarding");
  return <DashboardShell audience="parent" title="Profile"><div className="parent-form-panel"><h2>Parent or guardian details</h2><p>Update the information used for your SchoolPay account. Date of birth, identity, credit, and bank details are not collected in this phase.</p><ParentProfileForm profile={context.profile}/></div></DashboardShell>;
}
