import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { AcademicPeriodForm, AcademicPeriodStatusForm } from "@/components/school/school-workflow-forms";
import { getSchoolContext } from "@/lib/school-access";

export default async function AcademicPeriodsPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed" || !context.membership) return <DashboardShell audience="school" title="Academic periods"><AccessNotice title="School access required" detail="A verified school membership is required to manage academic periods."/></DashboardShell>;
  if (!["school_owner", "school_admin"].includes(context.membership.role)) return <DashboardShell audience="school" title="Academic periods"><AccessNotice title="Administrator access required" detail="Only school owners and administrators can create or activate academic periods."/></DashboardShell>;
  const schoolId = context.membership.school_id;
  const [{ data: periods, error }, { data: branches }] = await Promise.all([
    context.supabase.from("academic_periods").select("id,name,period_type,academic_year,starts_on,ends_on,active,branch_id").eq("school_id", schoolId).order("starts_on", { ascending: false }),
    context.supabase.from("school_branches").select("id,name").eq("school_id", schoolId).order("name")
  ]);

  return <DashboardShell audience="school" title="Academic periods">
    <div className="dashboard-welcome"><h2>{context.membership.school.name}</h2><p>Configure academic years, semesters, trimesters, quarters, and terms for this school. Periods start inactive and can be activated when ready.</p></div>
    <section className="dash-panel school-workflow-panel"><h2>Add an academic period</h2><AcademicPeriodForm schoolId={schoolId} branches={branches ?? []}/></section>
    {error ? <div className="empty-state"><h2>Academic periods unavailable.</h2><p>We couldn't load this school's periods.</p></div> : periods?.length ? <div className="school-period-list">{periods.map((period) => <article className="dash-panel school-period-card" key={period.id}>
      <div className="school-review-heading"><div><span className="eyebrow">{period.period_type.replaceAll("_", " ")}</span><h2>{period.name}</h2><p>{period.academic_year}{period.starts_on ? ` · ${period.starts_on}` : ""}{period.ends_on ? ` to ${period.ends_on}` : ""}</p></div><span className={`status-tag ${period.active ? "status-success" : ""}`}>{period.active ? "Active" : "Inactive"}</span></div>
      <AcademicPeriodStatusForm schoolId={schoolId} periodId={period.id} active={period.active}/>
    </article>)}</div> : <div className="empty-state"><span className="empty-icon"><CalendarDays size={20}/></span><h2>No academic periods yet.</h2><p>Add the periods used by your school. No sample periods are created.</p></div>}
  </DashboardShell>;
}
