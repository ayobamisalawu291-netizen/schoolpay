import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, FileText, GraduationCap, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { getSchoolContext } from "@/lib/school-access";

export default async function SchoolDashboard({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed") return <DashboardShell audience="school" title="School dashboard">
    <AccessNotice title={context.status === "unconfigured" ? "Account services not configured" : context.status === "unavailable" ? "School portal unavailable" : "School account setup needed"}
      detail={context.status === "unconfigured" ? "Connect the SchoolPay Supabase project and apply the migrations to use school records." : context.status === "unavailable" ? "We couldn't load your school membership. Please try again later." : "A SchoolPay operations reviewer must approve your school request and assign your account before you can open this private portal."}/>
    {context.status === "forbidden" && <Link className="button button-primary" href="/school/onboarding">Start school onboarding</Link>}
  </DashboardShell>;

  if (!context.membership) return <DashboardShell audience="school" title="Choose a school">
    <div className="dashboard-welcome"><h2>Your school memberships</h2><p>Choose which school workspace you want to open. Access is checked against your school membership.</p></div>
    <div className="parent-card-grid school-record-grid">{context.memberships.map((membership) => <Link className="parent-record-card" key={membership.school_id} href={`/school/dashboard?school=${membership.school_id}`}>
      <span className="record-icon"><GraduationCap size={19}/></span><div className="record-card-copy"><h2>{membership.school.name}</h2><p>{[membership.school.city, membership.school.state].filter(Boolean).join(", ")}</p><small>{membership.role.replace("school_", "").replaceAll("_", " ")}</small></div><span className="record-card-link">Open school <ArrowRight size={15}/></span>
    </Link>)}</div>
  </DashboardShell>;

  const { membership, supabase } = context;
  const schoolId = membership.school_id;
  const canReviewInvoices = membership.role !== "school_staff";
  const [studentCount, confirmationCount, invoiceCount] = await Promise.all([
    supabase.from("student_records").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("active", true),
    supabase.from("child_school_links").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "school_confirmation_required"),
    canReviewInvoices
      ? supabase.from("invoices").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "open")
      : Promise.resolve({ count: null, error: null })
  ]);
  const recordError = studentCount.error || confirmationCount.error || invoiceCount.error;
  const schoolParam = `?school=${encodeURIComponent(schoolId)}`;

  return <DashboardShell audience="school" title="School dashboard">
    <div className="dashboard-welcome"><h2>{membership.school.name}</h2><p>School records are private to authorized members. Confirmations stay in review until school staff check them against official records.</p></div>
    <div className="dashboard-cards">
      <div className="dashboard-stat"><span>Active student records</span><strong>{recordError ? "—" : studentCount.count ?? 0}</strong><small>Private school records</small></div>
      <div className="dashboard-stat"><span>Connections to confirm</span><strong>{recordError ? "—" : confirmationCount.count ?? 0}</strong><small>Parent-initiated requests</small></div>
      {canReviewInvoices && <div className="dashboard-stat"><span>Open tuition invoices</span><strong>{recordError ? "—" : invoiceCount.count ?? 0}</strong><small>School review queue</small></div>}
    </div>
    {recordError && <p className="form-message error" role="status">Some school totals are temporarily unavailable.</p>}
    <div className="dash-grid">
      <section className="dash-panel"><h2>School records</h2><p>Add and maintain student records for your school. These records are never exposed as a public directory.</p><div className="quick-links">
        <Link href={`/school/students${schoolParam}`}><span><Users size={15}/>Manage students</span><ArrowRight size={15}/></Link>
        <Link href={`/school/invoices${schoolParam}`}><span><FileText size={15}/>Review tuition invoices</span><ArrowRight size={15}/></Link>
        <Link href={`/school/profile${schoolParam}`}><span><GraduationCap size={15}/>School profile</span><ArrowRight size={15}/></Link>
      </div></section>
      <section className="dash-panel"><h2>Not available in this phase</h2><div className="dash-empty"><strong>Financial accounts are not configured</strong><p>No settlement account, payment, offer, or disbursement is activated by this portal.</p></div></section>
    </div>
  </DashboardShell>;
}
