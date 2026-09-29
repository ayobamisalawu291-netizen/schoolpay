"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, FileText, GraduationCap, LockKeyhole } from "lucide-react";
import { createApplicationDraft, saveApplicationStep } from "@/app/actions/parent";
import { Button } from "@/components/ui/button";
import { formatUsdCents } from "@/lib/money";

export type WizardChild = { id: string; firstName: string; lastName: string; grade: string | null };
export type WizardSchoolLink = { id: string; childId: string; schoolId: string; schoolName: string; slug: string; status: string };
export type WizardInvoice = {
  id: string; childId: string; schoolId: string; reference: string; originalAmountMinor: string;
  amountPaidMinor: string; outstandingAmountMinor: string; verificationStatus: string;
  documentId: string | null; documentName: string | null; documentStatus: string | null;
};

const titles = ["Choose child", "Choose school", "Choose invoice", "Review invoice", "Check details", "Save draft"];

export function ApplicationWizard({
  students,
  schoolLinks,
  invoices,
  initialStep = 1,
  initialReference = "",
  initialChildId = "",
  initialSchoolLinkId = "",
  initialInvoiceId = ""
}: {
  students: WizardChild[];
  schoolLinks: WizardSchoolLink[];
  invoices: WizardInvoice[];
  initialStep?: number;
  initialReference?: string;
  initialChildId?: string;
  initialSchoolLinkId?: string;
  initialInvoiceId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(6, Math.max(1, initialStep)));
  const [childId, setChildId] = useState(initialChildId);
  const [schoolLinkId, setSchoolLinkId] = useState(initialSchoolLinkId);
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId);
  const [reference, setReference] = useState(initialReference);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const child = students.find((item) => item.id === childId) ?? null;
  const childLinks = schoolLinks.filter((link) => link.childId === childId && !["inactive", "rejected", "not_found"].includes(link.status));
  const schoolLink = childLinks.find((link) => link.id === schoolLinkId) ?? null;
  const childInvoices = invoices.filter((invoice) => invoice.childId === childId && (!schoolLink || invoice.schoolId === schoolLink.schoolId));
  const invoice = invoices.find((item) => item.id === invoiceId) ?? null;

  async function saveStep(nextStep: number) {
    setError("");
    if (reference) {
      const result = await saveApplicationStep(reference, nextStep);
      if (result.error) {
        setError(result.error);
        return false;
      }
    }
    setStep(nextStep);
    return true;
  }

  async function next() {
    if (busy) return;
    if (step === 1) {
      if (!childId) return setError("Choose a child to continue.");
      setError("");
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!schoolLink) return setError("Choose a school connection for this child.");
      setError("");
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!invoice) return setError("Choose a tuition invoice to continue.");
      setBusy(true);
      const result = await createApplicationDraft(invoice.id);
      if (result.error || !result.reference) {
        setError(result.error ?? "We couldn't save this draft. Please try again.");
        setBusy(false);
        return;
      }
      setReference(result.reference);
      const saveResult = await saveApplicationStep(result.reference, 4);
      if (saveResult.error) {
        setError(saveResult.error);
        setBusy(false);
        return;
      }
      setStep(4);
      setBusy(false);
      router.replace(`/parent/applications/new?reference=${encodeURIComponent(result.reference)}`);
      return;
    }
    if (step < 6) await saveStep(step + 1);
  }

  async function previous() {
    if (step <= 1 || busy) return;
    if (reference && step === 4) {
      router.push(`/parent/applications/${reference}`);
      return;
    }
    await saveStep(step - 1);
  }

  async function finishDraft() {
    if (!reference || busy) return;
    setBusy(true);
    const result = await saveApplicationStep(reference, 6);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    router.push(`/parent/applications/${reference}`);
  }

  return <div className="application-wizard">
    <div className="wizard-progress" aria-label={`Step ${step} of 6`}>
      {titles.map((title, index) => <div className={index + 1 < step ? "wizard-step is-done" : index + 1 === step ? "wizard-step is-current" : "wizard-step"} key={title}>
        <span className="wizard-step-number">{index + 1 < step ? <Check size={14}/> : index + 1}</span><span>{title}</span>
      </div>)}
    </div>
    <section className="wizard-panel">
      <div className="wizard-panel-heading"><div><span className="eyebrow">STEP {step} OF 6</span><h2>{titles[step - 1]}</h2></div>{reference && <span className="public-reference">{reference}</span>}</div>

      {step === 1 && <div className="wizard-options">
        {students.length ? students.map((item) => <button type="button" aria-pressed={childId === item.id} className={childId === item.id ? "wizard-option selected" : "wizard-option"} key={item.id} onClick={() => { setChildId(item.id); setSchoolLinkId(""); setInvoiceId(""); }}><span className="option-icon"><GraduationCap size={18}/></span><span><strong>{item.firstName} {item.lastName}</strong><small>{item.grade || "Grade not added"}</small></span><span className="option-check" aria-hidden="true">{childId === item.id && <Check size={16}/>}</span></button>) : <div className="inline-empty"><strong>You haven't added any children yet.</strong><p>Add a child before starting a SchoolPay application.</p><Link className="button button-primary" href="/parent/children/new">Add a child</Link></div>}
      </div>}

      {step === 2 && <div className="wizard-options">
        {childLinks.length ? childLinks.map((link) => <button type="button" aria-pressed={schoolLinkId === link.id} className={schoolLinkId === link.id ? "wizard-option selected" : "wizard-option"} key={link.id} onClick={() => { setSchoolLinkId(link.id); setInvoiceId(""); }}><span className="option-icon"><GraduationCap size={18}/></span><span><strong>{link.schoolName}</strong><small>{link.status === "matched" ? "School connection confirmed" : "School confirmation required"}</small></span><span className="option-check" aria-hidden="true">{schoolLinkId === link.id && <Check size={16}/>}</span></button>) : <div className="inline-empty"><strong>No school connection yet.</strong><p>Find a participating school and request its confirmation before continuing.</p>{child && <Link className="button button-primary" href={`/parent/children/${child.id}`}>Connect this child</Link>}</div>}
      </div>}

      {step === 3 && <div className="wizard-options">
        {childInvoices.length ? childInvoices.map((item) => <button type="button" aria-pressed={invoiceId === item.id} className={invoiceId === item.id ? "wizard-option selected" : "wizard-option"} key={item.id} onClick={() => setInvoiceId(item.id)}><span className="option-icon"><FileText size={18}/></span><span><strong>Invoice {item.reference}</strong><small>{formatUsdCents(item.outstandingAmountMinor)} outstanding · {item.verificationStatus.replaceAll("_", " ")}</small></span><span className="option-check" aria-hidden="true">{invoiceId === item.id && <Check size={16}/>}</span></button>) : <div className="inline-empty"><strong>No invoice is available for this child and school.</strong><p>Upload the official school invoice. Its amount remains unverified until the school confirms it.</p>{child && schoolLink && <Link className="button button-primary" href={`/parent/school-fees/upload?childId=${child.id}&schoolId=${schoolLink.schoolId}`}>Upload an invoice</Link>}</div>}
      </div>}

      {step === 4 && <div className="review-card"><span className="review-icon"><FileText size={20}/></span><div><h3>Invoice {invoice?.reference}</h3><p>{invoice?.documentName ?? "Official invoice document"}</p><p className="status-inline">{invoice?.documentStatus?.replaceAll("_", " ") ?? "pending review"} · {invoice?.verificationStatus.replaceAll("_", " ")}</p></div>{invoice?.documentId && <Link href={`/api/parent/documents/${invoice.documentId}`} className="button button-secondary">View invoice</Link>}{invoice && child && schoolLink && <Link href={`/parent/school-fees/upload?invoiceId=${invoice.id}`} className="subtle-link">Replace invoice</Link>}<div className="obligation-callout"><span>Outstanding amount shown on your invoice</span><strong>{formatUsdCents(invoice?.outstandingAmountMinor ?? "0")}</strong><p>This figure is based on the information you entered and is not verified. School confirmation is still required.</p></div><p className="parent-form-note">Review the invoice file and details above. Continue only if this is the correct invoice. Your confirmation saves progress; it does not verify the invoice.</p></div>}

      {step === 5 && <div className="review-summary">
        <div><span>Parent</span><strong>Your SchoolPay account</strong></div>
        <div><span>Child</span><strong>{child ? `${child.firstName} ${child.lastName}` : "Not selected"}</strong></div>
        <div><span>School</span><strong>{schoolLink?.schoolName ?? "Not selected"}</strong><small>{schoolLink?.status.replaceAll("_", " ") ?? ""}</small></div>
        <div><span>Invoice</span><strong>{invoice ? `Invoice ${invoice.reference}` : "Not selected"}</strong><small>{invoice ? formatUsdCents(invoice.outstandingAmountMinor) + " · unverified" : ""}</small></div>
        <p className="parent-form-note">This saves a draft connected to the invoice. It is not a credit application decision, offer, approval, or request to disburse money.</p>
      </div>}

      {step === 6 && <div className="inline-empty draft-save-state"><span className="empty-icon"><LockKeyhole size={20}/></span><strong>Your draft is saved as you move through the steps.</strong><p>You can leave now and return later from Applications. The draft keeps its secure reference and remains connected to this invoice.</p></div>}

      {error && <p className="form-message error" role="alert">{error}</p>}
      <div className="parent-form-actions wizard-actions">
        {step > 1 && <Button type="button" className="button button-secondary" onClick={previous} disabled={busy}><ChevronLeft size={16}/>Back</Button>}
        {step < 6 ? <Button type="button" className="button button-primary" onClick={next} disabled={busy}>{busy ? "Saving draft…" : step === 4 ? "Confirm invoice and continue" : "Continue"}<ChevronRight size={16}/></Button> : <Button type="button" className="button button-primary" onClick={finishDraft} disabled={busy}>{busy ? "Saving…" : "Save draft and finish"}<Check size={16}/></Button>}
      </div>
      {reference && <p className="parent-form-note"><LockKeyhole size={14}/> Progress saves to this draft. You can resume it from Applications.</p>}
    </section>
  </div>;
}
