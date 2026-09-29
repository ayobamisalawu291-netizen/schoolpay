"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { formString } from "@/lib/parent-validation";
import { academicPeriodSchema, schoolFeeStructureSchema, schoolOnboardingSchema, studentRecordSchema } from "@/lib/school-validation";
import { getSchoolContext } from "@/lib/school-access";
import { parseUsdCents } from "@/lib/money";

export type SchoolActionState = { error?: string; success?: string };

export async function submitSchoolOnboarding(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: "SchoolPay account services are not configured yet." };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;
  if (authError || !user) return { error: "Sign in to submit a school onboarding request." };
  if (!user.email_confirmed_at) return { error: "Verify your email before submitting a school request." };

  const parsed = schoolOnboardingSchema.safeParse({
    schoolName: formString(formData, "schoolName"), website: formString(formData, "website"),
    addressLine1: formString(formData, "addressLine1"), city: formString(formData, "city"),
    state: formString(formData, "state"), zipCode: formString(formData, "zipCode"),
    publicPhone: formString(formData, "publicPhone"), schoolType: formString(formData, "schoolType"),
    gradesServed: formString(formData, "gradesServed"), contactName: formString(formData, "contactName"),
    contactTitle: formString(formData, "contactTitle"), contactEmail: formString(formData, "contactEmail"),
    contactPhone: formString(formData, "contactPhone"), additionalInformation: formString(formData, "additionalInformation")
  });
  if (!parsed.success) return { error: "Check the school details, address, contact information, and grade levels." };

  const value = parsed.data;
  const { error } = await supabase.from("school_onboarding_requests").insert({
    requester_id: user.id, school_name: value.schoolName, website: value.website,
    address_line1: value.addressLine1, city: value.city, state: value.state, zip_code: value.zipCode,
    public_phone: value.publicPhone, school_type: value.schoolType, grades_served: value.gradesServed,
    contact_name: value.contactName, contact_title: value.contactTitle, contact_email: value.contactEmail,
    contact_phone: value.contactPhone, additional_information: value.additionalInformation
  });
  if (error?.code === "23505") return { error: "You already have an active onboarding request for this school and ZIP code." };
  if (error) return { error: "We couldn't submit this request. Please try again later." };
  revalidatePath("/school/onboarding");
  revalidatePath("/admin/schools");
  return { success: "Your request has been submitted for SchoolPay review. The school is not active or listed yet." };
}

export async function addSchoolStudent(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const requestedSchoolId = formString(formData, "schoolId");
  const context = await getSchoolContext(requestedSchoolId);
  if (context.status !== "allowed" || !context.membership) return { error: "Your school account could not be verified." };
  if (!["school_owner", "school_admin"].includes(context.membership.role)) return { error: "Only school owners and administrators can add student records." };
  const parsed = studentRecordSchema.safeParse({
    studentNumber: formString(formData, "studentNumber"), firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"), grade: formString(formData, "grade"),
    branchId: formString(formData, "branchId"), academicPeriodId: formString(formData, "academicPeriodId")
  });
  if (!parsed.success) return { error: "Check the student number, name, grade, and selected school records." };
  const value = parsed.data;
  const { error } = await context.supabase.from("student_records").insert({
    school_id: requestedSchoolId, branch_id: value.branchId, academic_period_id: value.academicPeriodId,
    student_number: value.studentNumber, first_name: value.firstName, last_name: value.lastName,
    grade: value.grade, active: true
  });
  if (error?.code === "23505") return { error: "That student number already exists at this school." };
  if (error) return { error: "We couldn't add the student record. Check the selected academic period and campus." };
  revalidatePath(`/school/students?school=${encodeURIComponent(requestedSchoolId)}`);
  revalidatePath("/school/dashboard");
  return { success: "Student record added to the school's private records." };
}

export async function confirmSchoolChildConnection(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const requestedSchoolId = formString(formData, "schoolId");
  const context = await getSchoolContext(requestedSchoolId);
  if (context.status !== "allowed" || !context.membership || !["school_owner", "school_admin", "school_staff"].includes(context.membership.role)) {
    return { error: "Your school account is not authorized to confirm student connections." };
  }
  const linkId = formString(formData, "linkId");
  const studentRecordId = formString(formData, "studentRecordId");
  if (![linkId, studentRecordId].every((id) => /^[0-9a-f-]{36}$/i.test(id))) return { error: "Choose the matching school record." };
  const { data, error } = await context.supabase.rpc("confirm_school_child_connection", {
    p_link_id: linkId, p_student_record_id: studentRecordId
  });
  if (error) return { error: "We couldn't confirm this request. It may have already been reviewed." };
  revalidatePath("/school/confirmations");
  revalidatePath("/school/dashboard");
  revalidatePath("/parent/school-requests");
  return data === "matched"
    ? { success: "The connection matched an active student record at this school." }
    : { success: "No matching active student record was found. The parent will need to review the details." };
}

export async function addAcademicPeriod(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const schoolId = formString(formData, "schoolId");
  const context = await getSchoolContext(schoolId);
  if (context.status !== "allowed" || !context.membership || !["school_owner", "school_admin"].includes(context.membership.role)) return { error: "Only school owners and administrators can manage academic periods." };
  const parsed = academicPeriodSchema.safeParse({
    name: formString(formData, "name"), periodType: formString(formData, "periodType"),
    academicYear: formString(formData, "academicYear"), startsOn: formString(formData, "startsOn"),
    endsOn: formString(formData, "endsOn"), branchId: formString(formData, "branchId")
  });
  if (!parsed.success) return { error: "Check the period name, type, academic year, and date range." };
  const value = parsed.data;
  const { error } = await context.supabase.from("academic_periods").insert({
    school_id: schoolId, branch_id: value.branchId, name: value.name,
    period_type: value.periodType, academic_year: value.academicYear,
    starts_on: value.startsOn, ends_on: value.endsOn, active: false
  });
  if (error) return { error: "We couldn't add that academic period. Check that the selected campus belongs to this school." };
  revalidatePath("/school/academic-periods");
  revalidatePath("/school/fees");
  return { success: "Academic period added. Activate it when it is ready for use." };
}

export async function setAcademicPeriodActive(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const schoolId = formString(formData, "schoolId");
  const context = await getSchoolContext(schoolId);
  if (context.status !== "allowed" || !context.membership || !["school_owner", "school_admin"].includes(context.membership.role)) return { error: "Only school owners and administrators can change academic periods." };
  const periodId = formString(formData, "periodId");
  const active = formString(formData, "active") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(periodId)) return { error: "Choose a valid academic period." };
  const { data, error } = await context.supabase.from("academic_periods").update({ active }).eq("id", periodId).eq("school_id", schoolId).select("id").maybeSingle();
  if (error || !data) return { error: "We couldn't update that academic period." };
  revalidatePath("/school/academic-periods");
  revalidatePath("/school/fees");
  return { success: active ? "Academic period activated." : "Academic period deactivated." };
}

export async function addSchoolFeeStructure(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const schoolId = formString(formData, "schoolId");
  const context = await getSchoolContext(schoolId);
  if (context.status !== "allowed" || !context.membership || !["school_owner", "school_admin", "school_finance"].includes(context.membership.role)) return { error: "A school finance role is required to manage fee structures." };
  const parsed = schoolFeeStructureSchema.safeParse({
    academicPeriodId: formString(formData, "academicPeriodId"), branchId: formString(formData, "branchId"),
    grade: formString(formData, "grade"), label: formString(formData, "label"), amount: formString(formData, "amount")
  });
  if (!parsed.success) return { error: "Check the academic period, fee name, grade, and amount." };
  const amountMinor = parseUsdCents(parsed.data.amount);
  if (amountMinor === null) return { error: "Enter an exact dollar and cent amount." };
  const { error } = await context.supabase.from("school_fee_structures").insert({
    school_id: schoolId, academic_period_id: parsed.data.academicPeriodId, branch_id: parsed.data.branchId,
    grade: parsed.data.grade, label: parsed.data.label, amount_minor: amountMinor, currency: "USD", active: false
  });
  if (error) return { error: "We couldn't add that fee. Check that its period and campus belong to this school." };
  revalidatePath("/school/fees");
  return { success: "Fee structure added as inactive. Activate it when the school is ready to publish it." };
}

export async function setSchoolFeeActive(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const schoolId = formString(formData, "schoolId");
  const context = await getSchoolContext(schoolId);
  if (context.status !== "allowed" || !context.membership || !["school_owner", "school_admin", "school_finance"].includes(context.membership.role)) return { error: "A school finance role is required to change fee visibility." };
  const feeId = formString(formData, "feeId");
  const active = formString(formData, "active") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(feeId)) return { error: "Choose a valid fee structure." };
  const { data, error } = await context.supabase.from("school_fee_structures").update({ active }).eq("id", feeId).eq("school_id", schoolId).select("id").maybeSingle();
  if (error || !data) return { error: "We couldn't update this fee structure." };
  revalidatePath("/school/fees");
  return { success: active ? "Fee structure activated." : "Fee structure deactivated." };
}

export async function reviewSchoolOnboardingRequest(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Operations access is not configured." };
  const { data: jwtData, error: claimsError } = await supabase.auth.getClaims();
  const userId = jwtData?.claims?.sub;
  if (claimsError || !userId) return { error: "Sign in to review school requests." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!profile || !["operations", "platform_admin", "super_admin"].includes(profile.role)) return { error: "Operations access is required." };
  const requestId = formString(formData, "requestId");
  const decision = formString(formData, "decision");
  if (!/^[0-9a-f-]{36}$/i.test(requestId) || !["reviewing", "information_required", "approved", "rejected"].includes(decision)) {
    return { error: "Choose a valid school request and review status." };
  }
  const { error } = await supabase.rpc("review_school_onboarding_request", {
    p_request_id: requestId, p_decision: decision, p_review_note: formString(formData, "reviewNote")
  });
  if (error) return { error: "We couldn't update this request. Check for a duplicate school or an invalid status change." };
  revalidatePath("/admin/schools");
  revalidatePath("/school/dashboard");
  return { success: "School onboarding request updated." };
}
