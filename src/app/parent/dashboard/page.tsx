import Link from "next/link";
import { ArrowRight, FileText, GraduationCap, Plus, School, Users } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

type Activity = { key: string; label: string; detail: string; date: string; href: string };

export default async function ParentDashboard() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Dashboard" status={context.status}/>;
  const [childrenResult, linksResult, requestResult, invoiceResult, appResult, documentResult] = await Promise.all([
    context.supabase.from("children").select("id,first_name,last_name,grade,created_at").eq("parent_id", context.userId).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("child_school_links").select("id,school_id,created_at").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("school_requests").select("id,school_name,status,created_at").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("invoices").select("id,child_id,school_id,invoice_reference,verification_status,outstanding_amount_minor,created_at").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("financing_applications").select("id,public_reference,status,created_at,updated_at").eq("parent_id", context.userId).order("updated_at", { ascending: false }).limit(100),
    context.supabase.from("invoice_documents").select("id,original_filename,created_at").eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100)
  ]);
  const results = [childrenResult, linksResult, requestResult, invoiceResult, appResult, documentResult];
  if (results.some((result) => result.error)) return <DashboardShell audience="parent" title="Dashboard"><div className="form-message error" role="alert">We couldn't load your account overview. Please refresh and try again.</div></DashboardShell>;

  const children = childrenResult.data ?? [];
  const links = linksResult.data ?? [];
  const schoolRequests = requestResult.data ?? [];
  const invoices = invoiceResult.data ?? [];
  const applications = appResult.data ?? [];
  const documents = documentResult.data ?? [];
  const activities: Activity[] = [
    ...children.map((child) => ({ key: `child-${child.id}`, label: "Child added", detail: `${child.first_name} ${child.last_name}`, date: child.created_at, href: `/parent/children/${child.id}` })),
    ...links.map((link) => ({ key: `school-link-${link.id}`, label: "School connection requested", detail: "Waiting for school confirmation", date: link.created_at, href: "/parent/schools" })),
    ...schoolRequests.map((request) => ({ key: `school-request-${request.id}`, label: "School request submitted", detail: `${request.school_name} · ${request.status.replaceAll("_", " ")}`, date: request.created_at, href: "/parent/school-requests" })),
    ...invoices.map((invoice) => ({ key: `invoice-${invoice.id}`, label: "Tuition invoice uploaded", detail: `Invoice ${invoice.invoice_reference} · ${invoice.verification_status.replaceAll("_", " ")}`, date: invoice.created_at, href: `/parent/school-fees/${invoice.id}` })),
    ...applications.map((application) => ({ key: `application-${application.id}`, label: "Application draft started", detail: application.public_reference, date: application.created_at, href: `/parent/applications/${application.public_reference}` })),
    ...documents.map((document) => ({ key: `document-${document.id}`, label: "Document uploaded", detail: document.original_filename, date: document.created_at, href: "/parent/documents" }))
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 6);
  const childIds = children.slice(0, 3).map((child) => child.id);
  const schoolIds = [...new Set(links.map((link) => link.school_id))];
  const [{ data: childSchools }, { data: childSchoolRecords }] = await Promise.all([
    schoolIds.length ? context.supabase.from("schools").select("id,name").in("id", schoolIds) : Promise.resolve({ data: [] }),
    childIds.length ? context.supabase.from("child_school_links").select("child_id,school_id,status").eq("parent_id", context.userId).in("child_id", childIds) : Promise.resolve({ data: [] })
  ]);
  const schoolNameById = new Map((childSchools ?? []).map((school) => [school.id, school.name]));
  const schoolByChild = new Map((childSchoolRecords ?? []).map((record) => [record.child_id, schoolNameById.get(record.school_id) ?? record.status.replaceAll("_", " ")]));

  return <DashboardShell audience="parent" title="Your dashboard">
    <div className="dashboard-welcome"><h2>Your SchoolPay journey starts with your child's school invoice.</h2><p>Manage child profiles, find a participating school, and upload an official tuition statement. SchoolPay does not create offers, approvals, or payments in this phase.</p></div>
    <div className="dashboard-cards parent-dashboard-cards">
      {[["Children", children.length, "/parent/children"], ["Tuition invoices", invoices.length, "/parent/school-fees"], ["Applications", applications.length, "/parent/applications"], ["Documents", documents.length, "/parent/documents"]].map(([label, count, href]) => <Link className="dashboard-stat" href={String(href)} key={String(label)}><span>{String(label)}</span><strong>{String(count)}</strong><small>From your account records</small></Link>)}
    </div>
    <div className="parent-dashboard-grid">
      <section className="parent-section-card"><div className="section-card-heading"><div><span className="section-card-icon"><Users size={17}/></span><h2>My Children</h2></div><Link className="subtle-link" href="/parent/children">View all</Link></div>
        {children.length ? <div className="record-list">{children.slice(0, 4).map((child) => <Link className="record-list-item record-list-link" key={child.id} href={`/parent/children/${child.id}`}><div><strong>{child.first_name} {child.last_name}</strong><small>{child.grade || "Grade not added"}{schoolByChild.get(child.id) ? ` · ${schoolByChild.get(child.id)}` : " · No school connected"}</small></div><ArrowRight size={16}/></Link>)}</div> : <div className="inline-empty"><strong>You haven't added any children yet.</strong><p>Add a child to begin connecting school information.</p><Link className="button button-secondary" href="/parent/children/new"><Plus size={15}/>Add child</Link></div>}
      </section>
      <section className="parent-section-card"><div className="section-card-heading"><div><span className="section-card-icon"><ArrowRight size={17}/></span><h2>Quick actions</h2></div></div>
        <div className="quick-actions-grid"><Link href="/parent/children/new"><Plus size={17}/>Add Child</Link><Link href="/parent/schools"><School size={17}/>Find School</Link><Link href="/parent/schools/request"><GraduationCap size={17}/>Request School</Link><Link href="/parent/school-fees/upload"><FileText size={17}/>Upload Invoice</Link><Link href="/parent/applications/new"><ArrowRight size={17}/>Start Draft</Link></div>
      </section>
    </div>
    <section className="parent-section-card activity-card"><div className="section-card-heading"><div><span className="section-card-icon"><FileText size={17}/></span><h2>Recent Activity</h2></div></div>
      {activities.length ? <ol className="activity-list">{activities.map((activity) => <li key={activity.key}><span className="timeline-dot"/><div><Link href={activity.href}><strong>{activity.label}</strong></Link><small>{activity.detail} · {new Date(activity.date).toLocaleDateString("en-US")}</small></div></li>)}</ol> : <div className="inline-empty"><strong>No recent activity yet.</strong><p>When you add a child, request a school, or upload an invoice, it will appear here.</p></div>}
    </section>
  </DashboardShell>;
}
