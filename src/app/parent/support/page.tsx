import Link from "next/link";
import { CircleHelp, Mail } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ParentSupportPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Support" status={context.status}/>;
  return <DashboardShell audience="parent" title="Support"><div className="support-grid"><Link className="parent-record-card" href="/help"><span className="record-icon"><CircleHelp size={19}/></span><div className="record-card-copy"><h2>Help center</h2><p>Read answers about SchoolPay and your parent account.</p></div></Link><Link className="parent-record-card" href="/contact"><span className="record-icon"><Mail size={19}/></span><div className="record-card-copy"><h2>Contact SchoolPay</h2><p>Send the team a support question.</p></div></Link></div><p className="parent-form-note">Do not send Social Security numbers, bank details, or private student documents through general support forms.</p></DashboardShell>;
}
