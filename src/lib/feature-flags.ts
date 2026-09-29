import { z } from "zod";

const flag = z.preprocess((value) => value === true || value === "true" || value === "1", z.boolean());
const flagsSchema = z.object({
  schoolpay_enabled: flag.default(false),
  applications_enabled: flag.default(false),
  identity_verification_enabled: flag.default(false),
  underwriting_enabled: flag.default(false),
  offers_enabled: flag.default(false),
  agreements_enabled: flag.default(false),
  disbursement_enabled: flag.default(false),
  repayments_enabled: flag.default(false),
  refunds_enabled: flag.default(false)
});

export type FeatureFlags = z.infer<typeof flagsSchema>;

/** A fail-closed local configuration parser. Operational state belongs in the database in production. */
export function readLocalFeatureFlags(env: Record<string, string | undefined> = process.env): FeatureFlags {
  return flagsSchema.parse({
    schoolpay_enabled: env.SCHOOLPAY_ENABLED,
    applications_enabled: env.APPLICATIONS_ENABLED,
    identity_verification_enabled: env.IDENTITY_VERIFICATION_ENABLED,
    underwriting_enabled: env.UNDERWRITING_ENABLED,
    offers_enabled: env.OFFERS_ENABLED,
    agreements_enabled: env.AGREEMENTS_ENABLED,
    disbursement_enabled: env.DISBURSEMENT_ENABLED,
    repayments_enabled: env.REPAYMENTS_ENABLED,
    refunds_enabled: env.REFUNDS_ENABLED
  });
}
