// Money is stored and moved as integer paise. Rupees exist only at the edges
// (form input and display). Never do arithmetic on rupee floats.

export type Paise = number;

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrFormatterExact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function assertPaise(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Expected integer paise, got ${value}`);
  }
}

/** ₹1,500 — whole rupees when the amount is whole, otherwise ₹1,500.50. */
export function formatINR(paise: Paise): string {
  assertPaise(paise);
  return paise % 100 === 0 ? inrFormatter.format(paise / 100) : inrFormatterExact.format(paise / 100);
}

/** Parses user input like "1,500", "₹1500.5" into paise. Returns null when invalid. */
export function parseRupeesToPaise(input: string): Paise | null {
  const cleaned = input.replace(/[₹,\s]/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = "0", fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function sumPaise(values: readonly Paise[]): Paise {
  return values.reduce((total, value) => {
    assertPaise(value);
    return total + value;
  }, 0);
}

/** Razorpay fee estimate: percentage of amount + 18% GST on the fee, rounded up to the paisa. */
export function estimateGatewayFee(amount: Paise, feeBasisPoints = 200): Paise {
  assertPaise(amount);
  const fee = Math.ceil((amount * feeBasisPoints) / 10_000);
  const gst = Math.ceil((fee * 18) / 100);
  return fee + gst;
}
