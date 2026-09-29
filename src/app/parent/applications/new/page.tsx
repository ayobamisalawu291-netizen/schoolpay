import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { ApplicationWizard, type WizardChild, type WizardInvoice, type WizardSchoolLink } from "@/components/parent/application-wizard";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function NewApplicationPage({ searchParams }: { searchParams: Promise<{ invoiceId?: string; reference?: string }> }) {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Apply for SchoolPay" status={context.status}/>;
  const params = await searchParams;
  if (params.reference && !/^SP-APP-[A-F0-9]{32}$/.test(params.reference)) notFound();

  const applicationPromise = params.reference
    ? context.supabase.from("financing_applications").select("id,public_reference,invoice_id,status,current_step").eq("public_reference", params.reference).eq("parent_id", context.userId).eq("status", "draft").maybeSingle()
    : Promise.resolve({ data: null, error: null });
  const [{ data: children, error: childrenError }, { data: links, error: linksError }, { data: invoices, error: invoiceError }, { data: application, error: applicationError }] = await Promise.all([
    context.supabase.from("children").select("id,first_name,last_name,grade").eq("parent_id", context.userId).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
    context.supabase.from("child_school_links").select("id,child_id,school_id,status").eq("parent_id", context.userId).in("status", ["matched", "school_confirmation_required"]).order("created_at", { ascending: false }).limit(200),
    context.supabase.from("invoices").select("id,child_id,school_id,child_school_link_id,invoice_reference,original_amount_minor,amount_paid_minor,outstanding_amount_minor,verification_status,current_document_id").eq("parent_id", context.userId).eq("status", "open").order("created_at", { ascending: false }).limit(200),
    applicationPromise
  ]);
  if (applicationError || (params.reference && !application)) notFound();

  const selectedInvoiceId = application?.invoice_id ?? params.invoiceId ?? "";
  const { data: selectedInvoice } = selectedInvoiceId ? await context.supabase.from("invoices")
    .select("id,child_id,school_id,child_school_link_id")
    .eq("id", selectedInvoiceId).eq("parent_id", context.userId).maybeSingle() : { data: null };
  const schoolIds = [...new Set((links ?? []).map((link) => link.school_id))];
  const invoiceIds = [...new Set((invoices ?? []).map((invoice) => invoice.id))];
  const [{ data: schools }, { data: documents }] = await Promise.all([
    schoolIds.length ? context.supabase.from("schools").select("id,name,slug").in("id", schoolIds).eq("status", "active").eq("directory_visible", true) : Promise.resolve({ data: [] }),
    invoiceIds.length ? context.supabase.from("invoice_documents").select("id,invoice_id,original_filename,review_status").in("invoice_id", invoiceIds).eq("parent_id", context.userId) : Promise.resolve({ data: [] })
  ]);
  const schoolById = new Map((schools ?? []).map((school) => [school.id, school]));
  const docsById = new Map((documents ?? []).map((document) => [document.id, document]));
  const wizardChildren: WizardChild[] = (children ?? []).map((child) => ({ id: child.id, firstName: child.first_name, lastName: child.last_name, grade: child.grade }));
  const wizardLinks: WizardSchoolLink[] = (links ?? []).flatMap((link) => {
    const school = schoolById.get(link.school_id);
    return school ? [{ id: link.id, childId: link.child_id, schoolId: link.school_id, schoolName: school.name, slug: school.slug, status: link.status }] : [];
  });
  const wizardInvoices: WizardInvoice[] = (invoices ?? []).flatMap((invoice) => {
    const document = invoice.current_document_id ? docsById.get(invoice.current_document_id) : undefined;
    return [{
      id: invoice.id, childId: invoice.child_id, schoolId: invoice.school_id, reference: invoice.invoice_reference,
      originalAmountMinor: String(invoice.original_amount_minor), amountPaidMinor: String(invoice.amount_paid_minor),
      outstandingAmountMinor: String(invoice.outstanding_amount_minor), verificationStatus: invoice.verification_status,
      documentId: document?.id ?? null, documentName: document?.original_filename ?? null, documentStatus: document?.review_status ?? null
    }];
  });
  const initialChildId = selectedInvoice?.child_id ?? "";
  const initialSchoolLinkId = selectedInvoice?.child_school_link_id ?? "";
  const initialStep = application?.current_step ?? (selectedInvoice ? 3 : 1);
  if (childrenError || linksError || invoiceError) return <DashboardShell audience="parent" title="Apply for SchoolPay"><div className="form-message error" role="alert">We couldn't load the information for your application. Please refresh and try again.</div></DashboardShell>;

  return <DashboardShell audience="parent" title="Apply for SchoolPay">
    <div className="wizard-intro"><Link className="back-link" href="/parent/applications"><ArrowLeft size={15}/>Applications</Link><p>Start with a child, school, and official tuition invoice. The amount is derived from the invoice and remains subject to school confirmation.</p></div>
    <ApplicationWizard students={wizardChildren} schoolLinks={wizardLinks} invoices={wizardInvoices} initialStep={initialStep} initialReference={application?.public_reference ?? ""} initialChildId={initialChildId} initialSchoolLinkId={initialSchoolLinkId} initialInvoiceId={selectedInvoice?.id ?? ""}/>
  </DashboardShell>;
}
