import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { SchoolConnectionReviewForm } from "@/components/school/school-connection-review-form";
import { getSchoolContext } from "@/lib/school-access";

type SchoolLinkRequest = {
  link_id: string;
  child_first_name: string;
  child_last_name: string;
  child_grade: string | null;
  parent_student_identifier: string | null;
  branch_id: string | null;
  created_at: string;
};

export default async function SchoolConfirmationsPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed" || !context.membership || !["school_owner", "school_admin", "school_staff"].includes(context.membership.role)) {
    return <DashboardShell audience="school" title="School confirmations"><AccessNotice title="School staff access required" detail="Only authorized school staff can review a parent-initiated connection request."/></DashboardShell>;
  }
  const schoolId = context.membership.school_id;
  const [{ data: requests, error }, { data: students, error: studentError }] = await Promise.all([
    context.supabase.rpc("get_school_child_link_requests", { p_school_id: schoolId }),
    context.supabase.from("student_records").select("id,student_number,first_name,last_name,grade").eq("school_id", schoolId).eq("active", true).order("student_number").limit(500)
  ]);
  const connectionRequests = (requests ?? []) as SchoolLinkRequest[];

  return <DashboardShell audience="school" title="School confirmations">
    <div className="dashboard-welcome"><h2>{context.membership.school.name}</h2><p>Review only parent-initiated requests. The parent has authorized sharing the child's name, grade, and optional student number for this school's confirmation.</p></div>
    {error || studentError ? <div className="empty-state"><h2>Confirmation queue unavailable.</h2><p>We couldn't load the school's confirmation records. Verify that the Phase 3 school operations migration is applied.</p></div> : connectionRequests.length ? <div className="school-review-list">
      {connectionRequests.map((request) => <article className="dash-panel school-review-card" key={request.link_id}>
        <div className="school-review-heading"><div><span className="eyebrow">PARENT CONNECTION REQUEST</span><h2>{request.child_first_name} {request.child_last_name}</h2><p>{request.child_grade || "Grade not supplied"}{request.parent_student_identifier ? ` · Student number supplied: ${request.parent_student_identifier}` : " · No student number supplied"}</p></div><span className="status-tag">Needs confirmation</span></div>
        <p className="school-review-meta">Request received {new Date(request.created_at).toLocaleDateString("en-US")}</p>
        <SchoolConnectionReviewForm linkId={request.link_id} schoolId={schoolId} students={students ?? []}/>
      </article>)}
    </div> : <div className="empty-state"><span className="empty-icon"><Link2 size={20}/></span><h2>No school connections need review.</h2><p>Parent-initiated connection requests will appear here once a parent gives consent.</p></div>}
  </DashboardShell>;
}
