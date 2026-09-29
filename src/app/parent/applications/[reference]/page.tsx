import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, FileText, LockKeyhole } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { formatUsdCents } from "@/lib/money";
import { requireParentPage } from "@/lib/parent-guard";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Application details" status={context.status}/>;
  const { reference } = await params;
  if (!/^SP-APP-[A-F0-9]{32}$/.test(reference)) notFound();
  const { data: application, error } = await context.supabase.from("financing_applications")
    .select("id,public_reference,invoice_id,status,current_step,created_at,updated_at")
    .eq("public_reference", reference).eq("parent_id", context.userId).maybeSingle();
  if (error || !application) notFound();

  const [{ data: invoice }, { data: history }, { data: linkedDocuments }] = await Promise.all([
    context.supabase.from("invoices").select("id,child_id,school_id,academic_period_id,invoice_reference,original_amount_minor,amount_paid_minor,outstanding_amount_minor,currency,verification_status,current_document_id,issue_date,due_date").eq("id", application.invoice_id).eq("parent_id", context.userId).maybeSingle(),
    context.supabase.from("application_status_history").select("id,previous_status,new_status,reason,created_at").eq("application_id", application.id).eq("parent_id", context.userId).order("created_at", { ascending: true }),
    context.supabase.from("application_documents").select("invoice_document_id").eq("application_id", application.id).eq("parent_id", context.userId)
  ]);
  if (!invoice) notFound();
  const [{ data: child }, { data: school }, { data: documents }, { data: period }] = await Promise.all([
    context.supabase.from("children").select("first_name,last_name,grade").eq("id", invoice.child_id).eq("parent_id", context.userId).maybeSingle(),
    context.supabase.from("schools").select("name,slug").eq("id", invoice.school_id).eq("status", "active").eq("directory_visible", true).maybeSingle(),
    context.supabase.from("invoice_documents").select("id,original_filename,mime_type,review_status,created_at").eq("invoice_id", invoice.id).eq("parent_id", context.userId).order("created_at", { ascending: false }),
    invoice.academic_period_id ? context.supabase.from("academic_periods").select("name,academic_year").eq("id", invoice.academic_period_id).eq("school_id", invoice.school_id).maybeSingle() : Promise.resolve({ data: null })
  ]);
  const linkedIds = new Set((linkedDocuments ?? []).map((document) => document.invoice_document_id));

  return <DashboardShell audience="parent" title="Application Details">
    <div className="parent-detail-top"><Link className="back-link" href="/parent/applications"><ArrowLeft size={15}/>Applications</Link><span className="public-reference">{application.public_reference}</span></div>
    <div className="invoice-detail-grid">
      <section className="parent-section-card">
        <div className="section-card-heading"><div><span className="section-card-icon"><FileText size={17}/></span><h2>Application summary</h2></div><span className="status-tag">{application.status.replaceAll("_", " ")}</span></div>
        <dl className="invoice-summary-list">
          <div><dt>Child</dt><dd>{child ? `${child.first_name} ${child.last_name}` : "Child record"}</dd></div>
          <div><dt>School</dt><dd>{school?.name ?? "Awaiting school confirmation"}</dd></div>
          <div><dt>Academic period</dt><dd>{period ? `${period.name} · ${period.academic_year}` : "Awaiting school confirmation"}</dd></div>
          <div><dt>Invoice</dt><dd>{invoice.invoice_reference}</dd></div>
          <div><dt>Outstanding amount</dt><dd><strong>{formatUsdCents(invoice.outstanding_amount_minor)}</strong><small>{invoice.verification_status.replaceAll("_", " ")} · subject to school confirmation</small></dd></div>
          <div><dt>Created</dt><dd>{new Date(application.created_at).toLocaleDateString("en-US")}</dd></div>
          <div><dt>Last saved</dt><dd>{new Date(application.updated_at).toLocaleDateString("en-US")}</dd></div>
        </dl>
        <div className="obligation-callout"><strong>No financing decision has been made.</strong><p>This draft is linked to a parent-provided invoice. The amount is not verified or an offer, and no credit check or payment has taken place.</p></div>
        {application.status === "draft" && <Link className="button button-primary" href={`/parent/applications/new?reference=${application.public_reference}`}>Continue draft · step {application.current_step} of 6</Link>}
      </section>
      <section className="parent-section-card">
        <div className="section-card-heading"><div><span className="section-card-icon"><FileText size={17}/></span><h2>Documents</h2></div></div>
        {documents?.length ? <div className="record-list">{documents.map((document) => <div className="document-row" key={document.id}><span className="record-icon"><FileText size={17}/></span><div><strong>{document.original_filename}</strong><small>{document.review_status.replaceAll("_", " ")} · {linkedIds.has(document.id) ? "linked to this draft" : "invoice document"}</small></div><Link className="subtle-link" href={`/api/parent/documents/${document.id}`}>Download</Link></div>)}</div> : <div className="inline-empty"><strong>No documents uploaded yet.</strong></div>}
        <div className="timeline-heading"><Clock3 size={16}/><h3>Status history</h3></div>
        {history?.length ? <ol className="status-timeline">{history.map((event) => <li key={event.id}><span className="timeline-dot"/><div><strong>{event.previous_status ? `${event.previous_status.replaceAll("_", " ")} → ` : "Application created · "}{event.new_status.replaceAll("_", " ")}</strong><small>{new Date(event.created_at).toLocaleString("en-US")}</small>{event.reason && <p>{event.reason}</p>}</div></li>)}</ol> : <div className="inline-empty"><strong>No status events are available.</strong></div>}
        <p className="parent-form-note"><LockKeyhole size={14}/>Only status transitions are recorded here. Draft progress is saved to the application.</p>
      </section>
    </div>
  </DashboardShell>;
}
