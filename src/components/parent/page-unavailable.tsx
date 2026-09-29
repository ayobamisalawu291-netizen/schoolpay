import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";

export function ParentPageUnavailable({ title, status }: { title: string; status: "unconfigured" | "unavailable" }) {
  const detail = status === "unconfigured"
    ? "Parent accounts need a dedicated Supabase project. Add its URL and publishable key after applying the reviewed migrations."
    : "Parent data could not be loaded. Check that the SchoolPay database migrations are applied, then try again.";
  return <DashboardShell audience="parent" title={title}><AccessNotice title={status === "unconfigured" ? "Account services not configured" : "Parent workspace unavailable"} detail={detail}/></DashboardShell>;
}
