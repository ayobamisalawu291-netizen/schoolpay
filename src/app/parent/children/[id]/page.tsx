import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, GraduationCap } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ConnectSchoolForm } from "@/components/parent/connect-school-form";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { formatUsdCents } from "@/lib/money";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ChildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Child details" status={context.status}/>;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: child, error } = await context.supabase.from("children")
    .select("id,first_name,middle_name,last_name,grade,created_at")
    .eq("id", id).eq("parent_id", context.userId).is("archived_at", null).maybeSingle();
  if (error || !child) notFound();

  const [linksResult, invoiceResult, schoolsResult] = await Promise.all([
    context.supabase.from("child_school_links").select("id,school_id,branch_id,status,created_at").eq("parent_id", context.userId).eq("child_id", child.id).order("created_at", { ascending: false }),
    context.supabase.from("invoices").select("id,school_id,invoice_reference,outstanding_amount_minor,currency,verification_status,status,current_document_id,created_at").eq("parent_id", context.userId).eq("child_id", child.id).order("created_at", { ascending: false }),
    context.supabase.from("schools").select("id,name,slug,city,state").eq("status", "active").eq("directory_visible", true).order("name").limit(250)
  ]);
  const links = linksResult.data ?? [];
  const schools = schoolsResult.data ?? [];
  const schoolById = new Map(schools.map((school) => [school.id, school]));
  const linksWithNames = links.map((link) => ({ ...link, school: schoolById.get(link.school_id) }));

  return <DashboardShell audience="parent" title={`${child.first_name} ${child.last_name}`}>
    <div className="child-detail-top"><Link className="back-link" href="/parent/children"><ArrowLeft size={15}/>My Children</Link><Link className="button button-secondary" href={`/parent/children/${child.id}/edit`}>Edit child</Link></div>
    <div className="child-profile-card"><span className="record-icon"><GraduationCap size={20}/></span><div><h2>{child.first_name} {child.middle_name ? `${child.middle_name} ` : ""}{child.last_name}</h2><p>{child.grade || "Grade not added"}</p></div></div>
    <div className="parent-detail-grid">
      <section className="parent-section-card"><div className="section-card-heading"><div><span className="section-card-icon"><GraduationCap size={17}/></span><h2>School connection</h2></div><Link className="subtle-link" href="/parent/schools">Find a school</Link></div>
        {linksWithNames.length ? <div className="record-list">{linksWithNames.map((link) => <div className="record-list-item" key={link.id}><div><strong>{link.school?.name ?? "Participating school"}</strong><small>{link.school ? [link.school.city, link.school.state].filter(Boolean).join(", ") : "School directory entry unavailable"}</small></div><span className="status-tag">{link.status.replaceAll("_", " ")}</span></div>)}</div> : <div className="inline-empty"><strong>No school connected yet.</strong><p>Choose a participating school. The school will still need to confirm enrollment.</p></div>}
        <ConnectSchoolForm childId={child.id} schools={schools}/>
      </section>
      <section className="parent-section-card"><div className="section-card-heading"><div><span className="section-card-icon"><FileText size={17}/></span><h2>Tuition invoices</h2></div><Link className="subtle-link" href={`/parent/school-fees/upload?childId=${child.id}`}>Upload</Link></div>
        {invoiceResult.error ? <p className="form-message error">We couldn't load this child's invoices.</p> : invoiceResult.data?.length ? <div className="record-list">{invoiceResult.data.map((invoice) => <Link className="record-list-item record-list-link" key={invoice.id} href={`/parent/school-fees/${invoice.id}`}><div><strong>Invoice {invoice.invoice_reference}</strong><small>{formatUsdCents(invoice.outstanding_amount_minor)} · {invoice.verification_status.replaceAll("_", " ")}</small></div><ArrowRight size={16}/></Link>)}</div> : <div className="inline-empty"><strong>No tuition invoices are available.</strong><p>Upload the fee statement after you request a school connection.</p></div>}
        <Link className="button button-secondary" href={`/parent/school-fees/upload?childId=${child.id}`}><FileText size={15}/>Upload invoice</Link>
      </section>
    </div>
  </DashboardShell>;
}
