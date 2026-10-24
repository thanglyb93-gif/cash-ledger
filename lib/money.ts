// Amounts are always integers in minor units. VND has 0 minor-unit digits (its
// minor unit IS the unit), USD has 2. Never do money math in floating point.

const MINOR_UNIT_DIGITS: Record<string, number> = {
  VND: 0,
  USD: 2,
  EUR: 2,
};

export function minorUnitDigits(currency: string): number {
  return MINOR_UNIT_DIGITS[currency] ?? 2;
}

/** Convert a user-typed decimal string (e.g. "125000" VND or "42.50" USD) to integer minor units. */
export function toMinorUnits(input: string, currency: string): number {
  const digits = minorUnitDigits(currency);
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "" || Number.isNaN(Number(cleaned))) {
    throw new Error(`invalid amount: ${input}`);
  }
  const [whole, frac = ""] = cleaned.split(".");
  const paddedFrac = (frac + "0".repeat(digits)).slice(0, digits);
  const sign = whole.startsWith("-") ? -1 : 1;
  const wholeDigits = whole.replace("-", "") || "0";
  const minorUnits = BigInt(wholeDigits + paddedFrac);
  return sign * Number(minorUnits);
}

/** Format integer minor units back to a human string, e.g. 12500000 VND -> "12,500,000". */
export function formatMoney(amountMinorUnits: number, currency: string): string {
  const digits = minorUnitDigits(currency);
  const major = amountMinorUnits / 10 ** digits;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major);
}
