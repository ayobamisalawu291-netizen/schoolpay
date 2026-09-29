import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { SchoolOnboardingForm } from "@/components/school/school-onboarding-form";
import { createClient } from "@/lib/supabase/server";
import { getSchoolContext } from "@/lib/school-access";

const statusLabels: Record<string, string> = {
  submitted: "Submitted for review",
  reviewing: "Under review",
  information_required: "More information requested",
  approved: "Approved for onboarding",
  rejected: "Unable to approve"
};

export default async function SchoolOnboardingPage() {
  const supabase = await createClient();
  if (!supabase) return <DashboardShell audience="school" title="School onboarding"><AccessNotice title="Account services not configured" detail="Connect the SchoolPay Supabase project and apply the school operations migration to submit a school request."/></DashboardShell>;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const schoolContext = await getSchoolContext();
  if (schoolContext.status === "allowed" && schoolContext.memberships.length === 1) redirect("/school/dashboard");

  const { data: existing, error } = await supabase
    .from("school_onboarding_requests")
    .select("id,school_name,state,city,status,review_note,created_at")
    .eq("requester_id", authData.user.id)
    .in("status", ["submitted", "reviewing", "information_required", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return <DashboardShell audience="school" title="School onboarding">
    <div className="dashboard-welcome"><h2>Start a school review</h2><p>Share your school’s public details and an authorized contact. SchoolPay operations will review the request before creating a school account.</p></div>
    {error ? <div className="empty-state"><h2>School onboarding is not available yet</h2><p>The school operations migration has not been applied to the connected database.</p></div> : existing ? <section className="dash-panel school-request-panel">
      <span className="eyebrow">REQUEST STATUS</span><h2>{existing.school_name}</h2><p>{[existing.city, existing.state].filter(Boolean).join(", ")}</p><strong className="status-tag">{statusLabels[existing.status] ?? "Under review"}</strong>
      {existing.review_note && <p className="parent-form-note">SchoolPay note: {existing.review_note}</p>}
      <p className="parent-form-note">Your school is not listed publicly until the separate verification and activation steps are complete.</p>
    </section> : <SchoolOnboardingForm email={authData.user.email ?? ""}/>}
  </DashboardShell>;
}
