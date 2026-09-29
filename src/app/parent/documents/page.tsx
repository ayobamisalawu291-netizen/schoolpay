import Link from "next/link";
import { FileText } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function DocumentsPage() {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Documents" status={context.status}/>;
  const { data: documents, error } = await context.supabase.from("invoice_documents")
    .select("id,invoice_id,child_id,school_id,original_filename,mime_type,byte_size,review_status,replaces_document_id,created_at")
    .eq("parent_id", context.userId).order("created_at", { ascending: false }).limit(100);
  const invoiceIds = [...new Set((documents ?? []).map((document) => document.invoice_id))];
  const childIds = [...new Set((documents ?? []).map((document) => document.child_id))];
  const schoolIds = [...new Set((documents ?? []).map((document) => document.school_id))];
  const [{ data: invoices }, { data: children }, { data: schools }, { data: applicationLinks }] = await Promise.all([
    invoiceIds.length ? context.supabase.from("invoices").select("id,invoice_reference,current_document_id").in("id", invoiceIds).eq("parent_id", context.userId) : Promise.resolve({ data: [] }),
    childIds.length ? context.supabase.from("children").select("id,first_name,last_name").in("id", childIds).eq("parent_id", context.userId) : Promise.resolve({ data: [] }),
    schoolIds.length ? context.supabase.from("schools").select("id,name").in("id", schoolIds) : Promise.resolve({ data: [] }),
    documents?.length ? context.supabase.from("application_documents").select("invoice_document_id,application_id").eq("parent_id", context.userId) : Promise.resolve({ data: [] })
  ]);
  const invoiceById = new Map((invoices ?? []).map((invoice) => [invoice.id, invoice]));
  const childById = new Map((children ?? []).map((child) => [child.id, `${child.first_name} ${child.last_name}`]));
  const schoolById = new Map((schools ?? []).map((school) => [school.id, school.name]));
  const replaced = new Set((documents ?? []).flatMap((document) => document.replaces_document_id ? [document.replaces_document_id] : []));
  const applicationIds = [...new Set((applicationLinks ?? []).map((link) => link.application_id))];
  const { data: applications } = applicationIds.length ? await context.supabase.from("financing_applications").select("id,public_reference").in("id", applicationIds).eq("parent_id", context.userId) : { data: [] };
  const applicationById = new Map((applications ?? []).map((application) => [application.id, application.public_reference]));
  const applicationByDocument = new Map((applicationLinks ?? []).map((link) => [link.invoice_document_id, applicationById.get(link.application_id)]));

  return <DashboardShell audience="parent" title="Documents">
    <div className="parent-page-intro"><p>Private files you've uploaded for your children and their school invoices. Downloads use short-lived access links.</p><Link className="button button-primary" href="/parent/school-fees/upload">Upload invoice</Link></div>
    {error ? <div className="form-message error" role="alert">We couldn't load your documents. Please try again.</div> : documents?.length ? <div className="record-list record-list-panel">{documents.map((document) => {
      const invoice = invoiceById.get(document.invoice_id);
      const status = invoice?.current_document_id === document.id ? document.review_status : replaced.has(document.id) ? "replaced" : document.review_status;
      return <article className="document-center-row" key={document.id}><span className="record-icon"><FileText size={18}/></span><div className="document-center-main"><strong>{document.original_filename}</strong><small>{document.mime_type} · {(document.byte_size / 1024).toFixed(0)} KB · {new Date(document.created_at).toLocaleDateString("en-US")}</small><small>{childById.get(document.child_id) ?? "Child"} · {schoolById.get(document.school_id) ?? "School"}{invoice ? ` · Invoice ${invoice.invoice_reference}` : ""}{applicationByDocument.get(document.id) ? ` · ${applicationByDocument.get(document.id)}` : ""}</small></div><span className="status-tag">{status.replaceAll("_", " ")}</span><Link className="subtle-link" href={`/api/parent/documents/${document.id}`}>Download</Link></article>;
    })}</div> : <div className="empty-state"><span className="empty-icon"><FileText size={21}/></span><h2>No documents uploaded yet.</h2><p>Tuition invoices and related documents will appear here after you upload them.</p><Link className="button button-primary" href="/parent/school-fees/upload">Upload invoice</Link></div>}
  </DashboardShell>;
}
