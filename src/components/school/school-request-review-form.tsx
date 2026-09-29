"use client";

import { useActionState } from "react";
import { reviewSchoolOnboardingRequest, type SchoolActionState } from "@/app/actions/school";
import { Button } from "@/components/ui/button";

export function SchoolRequestReviewForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<SchoolActionState, FormData>(reviewSchoolOnboardingRequest, {});
  return <form action={action} className="school-review-form">
    <input type="hidden" name="requestId" value={requestId}/>
    <label className="parent-field">Review note<textarea name="reviewNote" rows={2} maxLength={2000}/></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    {state.success && <p className="form-message success" role="status">{state.success}</p>}
    <div className="parent-form-actions">
      <Button className="button button-secondary" name="decision" value="reviewing" disabled={pending}>Mark reviewing</Button>
      <Button className="button button-secondary" name="decision" value="information_required" disabled={pending}>Request information</Button>
      <Button className="button button-secondary" name="decision" value="rejected" disabled={pending}>Decline</Button>
      <Button className="button button-primary" name="decision" value="approved" disabled={pending}>{pending ? "Saving…" : "Approve school onboarding"}</Button>
    </div>
  </form>;
}
