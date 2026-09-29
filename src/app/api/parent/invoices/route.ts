import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getParentContext } from "@/lib/parent-data";
import { validateInvoiceFile, MAX_INVOICE_FILE_BYTES } from "@/lib/invoice-file";
import { parseUsdCents } from "@/lib/money";
import { invoiceSubmissionSchema } from "@/lib/parent-validation";

export const runtime = "nodejs";
export const maxDuration = 30;

const bucket = "schoolpay-private-documents";
const uuidPattern = /^[0-9a-f-]{36}$/i;

function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function safeFilename(value: string) {
  return value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 240) || "invoice";
}

export async function POST(request: NextRequest) {
  const context = await getParentContext();
  if (context.status === "signed_out") return apiError("Sign in to upload an invoice.", 401);
  if (context.status === "forbidden") return apiError("This account cannot upload parent invoices.", 403);
  if (context.status !== "allowed") return apiError("SchoolPay account services are not available right now.", 503);
  if (!context.profileComplete) return apiError("Complete your parent profile before uploading an invoice.", 403);

  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_INVOICE_FILE_BYTES + 64 * 1024)) {
    return apiError("Invoices must be 4 MB or smaller.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("The upload could not be read. Please try again.", 400);
  }
  const file = formData.get("invoice");
  if (!(file instanceof File)) return apiError("Choose a PDF, JPG, JPEG, or PNG invoice file.", 400);
  if (file.size > MAX_INVOICE_FILE_BYTES) return apiError("Invoices must be 4 MB or smaller.", 413);

  let fileCheck: Awaited<ReturnType<typeof validateInvoiceFile>>;
  try {
    fileCheck = await validateInvoiceFile(file);
  } catch {
    return apiError("The invoice file could not be read.", 400);
  }
  if (!fileCheck.ok) return apiError(fileCheck.error, 400);

  const parsed = invoiceSubmissionSchema.safeParse({
    childId: formData.get("childId"),
    schoolId: formData.get("schoolId"),
    childSchoolLinkId: formData.get("childSchoolLinkId"),
    academicPeriodId: formData.get("academicPeriodId"),
    invoiceReference: formData.get("invoiceReference"),
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate"),
    originalAmount: formData.get("originalAmount"),
    amountPaid: formData.get("amountPaid")
  });
  if (!parsed.success) return apiError("Check the invoice details and enter amounts shown on the school document.", 400);
  const invoiceFields = parsed.data;
  const originalAmountMinor = parseUsdCents(invoiceFields.originalAmount);
  const amountPaidMinor = parseUsdCents(invoiceFields.amountPaid);
  if (!originalAmountMinor || amountPaidMinor === null) return apiError("Enter invoice amounts using dollars and cents.", 400);

  const { data: link } = await context.supabase.from("child_school_links")
    .select("id,child_id,school_id,status")
    .eq("id", invoiceFields.childSchoolLinkId).eq("parent_id", context.userId)
    .eq("child_id", invoiceFields.childId).eq("school_id", invoiceFields.schoolId)
    .in("status", ["matched", "school_confirmation_required"]).maybeSingle();
  if (!link) return apiError("Connect this child to the selected school before uploading an invoice.", 403);

  if (invoiceFields.academicPeriodId) {
    const { data: period } = await context.supabase.from("academic_periods").select("id")
      .eq("id", invoiceFields.academicPeriodId).eq("school_id", link.school_id).eq("active", true).maybeSingle();
    if (!period) return apiError("Choose an academic period offered by the selected school.", 400);
  }

  const requestedInvoiceId = String(formData.get("invoiceId") ?? "");
  const replacingDocumentId = String(formData.get("replacementDocumentId") ?? "");
  const invoiceId = requestedInvoiceId || null;
  if (invoiceId && !uuidPattern.test(invoiceId)) return apiError("That invoice could not be found.", 404);
  if ((invoiceId && !uuidPattern.test(replacingDocumentId)) || (!invoiceId && replacingDocumentId)) return apiError("That invoice document could not be replaced.", 400);

  if (invoiceId) {
    const { data: existingInvoice } = await context.supabase.from("invoices")
      .select("id,child_id,school_id,child_school_link_id,current_document_id,source,status,verification_status")
      .eq("id", invoiceId).eq("parent_id", context.userId).maybeSingle();
    if (!existingInvoice || existingInvoice.source !== "parent_upload" || existingInvoice.status !== "open" || !["pending", "school_confirmation_required"].includes(existingInvoice.verification_status) || existingInvoice.current_document_id !== replacingDocumentId || existingInvoice.child_id !== link.child_id || existingInvoice.school_id !== link.school_id || existingInvoice.child_school_link_id !== link.id) {
      return apiError("This invoice can no longer be replaced. Contact support if its information is incorrect.", 409);
    }
    const { data: lockedApplication } = await context.supabase.from("financing_applications").select("id")
      .eq("invoice_id", invoiceId).not("status", "in", "(draft,withdrawn,cancelled)").maybeSingle();
    if (lockedApplication) return apiError("This invoice is locked because its application has moved beyond draft.", 409);
  }

  const storagePath = `${context.userId}/${randomUUID()}${fileCheck.extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await context.supabase.storage.from(bucket).upload(storagePath, bytes, {
    contentType: file.type.toLowerCase(),
    cacheControl: "0",
    upsert: false
  });
  if (uploadError) return apiError("We couldn't upload the invoice to private storage. Please try again.", 502);

  const { data, error } = await context.supabase.rpc("record_parent_invoice", {
    p_invoice_id: invoiceId,
    p_child_id: link.child_id,
    p_school_id: link.school_id,
    p_child_school_link_id: link.id,
    p_academic_period_id: invoiceFields.academicPeriodId,
    p_invoice_reference: invoiceFields.invoiceReference,
    p_issue_date: invoiceFields.issueDate,
    p_due_date: invoiceFields.dueDate,
    p_original_amount_minor: originalAmountMinor,
    p_amount_paid_minor: amountPaidMinor,
    p_storage_path: storagePath,
    p_original_filename: safeFilename(file.name),
    p_mime_type: file.type.toLowerCase(),
    p_byte_size: file.size,
    p_replaces_document_id: replacingDocumentId || null
  });
  if (error || !data?.[0]?.invoice_id) {
    await context.supabase.storage.from(bucket).remove([storagePath]);
    return apiError(error?.code === "23505" ? "An invoice with this school reference already exists for the child. Open that invoice to replace its file." : "We couldn't save the invoice details. Please check the school connection and try again.", error?.code === "23505" ? 409 : 400);
  }

  revalidatePath("/parent/school-fees");
  revalidatePath("/parent/documents");
  revalidatePath("/parent/applications");
  return NextResponse.json({ invoiceId: data[0].invoice_id }, { headers: { "Cache-Control": "no-store" } });
}
