import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { AccessNotice } from "@/components/access-notice";
import { getSchoolContext } from "@/lib/school-access";
import { formatUsdCents } from "@/lib/money";

export default async function SchoolInvoicesPage({ searchParams }: { searchParams: Promise<{ school?: string }> }) {
  const params = await searchParams;
  const context = await getSchoolContext(params.school);
  if (context.status === "signed_out") redirect("/login");
  if (context.status !== "allowed" || !context.membership) return <DashboardShell audience="school" title="Tuition invoices"><AccessNotice title="School access required" detail="A verified school membership is required to open this private invoice queue."/></DashboardShell>;
  if (context.membership.role === "school_staff") return <DashboardShell audience="school" title="Tuition invoices"><AccessNotice title="Finance role required" detail="Invoice documents and tuition details are available only to school finance staff and school administrators."/></DashboardShell>;

  const { supabase, membership } = context;
  const { data: invoices, error } = await supabase.from("invoices")
    .select("id,invoice_reference,issue_date,due_date,original_amount_minor,amount_paid_minor,outstanding_amount_minor,currency,status,verification_status,created_at")
    .eq("school_id", membership.school_id).order("created_at", { ascending: false }).limit(100);
  const invoiceIds = (invoices ?? []).map((invoice) => invoice.id);
  const { data: documents, error: documentsError } = invoiceIds.length
    ? await supabase.from("invoice_documents").select("id,invoice_id,original_filename,mime_type,review_status,created_at").eq("school_id", membership.school_id).in("invoice_id", invoiceIds).order("created_at", { ascending: false })
    : { data: [], error: null };
  const documentsByInvoice = new Map<string, typeof documents>();
  for (const document of documents ?? []) documentsByInvoice.set(document.invoice_id, [...(documentsByInvoice.get(document.invoice_id) ?? []), document]);

  return <DashboardShell audience="school" title="Tuition invoices">
    <div className="dashboard-welcome"><h2>{membership.school.name}</h2><p>These parent-submitted invoice details are not verified until your authorized finance team compares them with official school records.</p></div>
    {error ? <div className="empty-state"><h2>Invoice queue unavailable.</h2><p>We couldn't load this school's invoice records. Try again later.</p></div> : invoices?.length ? <div className="school-invoice-list">
      {invoices.map((invoice) => <article className="dash-panel school-invoice-card" key={invoice.id}>
        <div className="school-review-heading"><div><span className="eyebrow">INVOICE REFERENCE</span><h2>{invoice.invoice_reference}</h2><p>{invoice.issue_date ? `Issued ${invoice.issue_date}` : "Issue date not provided"}{invoice.due_date ? ` · Due ${invoice.due_date}` : ""}</p></div><span className="status-tag">{invoice.verification_status.replaceAll("_", " ")}</span></div>
        <dl className="school-invoice-amounts"><div><dt>Invoice total</dt><dd>{formatUsdCents(String(invoice.original_amount_minor))}</dd></div><div><dt>Amount paid</dt><dd>{formatUsdCents(String(invoice.amount_paid_minor))}</dd></div><div><dt>Outstanding</dt><dd>{formatUsdCents(String(invoice.outstanding_amount_minor))}</dd></div></dl>
        <p className="school-review-meta">{invoice.currency} · {invoice.status} · submitted {new Date(invoice.created_at).toLocaleDateString("en-US")}</p>
        {documentsError ? <p className="parent-form-note">Invoice document information is temporarily unavailable.</p> : (documentsByInvoice.get(invoice.id) ?? []).map((document) => <a className="school-document-link" key={document.id} href={`/api/school/invoices/${invoice.id}/documents/${document.id}`}><FileText size={16}/>{document.original_filename}<span>{document.review_status.replaceAll("_", " ")}</span></a>)}
      </article>)}
    </div> : <div className="empty-state"><span className="empty-icon"><FileText size={20}/></span><h2>No tuition invoices are available.</h2><p>Parent-submitted invoices will appear here when linked to a school record. No sample invoices are shown.</p></div>}
  </DashboardShell>;
}
