import { describe, expect, it } from "vitest";
import { estimateGatewayFee, formatINR, parseRupeesToPaise, sumPaise } from "../money";

describe("money", () => {
  it("formats whole and fractional rupees in Indian grouping", () => {
    expect(formatINR(150000)).toBe("₹1,500");
    expect(formatINR(12345678)).toBe("₹1,23,456.78");
    expect(formatINR(0)).toBe("₹0");
  });

  it("rejects non-integer paise", () => {
    expect(() => formatINR(10.5)).toThrow(RangeError);
  });

  it("parses user input to paise", () => {
    expect(parseRupeesToPaise("1,500")).toBe(150000);
    expect(parseRupeesToPaise("₹ 1500.5")).toBe(150050);
    expect(parseRupeesToPaise("0.05")).toBe(5);
    expect(parseRupeesToPaise("abc")).toBeNull();
    expect(parseRupeesToPaise("1.234")).toBeNull();
    expect(parseRupeesToPaise("-5")).toBeNull();
  });

  it("sums paise exactly", () => {
    expect(sumPaise([10, 20, 30])).toBe(60);
  });

  it("estimates Razorpay fee with GST (2% + 18%)", () => {
    expect(estimateGatewayFee(150000)).toBe(3540); // ₹30 fee + ₹5.40 GST
  });
});
