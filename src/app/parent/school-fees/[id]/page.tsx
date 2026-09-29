import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, LockKeyhole } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { formatUsdCents } from "@/lib/money";
import { requireParentPage } from "@/lib/parent-guard";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Invoice details" status={context.status}/>;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: invoice, error } = await context.supabase.from("invoices")
    .select("id,child_id,school_id,child_school_link_id,academic_period_id,invoice_reference,issue_date,due_date,original_amount_minor,amount_paid_minor,outstanding_amount_minor,currency,status,source,verification_status,current_document_id,created_at")
    .eq("id", id).eq("parent_id", context.userId).maybeSingle();
  if (error || !invoice) notFound();

  const [{ data: documents }, { data: child }, { data: school }, { data: applications }] = await Promise.all([
    context.supabase.from("invoice_documents").select("id,original_filename,mime_type,byte_size,review_status,created_at,replaces_document_id").eq("invoice_id", invoice.id).eq("parent_id", context.userId).order("created_at", { ascending: false }),
    context.supabase.from("children").select("id,first_name,last_name,grade").eq("id", invoice.child_id).eq("parent_id", context.userId).maybeSingle(),
    context.supabase.from("schools").select("id,name,slug,city,state").eq("id", invoice.school_id).eq("status", "active").eq("directory_visible", true).maybeSingle(),
    context.supabase.from("financing_applications").select("id,status,public_reference").eq("invoice_id", invoice.id).eq("parent_id", context.userId)
  ]);
  const canReplace = invoice.source === "parent_upload" && invoice.status === "open" && ["pending", "school_confirmation_required"].includes(invoice.verification_status) && !(applications ?? []).some((app) => !["draft", "withdrawn", "cancelled"].includes(app.status));
  const currentDocument = (documents ?? []).find((document) => document.id === invoice.current_document_id);
  const replacedIds = new Set((documents ?? []).flatMap((document) => document.replaces_document_id ? [document.replaces_document_id] : []));

  return <DashboardShell audience="parent" title="Tuition Invoice">
    <div className="parent-detail-top"><Link className="back-link" href="/parent/school-fees"><ArrowLeft size={15}/>School Fees</Link>{invoice.verification_status !== "matched" && <span className="status-tag">{invoice.verification_status.replaceAll("_", " ")}</span>}</div>
    <div className="invoice-detail-grid">
      <section className="parent-section-card">
        <div className="section-card-heading"><div><span className="section-card-icon"><FileText size={17}/></span><h2>Invoice information</h2></div>{invoice.currency}</div>
        <dl className="invoice-summary-list">
          <div><dt>Invoice reference</dt><dd>{invoice.invoice_reference}</dd></div>
          <div><dt>Child</dt><dd>{child ? `${child.first_name} ${child.last_name}` : "Child record"}</dd></div>
          <div><dt>School</dt><dd>{school?.name ?? "School confirmation required"}</dd></div>
          <div><dt>Original invoice total</dt><dd>{formatUsdCents(invoice.original_amount_minor)}</dd></div>
          <div><dt>Amount already paid</dt><dd>{formatUsdCents(invoice.amount_paid_minor)}</dd></div>
          <div><dt>Outstanding amount</dt><dd><strong>{formatUsdCents(invoice.outstanding_amount_minor)}</strong><small>Unverified until confirmed by the school</small></dd></div>
          <div><dt>Issue date</dt><dd>{invoice.issue_date || "Not provided"}</dd></div>
          <div><dt>Due date</dt><dd>{invoice.due_date || "Not provided"}</dd></div>
          <div><dt>Academic period</dt><dd>Awaiting school confirmation</dd></div>
        </dl>
        <div className="obligation-callout"><strong>Invoice confirmation is still pending.</strong><p>SchoolPay has not verified the student, academic period, reference, or amount. A draft application uses this obligation and does not mean it is eligible for financing.</p></div>
        <Link className="button button-primary" href={`/parent/applications/new?invoiceId=${invoice.id}`}>Start SchoolPay Application</Link>
      </section>
      <section className="parent-section-card">
        <div className="section-card-heading"><div><span className="section-card-icon"><LockKeyhole size={17}/></span><h2>Private invoice document</h2></div></div>
        {currentDocument ? <div className="document-row"><span className="record-icon"><FileText size={17}/></span><div><strong>{currentDocument.original_filename}</strong><small>{(currentDocument.byte_size / 1024).toFixed(0)} KB · {currentDocument.review_status.replaceAll("_", " ")}</small></div><Link className="subtle-link" href={`/api/parent/documents/${currentDocument.id}`}>Download</Link></div> : <div className="inline-empty"><strong>No current invoice file.</strong><p>Upload a PDF or image of the official school fee statement.</p></div>}
        {canReplace && currentDocument && <Link className="button button-secondary" href={`/parent/school-fees/upload?childId=${invoice.child_id}&schoolId=${invoice.school_id}&invoiceId=${invoice.id}`}>Replace invoice</Link>}
        {documents && documents.length > 1 && <div className="record-list document-history"><h3>Upload history</h3>{documents.filter((document) => document.id !== invoice.current_document_id).map((document) => <div className="record-list-item" key={document.id}><span>{document.original_filename}</span><span className="status-tag">{replacedIds.has(document.id) ? "replaced" : "previous upload"}</span><Link className="subtle-link" href={`/api/parent/documents/${document.id}`}>Download</Link></div>)}</div>}
        <p className="parent-form-note">Temporary download access is checked against your account and expires after one minute.</p>
      </section>
    </div>
  </DashboardShell>;
}
