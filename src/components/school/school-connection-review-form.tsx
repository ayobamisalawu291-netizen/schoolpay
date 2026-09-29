"use client";

import { useActionState } from "react";
import { confirmSchoolChildConnection, type SchoolActionState } from "@/app/actions/school";
import { Button } from "@/components/ui/button";

type StudentOption = { id: string; student_number: string; first_name: string; last_name: string; grade: string | null };

export function SchoolConnectionReviewForm({ linkId, schoolId, students }: { linkId: string; schoolId: string; students: StudentOption[] }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(confirmSchoolChildConnection, {});
  if (!students.length) return <p className="parent-form-note">Add the student to the school's private records before confirming this request.</p>;
  return <form action={action} className="school-connection-form">
    <input type="hidden" name="linkId" value={linkId}/><input type="hidden" name="schoolId" value={schoolId}/>
    <label className="parent-field">Match to a student record<select name="studentRecordId" required defaultValue=""><option value="" disabled>Choose an active student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.student_number} · {student.first_name} {student.last_name}{student.grade ? ` · ${student.grade}` : ""}</option>)}</select></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <p className="parent-form-note">SchoolPay compares the parent's consented details to the record at this school. A mismatch stays unconfirmed.</p>
    <Button className="button button-primary" disabled={pending}>{pending ? "Checking…" : "Confirm this connection"}</Button>
  </form>;
}
