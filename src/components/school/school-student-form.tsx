"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addSchoolStudent, type SchoolActionState } from "@/app/actions/school";
import { Button } from "@/components/ui/button";

type Option = { id: string; name: string };
export function SchoolStudentForm({ schoolId, branches, periods }: { schoolId: string; branches: Option[]; periods: (Option & { label: string })[] }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(addSchoolStudent, {});
  const back = `/school/students?school=${encodeURIComponent(schoolId)}`;
  return <form action={action} className="parent-form">
    <input type="hidden" name="schoolId" value={schoolId}/>
    <div className="parent-form-grid">
      <label className="parent-field">Student number<input name="studentNumber" required maxLength={80} autoComplete="off"/></label>
      <label className="parent-field">Grade <span className="field-optional">Optional</span><input name="grade" maxLength={40}/></label>
      <label className="parent-field">First name<input name="firstName" required maxLength={80} autoComplete="given-name"/></label>
      <label className="parent-field">Last name<input name="lastName" required maxLength={80} autoComplete="family-name"/></label>
      <label className="parent-field">Campus <span className="field-optional">Optional</span><select name="branchId" defaultValue=""><option value="">Main school</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label className="parent-field">Academic period <span className="field-optional">Optional</span><select name="academicPeriodId" defaultValue=""><option value="">No period selected</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}</select></label>
    </div>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <div className="parent-form-actions"><Link className="button button-secondary" href={back}>Cancel</Link><Button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Save student record"}</Button></div>
  </form>;
}
