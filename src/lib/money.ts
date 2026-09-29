const MAX_BIGINT = 9_223_372_036_854_775_807n;
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

/** Parse a USD decimal string into exact integer cents. */
export function parseUsdCents(value: string): string | null {
  const normalized = value.trim();
  const match = /^(0|[1-9]\d{0,15})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const whole = BigInt(match[1]);
  const fraction = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const cents = whole * 100n + fraction;
  return cents <= MAX_BIGINT && cents <= MAX_SAFE_CENTS ? cents.toString() : null;
}

/** Format integer cents without converting the authoritative value to a float. */
export function formatUsdCents(value: string | number | bigint): string {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new RangeError("Money values must be safe integer cents.");
  const cents = typeof value === "bigint" ? value : BigInt(value);
  const negative = cents < 0n;
  const absolute = negative ? -cents : cents;
  const dollars = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (absolute % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}$${dollars}.${fraction}`;
}
