import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardShell } from "@/components/dashboard-shell";
import { InvoiceUploadForm, type InvoicePeriodOption, type InvoiceSchoolLink } from "@/components/parent/invoice-upload-form";
import { ParentPageUnavailable } from "@/components/parent/page-unavailable";
import { requireParentPage } from "@/lib/parent-guard";

export default async function UploadInvoicePage({ searchParams }: { searchParams: Promise<{ childId?: string; schoolId?: string; invoiceId?: string }> }) {
  const context = await requireParentPage();
  if (context.status !== "allowed") return <ParentPageUnavailable title="Upload invoice" status={context.status}/>;
  const params = await searchParams;
  const { data: links, error: linksError } = await context.supabase.from("child_school_links")
    .select("id,child_id,school_id,branch_id,status")
    .eq("parent_id", context.userId).in("status", ["matched", "school_confirmation_required"]).order("created_at", { ascending: false }).limit(100);
  const { data: editableInvoice } = params.invoiceId && /^[0-9a-f-]{36}$/i.test(params.invoiceId)
    ? await context.supabase.from("invoices").select("id,child_id,school_id,child_school_link_id,academic_period_id,invoice_reference,issue_date,due_date,original_amount_minor,amount_paid_minor,current_document_id,source,status,verification_status")
      .eq("id", params.invoiceId).eq("parent_id", context.userId).maybeSingle()
    : { data: null };
  if (params.invoiceId && (!editableInvoice || editableInvoice.source !== "parent_upload" || editableInvoice.status !== "open" || !editableInvoice.current_document_id || !["pending", "school_confirmation_required"].includes(editableInvoice.verification_status))) {
    return <DashboardShell audience="parent" title="Replace invoice"><div className="form-message error" role="alert">This invoice can no longer be replaced. Contact support if its information is incorrect.</div></DashboardShell>;
  }
  if (editableInvoice) {
    const { data: lockedApplication } = await context.supabase.from("financing_applications").select("id").eq("invoice_id", editableInvoice.id).not("status", "in", "(draft,withdrawn,cancelled)").maybeSingle();
    if (lockedApplication) return <DashboardShell audience="parent" title="Replace invoice"><div className="form-message error" role="alert">This invoice is locked because its application has moved beyond draft.</div></DashboardShell>;
  }
  const childIds = [...new Set((links ?? []).map((link) => link.child_id))];
  const schoolIds = [...new Set((links ?? []).map((link) => link.school_id))];
  const [{ data: children }, { data: schools }, { data: periods }] = await Promise.all([
    childIds.length ? context.supabase.from("children").select("id,first_name,last_name").in("id", childIds).is("archived_at", null) : Promise.resolve({ data: [] }),
    schoolIds.length ? context.supabase.from("schools").select("id,name").in("id", schoolIds).eq("status", "active").eq("directory_visible", true) : Promise.resolve({ data: [] }),
    schoolIds.length ? context.supabase.from("academic_periods").select("id,school_id,name,academic_year").in("school_id", schoolIds).eq("active", true) : Promise.resolve({ data: [] })
  ]);
  const childNames = new Map((children ?? []).map((child) => [child.id, `${child.first_name} ${child.last_name}`]));
  const schoolNames = new Map((schools ?? []).map((school) => [school.id, school.name]));
  const linkOptions: InvoiceSchoolLink[] = (links ?? []).flatMap((link) => {
    const childName = childNames.get(link.child_id);
    const schoolName = schoolNames.get(link.school_id);
    return childName && schoolName ? [{ id: link.id, childId: link.child_id, childName, schoolId: link.school_id, schoolName, branchId: link.branch_id, status: link.status }] : [];
  });
  const periodOptions: InvoicePeriodOption[] = (periods ?? []).map((period) => ({ id: period.id, schoolId: period.school_id, name: period.name, academicYear: period.academic_year }));
  if (linksError) return <DashboardShell audience="parent" title="Upload Tuition Invoice"><div className="form-message error" role="alert">We couldn't load your child and school connections. Please try again.</div></DashboardShell>;
  const editable = editableInvoice ? {
    id: editableInvoice.id,
    childId: editableInvoice.child_id,
    schoolId: editableInvoice.school_id,
    childSchoolLinkId: editableInvoice.child_school_link_id,
    academicPeriodId: editableInvoice.academic_period_id,
    reference: editableInvoice.invoice_reference,
    issueDate: editableInvoice.issue_date,
    dueDate: editableInvoice.due_date,
    originalAmountMinor: String(editableInvoice.original_amount_minor),
    amountPaidMinor: String(editableInvoice.amount_paid_minor),
    currentDocumentId: editableInvoice.current_document_id!
  } : undefined;

  return <DashboardShell audience="parent" title="Upload Tuition Invoice">
    <div className="parent-form-panel"><Link className="back-link" href={editable ? `/parent/school-fees/${editable.id}` : "/parent/school-fees"}><ArrowLeft size={15}/>{editable ? "Invoice details" : "School Fees"}</Link><h2>{editable ? "Replace the school invoice file" : "Share the school's official invoice"}</h2><p>Enter the details as printed on the official school document. The current version is retained as history, and SchoolPay does not verify any amounts until the school confirms them.</p><InvoiceUploadForm links={linkOptions} periods={periodOptions} initialChildId={editable?.childId ?? params.childId} initialSchoolId={editable?.schoolId ?? params.schoolId} invoice={editable}/></div>
  </DashboardShell>;
}
