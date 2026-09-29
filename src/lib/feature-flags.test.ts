import { describe, expect, it } from "vitest";
import { readLocalFeatureFlags } from "@/lib/feature-flags";

describe("financial feature flags", () => {
  it("defaults every execution capability to off", () => {
    const flags = readLocalFeatureFlags({});
    expect(Object.values(flags).every((enabled) => enabled === false)).toBe(true);
  });

  it("does not mistake the string false for an enabled switch", () => {
    const flags = readLocalFeatureFlags({ DISBURSEMENT_ENABLED: "false", REPAYMENTS_ENABLED: "0" });
    expect(flags.disbursement_enabled).toBe(false);
    expect(flags.repayments_enabled).toBe(false);
  });

  it("recognizes only explicit true values", () => {
    const flags = readLocalFeatureFlags({ SCHOOLPAY_ENABLED: "true", APPLICATIONS_ENABLED: "1" });
    expect(flags.schoolpay_enabled).toBe(true);
    expect(flags.applications_enabled).toBe(true);
    expect(flags.offers_enabled).toBe(false);
  });
});
