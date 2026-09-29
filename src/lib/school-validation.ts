import { z } from "zod";
import { usStateCodes } from "@/lib/parent-validation";
import { parseUsdCents } from "@/lib/money";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || null);
const usPhone = z.string().trim().regex(/^(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}$/);

export const schoolOnboardingSchema = z.object({
  schoolName: z.string().trim().min(2).max(180),
  website: z.string().trim().max(300).optional().transform((value) => value || null).pipe(z.union([
    z.null(),
    z.string().url().refine((value) => value.startsWith("https://"), "Enter a secure https school website.")
  ])),
  addressLine1: z.string().trim().min(3).max(160),
  city: z.string().trim().min(2).max(100),
  state: z.enum(usStateCodes),
  zipCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  publicPhone: optionalText(30),
  schoolType: z.enum(["public", "private", "charter", "other"]),
  gradesServed: z.string().trim().max(400).transform((value) => [...new Set(value.split(",").map((grade) => grade.trim()).filter(Boolean))]).pipe(z.array(z.string().min(1).max(40)).max(20)),
  contactName: z.string().trim().min(2).max(120),
  contactTitle: z.string().trim().min(2).max(100),
  contactEmail: z.string().trim().email().max(254),
  contactPhone: usPhone,
  additionalInformation: optionalText(2000)
});

export const studentRecordSchema = z.object({
  studentNumber: z.string().trim().min(1).max(80),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  grade: optionalText(40),
  branchId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
  academicPeriodId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null)
});

export const academicPeriodSchema = z.object({
  name: z.string().trim().min(1).max(120),
  periodType: z.enum(["academic_year", "semester", "trimester", "quarter", "term", "other"]),
  academicYear: z.string().trim().regex(/^\d{4}(?:-\d{2,4})?$/),
  startsOn: z.string().optional().transform((value) => value || null).pipe(z.union([z.null(), z.iso.date()])),
  endsOn: z.string().optional().transform((value) => value || null).pipe(z.union([z.null(), z.iso.date()])),
  branchId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null)
}).superRefine((value, ctx) => {
  if (value.startsOn && value.endsOn && value.startsOn > value.endsOn) {
    ctx.addIssue({ code: "custom", path: ["endsOn"], message: "End date must be after the start date." });
  }
});

export const schoolFeeStructureSchema = z.object({
  academicPeriodId: z.string().uuid(),
  branchId: z.string().uuid().optional().or(z.literal("")).transform((value) => value || null),
  grade: optionalText(40),
  label: z.string().trim().min(1).max(160),
  amount: z.string().trim().min(1).max(20)
}).superRefine((value, ctx) => {
  const amount = parseUsdCents(value.amount);
  if (amount === null) ctx.addIssue({ code: "custom", path: ["amount"], message: "Enter an amount in dollars and cents." });
});
