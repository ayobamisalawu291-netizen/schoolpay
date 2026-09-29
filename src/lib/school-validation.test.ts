import { describe, expect, it } from "vitest";
import { parseUsdCents } from "@/lib/money";
import { academicPeriodSchema, schoolFeeStructureSchema, schoolOnboardingSchema, studentRecordSchema } from "@/lib/school-validation";

const onboarding = {
  schoolName: "Riverdale Academy", website: "https://riverdale.example", addressLine1: "100 Main Street",
  city: "Richmond", state: "VA", zipCode: "23219", publicPhone: "(804) 555-0100", schoolType: "private",
  gradesServed: "Pre-K, K, Grade 1", contactName: "Jordan Lee", contactTitle: "Principal",
  contactEmail: "principal@riverdale.example", contactPhone: "+1 (804) 555-0100", additionalInformation: ""
};

describe("school onboarding validation", () => {
  it("accepts a complete U.S. school request and normalizes grade levels", () => {
    const parsed = schoolOnboardingSchema.safeParse(onboarding);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.gradesServed).toEqual(["Pre-K", "K", "Grade 1"]);
  });

  it("requires a two-letter state, U.S. ZIP, and secure school website", () => {
    expect(schoolOnboardingSchema.safeParse({ ...onboarding, website: "http://riverdale.example" }).success).toBe(false);
    expect(schoolOnboardingSchema.safeParse({ ...onboarding, state: "NG" }).success).toBe(false);
    expect(schoolOnboardingSchema.safeParse({ ...onboarding, zipCode: "100001" }).success).toBe(false);
  });
});

describe("school records", () => {
  it("rejects an academic period whose end precedes its start", () => {
    expect(academicPeriodSchema.safeParse({
      name: "Spring Term", periodType: "term", academicYear: "2026-27",
      startsOn: "2027-04-01", endsOn: "2027-03-31", branchId: ""
    }).success).toBe(false);
  });

  it("accepts tuition structures in exact minor units", () => {
    expect(schoolFeeStructureSchema.safeParse({
      academicPeriodId: "d31dc799-2dd9-48c6-94d9-50e1f57f8638", branchId: "", grade: "Grade 4",
      label: "Tuition", amount: "6500.01"
    }).success).toBe(true);
    expect(parseUsdCents("6500.01")).toBe("650001");
  });

  it("requires a school student number and real child name", () => {
    expect(studentRecordSchema.safeParse({ studentNumber: "ST-104", firstName: "Sam", lastName: "Lee", grade: "Grade 4", branchId: "", academicPeriodId: "" }).success).toBe(true);
    expect(studentRecordSchema.safeParse({ studentNumber: "", firstName: "Sam", lastName: "", grade: "", branchId: "", academicPeriodId: "" }).success).toBe(false);
  });
});
