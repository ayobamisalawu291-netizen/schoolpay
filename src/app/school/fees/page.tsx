import { redirect } from "next/navigation";
import { Banknote, CalendarDays } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { SchoolFeeStatusForm, SchoolFeeStructureForm } from "@/components/school/school-workflow-forms";
import { getSchoolContext } from "@/lib/school-access";
import { formatUsdCents } from "@/lib/money";

export default async function SchoolFeesPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed" || !context.membership) return <DashboardShell audience="school" title="Fee structures"><AccessNotice title="School access required" detail="A verified school membership is required to manage tuition fee structures."/></DashboardShell>;
  if (!["school_owner", "school_admin", "school_finance"].includes(context.membership.role)) return <DashboardShell audience="school" title="Fee structures"><AccessNotice title="Finance role required" detail="Only school finance staff and school administrators can manage tuition fee structures."/></DashboardShell>;
  const schoolId = context.membership.school_id;
  const [{ data: periods, error: periodsError }, { data: branches }, { data: fees, error }] = await Promise.all([
    context.supabase.from("academic_periods").select("id,name,academic_year,active").eq("school_id", schoolId).order("starts_on", { ascending: false }),
    context.supabase.from("school_branches").select("id,name").eq("school_id", schoolId).order("name"),
    context.supabase.from("school_fee_structures").select("id,academic_period_id,branch_id,grade,label,amount_minor,currency,active,created_at").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(200)
  ]);
  const periodById = new Map((periods ?? []).map((period) => [period.id, period]));
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch.name]));

  return <DashboardShell audience="school" title="Fee structures">
    <div className="dashboard-welcome"><h2>{context.membership.school.name}</h2><p>Maintain school-defined fee amounts in exact cents. New fee structures are inactive until a finance user explicitly activates them.</p></div>
    {periodsError ? <div className="empty-state"><h2>Fee setup unavailable.</h2><p>Academic periods could not be loaded.</p></div> : <section className="dash-panel school-workflow-panel"><h2>Add a tuition fee structure</h2>{periods?.length ? <SchoolFeeStructureForm schoolId={schoolId} branches={branches ?? []} periods={periods}/> : <div className="inline-empty"><strong>Add an academic period first.</strong><p>Fee structures are linked to the school’s academic calendar.</p><CalendarDays size={17}/></div>}</section>}
    {error ? <div className="empty-state"><h2>Fee structures unavailable.</h2><p>We couldn't load the school fee records.</p></div> : fees?.length ? <div className="school-period-list">{fees.map((fee) => {
      const period = periodById.get(fee.academic_period_id);
      return <article className="dash-panel school-period-card" key={fee.id}>
        <div className="school-review-heading"><div><span className="eyebrow">{period ? `${period.name} · ${period.academic_year}` : "Academic period unavailable"}</span><h2>{fee.label}</h2><p>{[fee.grade, fee.branch_id ? branchById.get(fee.branch_id) : "School-wide"].filter(Boolean).join(" · ")}</p></div><span className={`status-tag ${fee.active ? "status-success" : ""}`}>{fee.active ? "Active" : "Inactive"}</span></div>
        <div className="school-fee-amount"><Banknote size={17}/><strong>{formatUsdCents(String(fee.amount_minor))}</strong><span>{fee.currency}</span></div>
        <SchoolFeeStatusForm schoolId={schoolId} feeId={fee.id} active={fee.active}/>
      </article>;
    })}</div> : !periodsError && <div className="empty-state"><span className="empty-icon"><Banknote size={20}/></span><h2>No tuition fees yet.</h2><p>School finance staff can add real fee structures by academic period. No example prices are shown.</p></div>}
  </DashboardShell>;
}
