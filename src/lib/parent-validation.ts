import { z } from "zod";
import { parseUsdCents } from "@/lib/money";

export const usStateCodes = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
] as const;

const stateCode = z.enum(usStateCodes);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const usPhone = z.string().trim().regex(/^(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}$/, "Enter a U.S. phone number with area code.");

export const parentBasicsSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  middleName: optionalText(80),
  lastName: z.string().trim().min(1).max(80),
  phone: usPhone
});

export const parentAddressSchema = z.object({
  addressLine1: z.string().trim().min(3).max(160),
  addressLine2: optionalText(160),
  city: z.string().trim().min(2).max(100),
  state: stateCode,
  zipCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  preferredContactMethod: z.enum(["email", "phone"]),
  emailUpdates: z.enum(["true", "false"])
});

export const childSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  middleName: optionalText(80),
  lastName: z.string().trim().min(1).max(80),
  grade: optionalText(40)
});

export const schoolRequestSchema = z.object({
  schoolName: z.string().trim().min(2).max(180),
  website: z.string().trim().max(300).optional().transform((value) => value || null).pipe(z.union([
    z.null(),
    z.string().url().refine((value) => /^https?:\/\//i.test(value), "Use an http or https website address.")
  ])),
  addressLine1: optionalText(160),
  city: z.string().trim().min(2).max(100),
  state: stateCode,
  zipCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  phone: z.string().trim().max(30).optional().transform((value) => value || null),
  relationship: z.enum(["parent_guardian", "student", "staff", "other"]),
  additionalInformation: optionalText(2000)
});

export const childSchoolSchema = z.object({
  childId: z.string().uuid(),
  schoolId: z.string().uuid(),
  branchId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
  studentIdentifier: optionalText(80),
  shareChildInformation: z.literal(true)
});

export const invoiceSubmissionSchema = z.object({
  childId: z.string().uuid(),
  schoolId: z.string().uuid(),
  childSchoolLinkId: z.string().uuid(),
  academicPeriodId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
  invoiceReference: z.string().trim().min(1).max(100),
  issueDate: z.string().optional().transform((value) => value || null).pipe(z.union([z.null(), z.iso.date()])),
  dueDate: z.string().optional().transform((value) => value || null).pipe(z.union([z.null(), z.iso.date()])),
  originalAmount: z.string().trim().min(1).max(20),
  amountPaid: z.string().trim().min(1).max(20)
}).superRefine((value, ctx) => {
  const original = parseUsdCents(value.originalAmount);
  const paid = parseUsdCents(value.amountPaid);
  if (original === null || BigInt(original) <= 0n) ctx.addIssue({ code: "custom", path: ["originalAmount"], message: "Enter the invoice total in dollars and cents." });
  if (paid === null) ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "Enter the amount already paid in dollars and cents." });
  if (original !== null && paid !== null && BigInt(paid) > BigInt(original)) ctx.addIssue({ code: "custom", path: ["amountPaid"], message: "Amount paid cannot be greater than the invoice total." });
});

export const applicationStepSchema = z.object({
  reference: z.string().regex(/^SP-APP-[A-F0-9]{32}$/),
  step: z.coerce.number().int().min(1).max(6)
});

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
