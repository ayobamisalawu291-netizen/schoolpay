"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cancelSchoolRequest, saveChild, saveParentAddress, saveParentBasics, saveParentProfile, submitSchoolRequest, type ParentActionState } from "@/app/actions/parent";
import { Button } from "@/components/ui/button";
import { usStateCodes } from "@/lib/parent-validation";
import type { ParentProfile } from "@/lib/parent-data";

function Message({ state }: { state: ParentActionState }) {
  if (state.error) return <p className="form-message error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-message success" role="status">{state.success}</p>;
  return null;
}

function StateSelect({ defaultValue = "VA" }: { defaultValue?: string }) {
  return <label className="parent-field">State<select name="state" defaultValue={defaultValue} required>{usStateCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select></label>;
}

export function ParentBasicsForm({ profile }: { profile: ParentProfile | null }) {
  const [state, action, pending] = useActionState<ParentActionState, FormData>(saveParentBasics, {});
  return <form action={action} className="parent-form">
    <div className="parent-form-grid">
      <label className="parent-field">First name<input name="firstName" autoComplete="given-name" defaultValue={profile?.first_name ?? ""} required maxLength={80}/></label>
      <label className="parent-field">Middle name <span className="field-optional">Optional</span><input name="middleName" autoComplete="additional-name" defaultValue={profile?.middle_name ?? ""} maxLength={80}/></label>
      <label className="parent-field">Last name<input name="lastName" autoComplete="family-name" defaultValue={profile?.last_name ?? ""} required maxLength={80}/></label>
      <label className="parent-field">Mobile phone<input name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="(555) 123-4567" defaultValue={profile?.phone ?? ""} required/></label>
    </div>
    <Message state={state}/>
    <div className="parent-form-actions"><Button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save and continue"}</Button></div>
  </form>;
}

export function ParentAddressForm({ profile }: { profile: ParentProfile | null }) {
  const [state, action, pending] = useActionState<ParentActionState, FormData>(saveParentAddress, {});
  return <form action={action} className="parent-form">
    <div className="parent-form-grid">
      <label className="parent-field parent-field-wide">Street address<input name="addressLine1" autoComplete="address-line1" defaultValue={profile?.address_line1 ?? ""} required maxLength={160}/></label>
      <label className="parent-field parent-field-wide">Apartment, suite, etc. <span className="field-optional">Optional</span><input name="addressLine2" autoComplete="address-line2" defaultValue={profile?.address_line2 ?? ""} maxLength={160}/></label>
      <label className="parent-field">City<input name="city" autoComplete="address-level2" defaultValue={profile?.city ?? ""} required maxLength={100}/></label>
      <StateSelect defaultValue={profile?.state ?? "VA"}/>
      <label className="parent-field">ZIP code<input name="zipCode" autoComplete="postal-code" inputMode="numeric" defaultValue={profile?.zip_code ?? ""} required pattern="\d{5}(-\d{4})?" maxLength={10}/></label>
      <label className="parent-field">Preferred contact method<select name="preferredContactMethod" defaultValue={profile?.preferred_contact_method ?? "email"} required><option value="email">Email</option><option value="phone">Phone</option></select></label>
      <label className="parent-field parent-field-wide">SchoolPay updates<select name="emailUpdates" defaultValue={String(profile?.email_updates ?? true)}><option value="true">Send me account and school updates by email</option><option value="false">Only send essential account messages</option></select></label>
    </div>
    <Message state={state}/>
    <div className="parent-form-actions"><Link className="button button-secondary" href="/parent/onboarding?step=1">Back</Link><Button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Finish profile"}</Button></div>
    <p className="parent-form-note">We use these details to support your SchoolPay account. No identity, credit, income, or bank verification is performed here.</p>
  </form>;
}

export function ParentProfileForm({ profile }: { profile: ParentProfile }) {
  const [state, action, pending] = useActionState<ParentActionState, FormData>(saveParentProfile, {});
  return <form action={action} className="parent-form">
    <div className="parent-form-grid">
      <label className="parent-field">First name<input name="firstName" autoComplete="given-name" defaultValue={profile.first_name ?? ""} required maxLength={80}/></label>
      <label className="parent-field">Middle name <span className="field-optional">Optional</span><input name="middleName" autoComplete="additional-name" defaultValue={profile.middle_name ?? ""} maxLength={80}/></label>
      <label className="parent-field">Last name<input name="lastName" autoComplete="family-name" defaultValue={profile.last_name ?? ""} required maxLength={80}/></label>
      <label className="parent-field">Mobile phone<input name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} required/></label>
      <label className="parent-field parent-field-wide">Street address<input name="addressLine1" autoComplete="address-line1" defaultValue={profile.address_line1 ?? ""} required maxLength={160}/></label>
      <label className="parent-field parent-field-wide">Apartment, suite, etc. <span className="field-optional">Optional</span><input name="addressLine2" autoComplete="address-line2" defaultValue={profile.address_line2 ?? ""} maxLength={160}/></label>
      <label className="parent-field">City<input name="city" autoComplete="address-level2" defaultValue={profile.city ?? ""} required maxLength={100}/></label>
      <StateSelect defaultValue={profile.state ?? "VA"}/>
      <label className="parent-field">ZIP code<input name="zipCode" autoComplete="postal-code" defaultValue={profile.zip_code ?? ""} required pattern="\d{5}(-\d{4})?" maxLength={10}/></label>
      <label className="parent-field">Preferred contact method<select name="preferredContactMethod" defaultValue={profile.preferred_contact_method ?? "email"}><option value="email">Email</option><option value="phone">Phone</option></select></label>
      <label className="parent-field parent-field-wide">SchoolPay updates<select name="emailUpdates" defaultValue={String(profile.email_updates ?? true)}><option value="true">Send me account and school updates by email</option><option value="false">Only send essential account messages</option></select></label>
    </div>
    <Message state={state}/>
    <div className="parent-form-actions"><Button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button></div>
  </form>;
}

export function ChildForm({ child }: { child?: { id: string; first_name: string; middle_name: string | null; last_name: string; grade: string | null } }) {
  const [state, action, pending] = useActionState<ParentActionState, FormData>(saveChild, {});
  return <form action={action} className="parent-form">
    {child && <input type="hidden" name="childId" value={child.id}/>}
    <div className="parent-form-grid">
      <label className="parent-field">First name<input name="firstName" autoComplete="given-name" defaultValue={child?.first_name ?? ""} required maxLength={80}/></label>
      <label className="parent-field">Middle name <span className="field-optional">Optional</span><input name="middleName" autoComplete="additional-name" defaultValue={child?.middle_name ?? ""} maxLength={80}/></label>
      <label className="parent-field">Last name<input name="lastName" autoComplete="family-name" defaultValue={child?.last_name ?? ""} required maxLength={80}/></label>
      <label className="parent-field">Grade <span className="field-optional">Optional</span><input name="grade" defaultValue={child?.grade ?? ""} placeholder="For example, Grade 4" maxLength={40}/></label>
    </div>
    <p className="parent-form-note">A date of birth is not required to add a child. Child records are private to your account.</p>
    <Message state={state}/>
    <div className="parent-form-actions"><Link className="button button-secondary" href={child ? `/parent/children/${child.id}` : "/parent/children"}>Cancel</Link><Button className="button button-primary" disabled={pending}>{pending ? "Saving…" : child ? "Save child" : "Add child"}</Button></div>
  </form>;
}

export function SchoolRequestForm() {
  const [state, action, pending] = useActionState<ParentActionState, FormData>(submitSchoolRequest, {});
  return <form action={action} className="parent-form">
    <div className="parent-form-grid">
      <label className="parent-field parent-field-wide">School name<input name="schoolName" required minLength={2} maxLength={180}/></label>
      <label className="parent-field parent-field-wide">School website <span className="field-optional">Optional</span><input name="website" type="url" placeholder="https://" maxLength={300}/></label>
      <label className="parent-field parent-field-wide">Street address <span className="field-optional">Optional</span><input name="addressLine1" autoComplete="street-address" maxLength={160}/></label>
      <label className="parent-field">City<input name="city" autoComplete="address-level2" required maxLength={100}/></label>
      <StateSelect/>
      <label className="parent-field">ZIP code<input name="zipCode" autoComplete="postal-code" inputMode="numeric" required pattern="\d{5}(-\d{4})?" maxLength={10}/></label>
      <label className="parent-field">School phone <span className="field-optional">Optional</span><input name="phone" type="tel" maxLength={30}/></label>
      <label className="parent-field parent-field-wide">Your relationship to the school<select name="relationship" defaultValue="parent_guardian"><option value="parent_guardian">Parent or guardian</option><option value="student">Student</option><option value="staff">School staff</option><option value="other">Other</option></select></label>
      <label className="parent-field parent-field-wide">Additional information <span className="field-optional">Optional</span><textarea name="additionalInformation" rows={4} maxLength={2000}/></label>
    </div>
    <p className="parent-form-note">A request does not add a school to the directory or confirm enrollment. SchoolPay will review it separately.</p>
    <Message state={state}/>
    <div className="parent-form-actions"><Link className="button button-secondary" href="/parent/schools">Cancel</Link><Button className="button button-primary" disabled={pending}>{pending ? "Sending…" : "Request a school"}</Button></div>
  </form>;
}

export function CancelSchoolRequestForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<ParentActionState, FormData>(cancelSchoolRequest, {});
  return <form action={action} className="inline-action-form"><input type="hidden" name="requestId" value={requestId}/><Message state={state}/><Button className="button button-secondary button-small" disabled={pending}>{pending ? "Cancelling…" : "Cancel request"}</Button></form>;
}
