"use client";

import { useActionState } from "react";
import { connectChildToSchool, type ParentActionState } from "@/app/actions/parent";
import { Button } from "@/components/ui/button";

type SchoolOption = { id: string; name: string; city: string | null; state: string | null };

export function ConnectSchoolForm({ childId, schools }: { childId: string; schools: SchoolOption[] }) {
  const [state, action, pending] = useActionState<ParentActionState, FormData>(connectChildToSchool, {});
  if (!schools.length) return <div className="inline-empty"><strong>No participating schools found.</strong><p>Request your child's school and track its review status.</p></div>;
  return <form action={action} className="parent-form compact-form">
    <input type="hidden" name="childId" value={childId}/>
    <label className="parent-field">Participating school<select name="schoolId" required defaultValue=""><option value="" disabled>Choose a school</option>{schools.map((school) => <option key={school.id} value={school.id}>{school.name} · {[school.city, school.state].filter(Boolean).join(", ")}</option>)}</select></label>
    <label className="parent-field">Student number <span className="field-optional">Optional</span><input name="studentIdentifier" maxLength={80} autoComplete="off"/><small>Only shared with the selected school for this confirmation request.</small></label>
    <label className="school-consent"><input type="checkbox" name="shareChildInformation" required/><span>I authorize SchoolPay to share my child's name and grade, plus the student number above if provided, with this school so it can confirm the connection.</span></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <Button className="button button-primary" disabled={pending}>{pending ? "Sending…" : "Request school connection"}</Button>
    <p className="parent-form-note">Your school selection does not prove enrollment. The school must match the details to an active student record before the connection is confirmed.</p>
  </form>;
}
