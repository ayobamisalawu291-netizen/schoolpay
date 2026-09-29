"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export type InvoiceSchoolLink = {
  id: string;
  childId: string;
  childName: string;
  schoolId: string;
  schoolName: string;
  branchId: string | null;
  status: string;
};

export type InvoicePeriodOption = { id: string; schoolId: string; name: string; academicYear: string };
export type EditableInvoice = {
  id: string;
  childId: string;
  schoolId: string;
  childSchoolLinkId: string;
  academicPeriodId: string | null;
  reference: string;
  issueDate: string | null;
  dueDate: string | null;
  originalAmountMinor: string | number;
  amountPaidMinor: string | number;
  currentDocumentId: string;
};

function decimalFromCents(value: string | number): string {
  const cents = BigInt(value);
  return `${cents / 100n}.${(cents % 100n).toString().padStart(2, "0")}`;
}

export function InvoiceUploadForm({ links, periods, initialChildId, initialSchoolId, invoice: existingInvoice }: {
  links: InvoiceSchoolLink[];
  periods: InvoicePeriodOption[];
  initialChildId?: string;
  initialSchoolId?: string;
  invoice?: EditableInvoice;
}) {
  const router = useRouter();
  const initial = links.find((link) => link.id === existingInvoice?.childSchoolLinkId)
    ?? links.find((link) => link.childId === (existingInvoice?.childId ?? initialChildId) && link.schoolId === (existingInvoice?.schoolId ?? initialSchoolId))
    ?? links.find((link) => link.childId === initialChildId) ?? links[0];
  const [linkId, setLinkId] = useState(initial?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const selectedLink = useMemo(() => links.find((link) => link.id === linkId) ?? null, [links, linkId]);
  const availablePeriods = useMemo(() => periods.filter((period) => period.schoolId === selectedLink?.schoolId), [periods, selectedLink?.schoolId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/parent/invoices", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json() as { error?: string; invoiceId?: string };
      if (!response.ok || !body.invoiceId) {
        setError(body.error ?? "We couldn't upload the invoice. Please try again.");
        return;
      }
      router.push(`/parent/school-fees/${body.invoiceId}`);
    } catch {
      setError("Your upload could not reach SchoolPay. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (!links.length) return <div className="empty-state"><span className="empty-icon">!</span><h2>Connect a child to a school first</h2><p>Invoices are connected to a child and a school. Find a participating school and request the school's confirmation before uploading a fee statement.</p><Link className="button button-primary" href="/parent/children">Go to My Children</Link></div>;

  return <form className="parent-form" onSubmit={submit}>
    {existingInvoice && <><input type="hidden" name="invoiceId" value={existingInvoice.id}/><input type="hidden" name="replacementDocumentId" value={existingInvoice.currentDocumentId}/></>}
    <div className="parent-form-grid">
      {existingInvoice ? <label className="parent-field parent-field-wide">Child and school<input type="text" value={`${initial?.childName ?? "Child"} · ${initial?.schoolName ?? "School"}`} readOnly/><input type="hidden" name="childSchoolLinkId" value={existingInvoice.childSchoolLinkId}/></label> : <label className="parent-field parent-field-wide">Child and school<select name="childSchoolLinkId" value={linkId} onChange={(event) => setLinkId(event.target.value)} required>{links.map((link) => <option key={link.id} value={link.id}>{link.childName} · {link.schoolName} · {link.status === "matched" ? "school confirmed" : "confirmation pending"}</option>)}</select></label>}
      <input type="hidden" name="childId" value={selectedLink?.childId ?? ""}/>
      <input type="hidden" name="schoolId" value={selectedLink?.schoolId ?? ""}/>
      <label className="parent-field parent-field-wide">Academic period <span className="field-optional">Optional until the school confirms it</span><select name="academicPeriodId" defaultValue={existingInvoice?.academicPeriodId ?? ""}><option value="">Not listed yet</option>{availablePeriods.map((period) => <option key={period.id} value={period.id}>{period.name} · {period.academicYear}</option>)}</select></label>
      <label className="parent-field parent-field-wide">Invoice or fee-statement reference<input name="invoiceReference" required maxLength={100} defaultValue={existingInvoice?.reference ?? ""}/></label>
      <label className="parent-field">Issue date <span className="field-optional">Optional</span><input name="issueDate" type="date" defaultValue={existingInvoice?.issueDate ?? ""}/></label>
      <label className="parent-field">Due date <span className="field-optional">Optional</span><input name="dueDate" type="date" defaultValue={existingInvoice?.dueDate ?? ""}/></label>
      <label className="parent-field">Original invoice total<input name="originalAmount" type="text" inputMode="decimal" placeholder="0.00" required aria-describedby="amount-help" defaultValue={existingInvoice ? decimalFromCents(existingInvoice.originalAmountMinor) : ""}/></label>
      <label className="parent-field">Amount already paid<input name="amountPaid" type="text" inputMode="decimal" defaultValue={existingInvoice ? decimalFromCents(existingInvoice.amountPaidMinor) : "0.00"} required aria-describedby="amount-help"/></label>
      <label className="parent-field parent-field-wide">Official invoice file<input name="invoice" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" required onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}/><span className="field-hint">PDF, JPG, JPEG, or PNG. Maximum 4 MB.</span>{selectedFileName && <span className="field-hint">Selected: {selectedFileName}</span>}</label>
    </div>
    <p id="amount-help" className="parent-form-note">Enter the amounts shown on the official school invoice. SchoolPay calculates the outstanding amount in cents; these figures are unverified until confirmed by the school. This is not a request for a loan amount.</p>
    {error && <p className="form-message error" role="alert">{error}</p>}
    <div className="parent-form-actions"><a className="button button-secondary" href={existingInvoice ? `/parent/school-fees/${existingInvoice.id}` : "/parent/school-fees"}>Cancel</a><Button className="button button-primary" disabled={pending}>{pending ? "Uploading securely…" : existingInvoice ? "Replace invoice file" : "Upload invoice"}</Button></div>
    <p className="parent-form-note">Files are stored in a private bucket and are only available to your account through temporary download links.</p>
  </form>;
}
