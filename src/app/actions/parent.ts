"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getParentContext } from "@/lib/parent-data";
import {
  applicationStepSchema,
  childSchema,
  childSchoolSchema,
  formString,
  parentAddressSchema,
  parentBasicsSchema,
  schoolRequestSchema
} from "@/lib/parent-validation";

export type ParentActionState = { error?: string; success?: string };

type WritableParent = Extract<Awaited<ReturnType<typeof getParentContext>>, { status: "allowed" }>;

async function writableParent(requireComplete = true): Promise<WritableParent | null> {
  const context = await getParentContext();
  return context.status === "allowed" && (!requireComplete || context.profileComplete) ? context : null;
}

export async function saveParentBasics(_state: ParentActionState, formData: FormData): Promise<ParentActionState> {
  const context = await writableParent(false);
  if (!context) return { error: "Your account could not be verified. Please sign in again." };
  const parsed = parentBasicsSchema.safeParse({
    firstName: formString(formData, "firstName"), middleName: formString(formData, "middleName"),
    lastName: formString(formData, "lastName"), phone: formString(formData, "phone")
  });
  if (!parsed.success) return { error: "Check your name and enter a valid U.S. phone number." };

  const value = parsed.data;
  const profileFields = {
    first_name: value.firstName,
    middle_name: value.middleName,
    last_name: value.lastName,
    phone: value.phone,
    onboarding_step: 1
  };
  const { data: current, error: readError } = await context.supabase.from("parent_profiles").select("user_id").eq("user_id", context.userId).maybeSingle();
  if (readError) return { error: "We couldn't save your information. Please try again." };

  const result = current
    ? await context.supabase.from("parent_profiles").update(profileFields).eq("user_id", context.userId)
    : await context.supabase.from("parent_profiles").insert({ user_id: context.userId, ...profileFields });
  if (result.error) return { error: "We couldn't save your information. Please try again." };

  const { error: profileError } = await context.supabase.from("profiles").update({ display_name: [value.firstName, value.lastName].join(" "), phone: value.phone }).eq("id", context.userId);
  if (profileError) return { error: "Your details were saved, but account details could not be refreshed. Please try again." };
  revalidatePath("/parent/onboarding");
  redirect("/parent/onboarding?step=2");
}

export async function saveParentAddress(_state: ParentActionState, formData: FormData): Promise<ParentActionState> {
  const context = await writableParent(false);
  if (!context) return { error: "Your account could not be verified. Please sign in again." };
  const parsed = parentAddressSchema.safeParse({
    addressLine1: formString(formData, "addressLine1"), addressLine2: formString(formData, "addressLine2"),
    city: formString(formData, "city"), state: formString(formData, "state"), zipCode: formString(formData, "zipCode"),
    preferredContactMethod: formString(formData, "preferredContactMethod"), emailUpdates: formString(formData, "emailUpdates")
  });
  if (!parsed.success) return { error: "Check your address, state, ZIP code, and contact preference." };

  const { data: current, error: readError } = await context.supabase.from("parent_profiles").select("user_id").eq("user_id", context.userId).maybeSingle();
  if (readError || !current) return { error: "Save your name and phone number before continuing." };
  const value = parsed.data;
  const { error } = await context.supabase.from("parent_profiles").update({
    address_line1: value.addressLine1,
    address_line2: value.addressLine2,
    city: value.city,
    state: value.state,
    zip_code: value.zipCode,
    preferred_contact_method: value.preferredContactMethod,
    email_updates: value.emailUpdates === "true",
    onboarding_step: 2,
    onboarding_completed_at: new Date().toISOString()
  }).eq("user_id", context.userId);
  if (error) return { error: "We couldn't save your address. Please try again." };

  revalidatePath("/parent");
  redirect("/parent/dashboard");
}

export async function saveParentProfile(_state: ParentActionState, formData: FormData): Promise<ParentActionState> {
  const context = await writableParent();
  if (!context) return { error: "Your account could not be verified. Please sign in again." };
  const basics = parentBasicsSchema.safeParse({
    firstName: formString(formData, "firstName"), middleName: formString(formData, "middleName"),
    lastName: formString(formData, "lastName"), phone: formString(formData, "phone")
  });
  const address = parentAddressSchema.safeParse({
    addressLine1: formString(formData, "addressLine1"), addressLine2: formString(formData, "addressLine2"),
    city: formString(formData, "city"), state: formString(formData, "state"), zipCode: formString(formData, "zipCode"),
    preferredContactMethod: formString(formData, "preferredContactMethod"), emailUpdates: formString(formData, "emailUpdates")
  });
  if (!basics.success || !address.success) return { error: "Check the highlighted profile information and try again." };

  const b = basics.data;
  const a = address.data;
  const { error: parentError } = await context.supabase.from("parent_profiles").update({
    first_name: b.firstName, middle_name: b.middleName, last_name: b.lastName, phone: b.phone,
    address_line1: a.addressLine1, address_line2: a.addressLine2, city: a.city, state: a.state,
    zip_code: a.zipCode, preferred_contact_method: a.preferredContactMethod,
    email_updates: a.emailUpdates === "true", onboarding_step: 2, onboarding_completed_at: new Date().toISOString()
  }).eq("user_id", context.userId);
  if (parentError) return { error: "We couldn't update your profile. Please try again." };

  const { error: profileError } = await context.supabase.from("profiles").update({ display_name: [b.firstName, b.lastName].join(" "), phone: b.phone }).eq("id", context.userId);
  if (profileError) return { error: "Your profile was saved, but account details could not be refreshed. Please try again." };
  revalidatePath("/parent");
  return { success: "Your profile has been updated." };
}

export async function saveChild(_state: ParentActionState, formData: FormData): Promise<ParentActionState> {
  const context = await writableParent();
  if (!context) return { error: "Complete your parent profile before adding a child." };
  const parsed = childSchema.safeParse({
    firstName: formString(formData, "firstName"), middleName: formString(formData, "middleName"),
    lastName: formString(formData, "lastName"), grade: formString(formData, "grade")
  });
  if (!parsed.success) return { error: "Enter the child's first and last name, and check the grade." };

  const childId = formString(formData, "childId");
  const childFields = { first_name: parsed.data.firstName, middle_name: parsed.data.middleName, last_name: parsed.data.lastName, grade: parsed.data.grade };
  if (childId) {
    if (!/^[0-9a-f-]{36}$/i.test(childId)) return { error: "That child record could not be found." };
    const { data, error } = await context.supabase.from("children").update(childFields).eq("id", childId).eq("parent_id", context.userId).is("archived_at", null).select("id").maybeSingle();
    if (error || !data) return { error: "We couldn't update that child. Check that the record belongs to your account." };
    revalidatePath("/parent/children");
    revalidatePath(`/parent/children/${childId}`);
    return { success: "Child information updated." };
  }

  const { data, error } = await context.supabase.from("children").insert({ parent_id: context.userId, ...childFields }).select("id").single();
  if (error || !data) return { error: "We couldn't add this child. Please try again." };
  revalidatePath("/parent");
  return { success: "Child added to your account." };
}

export async function connectChildToSchool(_state: ParentActionState, formData: FormData): Promise<ParentActionState> {
  const context = await writableParent();
  if (!context) return { error: "Complete your parent profile before connecting a school." };
  const parsed = childSchoolSchema.safeParse({ childId: formString(formData, "childId"), schoolId: formString(formData, "schoolId"), branchId: formString(formData, "branchId"), studentIdentifier: formString(formData, "studentIdentifier"), shareChildInformation: formData.get("shareChildInformation") === "on" });
  if (!parsed.success) return { error: "Choose a child and participating school, and authorize sharing the details needed for school confirmation." };

  const { data: child } = await context.supabase.from("children").select("id").eq("id", parsed.data.childId).eq("parent_id", context.userId).is("archived_at", null).maybeSingle();
  if (!child) return { error: "That child record could not be found." };
  const { data: school } = await context.supabase.from("schools").select("id").eq("id", parsed.data.schoolId).eq("status", "active").eq("directory_visible", true).maybeSingle();
  if (!school) return { error: "Choose a currently participating school." };
  if (parsed.data.branchId) {
    const { data: branch } = await context.supabase.from("school_branches").select("id").eq("id", parsed.data.branchId).eq("school_id", school.id).maybeSingle();
    if (!branch) return { error: "Choose a campus belonging to that school." };
  }

  const { error } = await context.supabase.rpc("create_parent_child_school_link", {
    p_child_id: child.id, p_school_id: school.id, p_branch_id: parsed.data.branchId,
    p_student_identifier: parsed.data.studentIdentifier, p_share_child_information: parsed.data.shareChildInformation
  });
  if (error?.code === "23505") return { error: "This child already has an active connection request for that school." };
  if (error) return { error: "We couldn't send the school connection request. Please try again." };
  revalidatePath(`/parent/children/${child.id}`);
  revalidatePath("/parent/school-fees");
  return { success: "School selected. Attendance still requires confirmation from the school." };
}

export async function submitSchoolRequest(_state: ParentActionState, formData: FormData): Promise<ParentActionState> {
  const context = await writableParent();
  if (!context) return { error: "Complete your parent profile before requesting a school." };
  const parsed = schoolRequestSchema.safeParse({
    schoolName: formString(formData, "schoolName"), website: formString(formData, "website"),
    addressLine1: formString(formData, "addressLine1"), city: formString(formData, "city"),
    state: formString(formData, "state"), zipCode: formString(formData, "zipCode"),
    phone: formString(formData, "phone"), relationship: formString(formData, "relationship"),
    additionalInformation: formString(formData, "additionalInformation")
  });
  if (!parsed.success) return { error: "Check the school name, city, state, ZIP code, and website." };

  const value = parsed.data;
  const { data, error } = await context.supabase.from("school_requests").insert({
    parent_id: context.userId, school_name: value.schoolName, website: value.website,
    address_line1: value.addressLine1, city: value.city, state: value.state, zip_code: value.zipCode,
    phone: value.phone, relationship: value.relationship, additional_information: value.additionalInformation
  }).select("id").maybeSingle();
  if (error?.code === "23505") return { error: "You already have an active request for this school and ZIP code." };
  if (error || !data) return { error: "We couldn't submit the school request. Please try again." };
  revalidatePath("/parent/school-requests");
  return { success: "School request submitted. It has not been verified or added to the directory." };
}

export async function createApplicationDraft(invoiceId: string): Promise<{ error?: string; reference?: string }> {
  const context = await writableParent();
  if (!context) return { error: "Complete your parent profile before starting an application." };
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return { error: "Choose an invoice linked to your account." };

  const { data, error } = await context.supabase.rpc("create_parent_application_draft", { p_invoice_id: invoiceId });
  const draft = data?.[0];
  if (error || !draft) return { error: "We couldn't start this draft. Check the invoice and try again." };
  if (draft.application_status !== "draft") return { error: "This invoice already has an application in progress and cannot start another draft." };
  revalidatePath("/parent/applications");
  revalidatePath("/parent/dashboard");
  return { reference: draft.public_reference };
}

export async function saveApplicationStep(reference: string, step: number): Promise<{ error?: string }> {
  const context = await writableParent();
  if (!context) return { error: "Your account could not be verified. Please sign in again." };
  const parsed = applicationStepSchema.safeParse({ reference, step });
  if (!parsed.success) return { error: "We couldn't save this application step." };
  const { data, error } = await context.supabase.from("financing_applications").update({ current_step: parsed.data.step }).eq("public_reference", parsed.data.reference).eq("parent_id", context.userId).eq("status", "draft").select("id").maybeSingle();
  if (error || !data) return { error: "We couldn't save this application step. Refresh and try again." };
  revalidatePath(`/parent/applications/${parsed.data.reference}`);
  return {};
}

export async function cancelSchoolRequest(_state: ParentActionState, formData: FormData): Promise<ParentActionState> {
  const context = await writableParent();
  if (!context) return { error: "Your account could not be verified. Please sign in again." };
  const requestId = formString(formData, "requestId");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return { error: "That school request could not be found." };
  const { data, error } = await context.supabase.from("school_requests").update({ status: "cancelled" }).eq("id", requestId).eq("parent_id", context.userId).eq("status", "submitted").select("id").maybeSingle();
  if (error || !data) return { error: "That request can no longer be cancelled." };
  revalidatePath("/parent/school-requests");
  return { success: "School request cancelled." };
}
