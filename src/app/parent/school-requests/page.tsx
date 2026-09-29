import Link from "next/link";
import { ArrowRight, School } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { CancelSchoolRequestForm } from "@/components/parent/parent-forms";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function SchoolRequestsPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="School Requests" status={context.status}/>;
  const { data, error } = await context.supabase.from("school_requests").select("id,school_name,city,state,zip_code,status,created_at").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100);
  return <DashboardShell audience="parent" title="School Requests">
    {error ? <div className="form-message error" role="alert">We couldn't load your school requests. Please try again.</div> : data?.length ? <div className="record-list record-list-panel">{data.map((item) => <article className="school-request-row" key={item.id}><span className="record-icon small-record-icon"><School size={17}/></span><div><strong>{item.school_name}</strong><small>{[item.city, item.state, item.zip_code].filter(Boolean).join(", ")} · Requested {new Date(item.created_at).toLocaleDateString("en-US")}</small></div><span className={`status-tag ${item.status === "available" ? "status-success" : ""}`}>{item.status.replaceAll("_", " ")}</span>{item.status === "submitted" && <CancelSchoolRequestForm requestId={item.id}/>}</article>)}</div> : <div className="empty-state"><span className="empty-icon"><School size={21}/></span><h2>No school requests yet.</h2><p>Request a school if it isn't in the participating directory.</p><Link className="button button-primary" href="/parent/schools/request">Request a School <ArrowRight size={15}/></Link></div>}
  </DashboardShell>;
}
