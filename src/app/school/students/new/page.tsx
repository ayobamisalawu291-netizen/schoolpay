import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { SchoolStudentForm } from "@/components/school/school-student-form";
import { getSchoolContext } from "@/lib/school-access";

export default async function NewSchoolStudentPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed" || !context.membership) return <DashboardShell audience="school" title="Add student"><AccessNotice title="School access required" detail="Choose an authorized school account before adding records."/></DashboardShell>;
  if (!["school_owner", "school_admin"].includes(context.membership.role)) return <DashboardShell audience="school" title="Add student"><AccessNotice title="Administrator access required" detail="Only school owners and administrators can create student records."/></DashboardShell>;

  const [branchesResult, periodsResult] = await Promise.all([
    context.supabase.from("school_branches").select("id,name").eq("school_id", context.membership.school_id).order("name"),
    context.supabase.from("academic_periods").select("id,name,academic_year").eq("school_id", context.membership.school_id).eq("active", true).order("starts_on")
  ]);
  const query = `?school=${encodeURIComponent(context.membership.school_id)}`;
  return <DashboardShell audience="school" title="Add student">
    <div className="parent-page-intro"><p>Add a record from your school's official system. Student records remain private to authorized staff and are never searchable by parents.</p><span className="market-pill">{context.membership.school.name}</span></div>
    {(branchesResult.error || periodsResult.error) && <p className="form-message error" role="status">Campus or academic period options could not be loaded. You can still save a student without selecting them.</p>}
    <SchoolStudentForm schoolId={context.membership.school_id} branches={branchesResult.data ?? []} periods={(periodsResult.data ?? []).map((period) => ({...period, label: `${period.name} · ${period.academic_year}`}))}/>
    <p className="parent-form-note"><Link href={`/school/students${query}`}>Back to students</Link></p>
  </DashboardShell>;
}
