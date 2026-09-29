"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { addAcademicPeriod, addSchoolFeeStructure, setAcademicPeriodActive, setSchoolFeeActive, type SchoolActionState } from "@/app/actions/school";

type Option = { id: string; name: string };
type PeriodOption = Option & { academic_year: string; active: boolean };

function Feedback({ state }: { state: SchoolActionState }) {
  if (state.error) return <p className="form-message error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-message success" role="status">{state.success}</p>;
  return null;
}

export function AcademicPeriodForm({ schoolId, branches }: { schoolId: string; branches: Option[] }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(addAcademicPeriod, {});
  return <form action={action} className="parent-form compact-form">
    <input type="hidden" name="schoolId" value={schoolId}/>
    <div className="parent-form-grid">
      <label className="parent-field">Period name<input name="name" required maxLength={120} placeholder="2026–2027 academic year"/></label>
      <label className="parent-field">Period type<select name="periodType" defaultValue="academic_year"><option value="academic_year">Academic year</option><option value="semester">Semester</option><option value="trimester">Trimester</option><option value="quarter">Quarter</option><option value="term">Term</option><option value="other">Other</option></select></label>
      <label className="parent-field">Academic year<input name="academicYear" required pattern="\d{4}(-\d{2,4})?" placeholder="2026-27" maxLength={9}/></label>
      <label className="parent-field">Campus <span className="field-optional">Optional</span><select name="branchId" defaultValue=""><option value="">School-wide</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label className="parent-field">Start date<input type="date" name="startsOn"/></label>
      <label className="parent-field">End date<input type="date" name="endsOn"/></label>
    </div>
    <Feedback state={state}/>
    <div className="parent-form-actions"><Button className="button button-primary" disabled={pending}>{pending ? "Saving…" : "Add academic period"}</Button></div>
  </form>;
}

export function AcademicPeriodStatusForm({ schoolId, periodId, active }: { schoolId: string; periodId: string; active: boolean }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(setAcademicPeriodActive, {});
  return <form action={action} className="school-toggle-form">
    <input type="hidden" name="schoolId" value={schoolId}/><input type="hidden" name="periodId" value={periodId}/><input type="hidden" name="active" value={String(!active)}/>
    <Feedback state={state}/><Button className="button button-secondary button-small" disabled={pending}>{pending ? "Saving…" : active ? "Deactivate" : "Activate period"}</Button>
  </form>;
}

export function SchoolFeeStructureForm({ schoolId, branches, periods }: { schoolId: string; branches: Option[]; periods: PeriodOption[] }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(addSchoolFeeStructure, {});
  return <form action={action} className="parent-form compact-form">
    <input type="hidden" name="schoolId" value={schoolId}/>
    <div className="parent-form-grid">
      <label className="parent-field parent-field-wide">Academic period<select name="academicPeriodId" required defaultValue=""><option value="" disabled>Choose a period</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name} · {period.academic_year}{period.active ? " · active" : ""}</option>)}</select></label>
      <label className="parent-field">Fee name<input name="label" required maxLength={160} placeholder="Tuition"/></label>
      <label className="parent-field">Grade <span className="field-optional">Optional</span><input name="grade" maxLength={40}/></label>
      <label className="parent-field">Amount (USD)<input name="amount" required inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="6500.00"/></label>
      <label className="parent-field">Campus <span className="field-optional">Optional</span><select name="branchId" defaultValue=""><option value="">School-wide</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
    </div>
    <Feedback state={state}/>
    <p className="parent-form-note">New fees are inactive. Fee structures are published to parents only when the school is active and the fee is explicitly activated.</p>
    <div className="parent-form-actions"><Button className="button button-primary" disabled={pending || !periods.length}>{pending ? "Saving…" : "Add fee structure"}</Button></div>
  </form>;
}

export function SchoolFeeStatusForm({ schoolId, feeId, active }: { schoolId: string; feeId: string; active: boolean }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(setSchoolFeeActive, {});
  return <form action={action} className="school-toggle-form">
    <input type="hidden" name="schoolId" value={schoolId}/><input type="hidden" name="feeId" value={feeId}/><input type="hidden" name="active" value={String(!active)}/>
    <Feedback state={state}/><Button className="button button-secondary button-small" disabled={pending}>{pending ? "Saving…" : active ? "Deactivate fee" : "Activate fee"}</Button>
  </form>;
}
