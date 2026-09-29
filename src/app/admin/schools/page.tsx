import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { SchoolRequestReviewForm } from "@/components/school/school-request-review-form";
import { requireRole, redirectForAccess } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string, string> = {
  submitted: "Submitted", reviewing: "Under review", information_required: "Information required"
};

export default async function AdminSchoolOnboardingPage() {
  const access = await requireRole(["operations", "platform_admin", "super_admin"]);
  if (access.status !== "allowed") {
    redirectForAccess(access);
    return <DashboardShell audience="admin" title="School onboarding"><AccessNotice title="Operations access is restricted" detail="A trusted operations role is required to review school requests."/></DashboardShell>;
  }
  const supabase = await createClient();
  if (!supabase) return <DashboardShell audience="admin" title="School onboarding"><AccessNotice title="Operations is not configured" detail="Connect the SchoolPay Supabase project to load onboarding requests."/></DashboardShell>;
  const { data: requests, error } = await supabase.from("school_onboarding_requests")
    .select("id,school_name,website,address_line1,city,state,zip_code,public_phone,school_type,grades_served,contact_name,contact_title,contact_email,contact_phone,additional_information,status,created_at")
    .in("status", ["submitted", "reviewing", "information_required"]).order("created_at").limit(100);
  return <DashboardShell audience="admin" title="School onboarding">
    <div className="dashboard-welcome"><h2>School requests</h2><p>Review each school's public details and authorized contact before creating its private workspace. Approval does not activate its directory listing or verify tuition/payment information.</p></div>
    {error ? <div className="empty-state"><h2>Onboarding queue unavailable.</h2><p>Apply the Phase 3 school operations migration to enable this queue.</p></div> : requests?.length ? <div className="school-review-list">
      {requests.map((request) => <article className="dash-panel school-review-card" key={request.id}>
        <div className="school-review-heading"><div><span className="eyebrow">{labels[request.status] ?? request.status}</span><h2>{request.school_name}</h2><p>{[request.address_line1, request.city, request.state, request.zip_code].filter(Boolean).join(" · ")}</p></div><span className="status-tag">{request.school_type}</span></div>
        <div className="school-review-contact"><strong>{request.contact_name}</strong><span>{request.contact_title}</span><a href={`mailto:${request.contact_email}`}>{request.contact_email}</a><a href={`tel:${request.contact_phone}`}>{request.contact_phone}</a></div>
        <p className="school-review-meta">{request.website || "No website supplied"}{request.grades_served?.length ? ` · Grades: ${request.grades_served.join(", ")}` : ""}{request.public_phone ? ` · Public phone: ${request.public_phone}` : ""}</p>
        {request.additional_information && <p className="school-review-meta">{request.additional_information}</p>}
        <SchoolRequestReviewForm requestId={request.id}/>
      </article>)}
    </div> : <div className="empty-state"><h2>No school onboarding requests.</h2><p>New, verified-contact requests will appear here for review.</p></div>}
  </DashboardShell>;
}
