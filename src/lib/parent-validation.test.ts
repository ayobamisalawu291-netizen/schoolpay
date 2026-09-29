import { describe, expect, it } from "vitest";
import { validateInvoiceFile, type InvoiceFile } from "@/lib/invoice-file";
import { formatUsdCents, parseUsdCents } from "@/lib/money";
import { childSchoolSchema, parentBasicsSchema, parentAddressSchema } from "@/lib/parent-validation";

describe("parent profile validation", () => {
  it("accepts U.S. phone numbers and rejects non-U.S. phone assumptions", () => {
    expect(parentBasicsSchema.safeParse({ firstName: "Jordan", middleName: "", lastName: "Lee", phone: "+1 (703) 555-0198" }).success).toBe(true);
    expect(parentBasicsSchema.safeParse({ firstName: "Jordan", middleName: "", lastName: "Lee", phone: "+234 703 555 0198" }).success).toBe(false);
  });

  it("requires a U.S. state and ZIP code", () => {
    const address = { addressLine1: "100 Main Street", addressLine2: "", city: "Richmond", state: "VA", zipCode: "23219", preferredContactMethod: "email", emailUpdates: "true" };
    expect(parentAddressSchema.safeParse(address).success).toBe(true);
    expect(parentAddressSchema.safeParse({ ...address, state: "NG", zipCode: "100001" }).success).toBe(false);
  });
});

describe("school connection consent", () => {
  const connection = {
    childId: "07b03b28-d9b2-4bbf-a1f3-5653c14da7c8",
    schoolId: "f4f8c70c-38ad-4ccb-9644-2d37eb20b1f2",
    branchId: "",
    studentIdentifier: "ST-104",
    shareChildInformation: true
  };

  it("requires explicit consent before sharing child details with a school", () => {
    expect(childSchoolSchema.safeParse(connection).success).toBe(true);
    expect(childSchoolSchema.safeParse({ ...connection, shareChildInformation: false }).success).toBe(false);
  });
});

describe("exact invoice money", () => {
  it("parses and formats cents without floating point arithmetic", () => {
    expect(parseUsdCents("6500.01")).toBe("650001");
    expect(formatUsdCents("650001")).toBe("$6,500.01");
  });

  it("rejects negative, malformed, and unsafe invoice amounts", () => {
    expect(parseUsdCents("-1.00")).toBeNull();
    expect(parseUsdCents("1.999")).toBeNull();
    expect(parseUsdCents("9999999999999999.99")).toBeNull();
  });
});

describe("private invoice file validation", () => {
  const invoiceFile = (name: string, type: string, bytes: Uint8Array): InvoiceFile => ({
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => {
      const copy = new Uint8Array(bytes.byteLength);
      copy.set(bytes);
      return copy.buffer as ArrayBuffer;
    }
  });

  it("accepts a correctly signed PDF with a matching extension and MIME type", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7 test");
    await expect(validateInvoiceFile(invoiceFile("school-fees.pdf", "application/pdf", bytes))).resolves.toEqual({ ok: true, extension: ".pdf" });
  });

  it("rejects mismatched signatures, extensions, and oversized files", async () => {
    const fakePdf = new TextEncoder().encode("not a pdf");
    await expect(validateInvoiceFile(invoiceFile("school-fees.pdf", "application/pdf", fakePdf))).resolves.toMatchObject({ ok: false });
    await expect(validateInvoiceFile(invoiceFile("school-fees.png", "application/pdf", new TextEncoder().encode("%PDF-1.7")))).resolves.toMatchObject({ ok: false });
    await expect(validateInvoiceFile({ ...invoiceFile("large.pdf", "application/pdf", new TextEncoder().encode("%PDF-1.7")), size: 4 * 1024 * 1024 + 1 })).resolves.toMatchObject({ ok: false });
  });
});
