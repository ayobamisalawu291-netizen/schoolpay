"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitSchoolOnboarding, type SchoolActionState } from "@/app/actions/school";
import { Button } from "@/components/ui/button";
import { usStateCodes } from "@/lib/parent-validation";

export function SchoolOnboardingForm({ email = "" }: { email?: string }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(submitSchoolOnboarding, {});
  return <form action={action} className="parent-form">
    <div className="parent-form-grid">
      <label className="parent-field parent-field-wide">School name<input name="schoolName" required minLength={2} maxLength={180} autoComplete="organization"/></label>
      <label className="parent-field parent-field-wide">School website<input name="website" type="url" placeholder="https://school.edu" maxLength={300}/></label>
      <label className="parent-field parent-field-wide">Street address<input name="addressLine1" required maxLength={160} autoComplete="street-address"/></label>
      <label className="parent-field">City<input name="city" required maxLength={100} autoComplete="address-level2"/></label>
      <label className="parent-field">State<select name="state" defaultValue="VA" required>{usStateCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>
      <label className="parent-field">ZIP code<input name="zipCode" required inputMode="numeric" pattern="\d{5}(-\d{4})?" maxLength={10} autoComplete="postal-code"/></label>
      <label className="parent-field">Public school phone<input name="publicPhone" type="tel" maxLength={30} autoComplete="tel"/></label>
      <label className="parent-field">School type<select name="schoolType" defaultValue="private" required><option value="public">Public</option><option value="private">Private</option><option value="charter">Charter</option><option value="other">Other</option></select></label>
      <label className="parent-field parent-field-wide">Grades served <span className="field-optional">Optional, comma separated</span><input name="gradesServed" placeholder="Pre-K, K, Grade 1, Grade 2" maxLength={400}/></label>
      <label className="parent-field">Your name<input name="contactName" required minLength={2} maxLength={120} autoComplete="name"/></label>
      <label className="parent-field">Your school title<input name="contactTitle" required minLength={2} maxLength={100} placeholder="Principal, finance director"/></label>
      <label className="parent-field">Contact email<input name="contactEmail" type="email" required maxLength={254} defaultValue={email}/></label>
      <label className="parent-field">Contact phone<input name="contactPhone" type="tel" required inputMode="tel" maxLength={30} placeholder="(555) 123-4567"/></label>
      <label className="parent-field parent-field-wide">Anything else we should know? <span className="field-optional">Optional</span><textarea name="additionalInformation" rows={4} maxLength={2000}/></label>
    </div>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <p className="parent-form-note">Submitting starts a review only. It does not activate the school, publish it in the directory, verify its records, or approve payments.</p>
    <div className="parent-form-actions"><Link className="button button-secondary" href="/for-schools">Back to school information</Link><Button className="button button-primary" disabled={pending}>{pending ? "Submitting…" : "Submit school request"}</Button></div>
  </form>;
}
