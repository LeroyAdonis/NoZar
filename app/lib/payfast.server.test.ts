import { describe, expect, it } from "vitest";
import {
  buildPayFastSignature,
  buildPlusSubscriptionFields,
  verifyItnSignature,
} from "./payfast.server";

describe("buildPayFastSignature", () => {
  it("produces MD5 of url-encoded ordered fields with passphrase", () => {
    const fields: Array<[string, string]> = [
      ["merchant_id", "10000100"],
      ["merchant_key", "46f0cd694581a"],
      ["return_url", "http://www.yourdomain.co.za/return"],
      ["cancel_url", "http://www.yourdomain.co.za/cancel"],
      ["notify_url", "http://www.yourdomain.co.za/notify"],
      ["amount", "100.00"],
      ["item_name", "Test Product"],
    ];

    expect(buildPayFastSignature(fields, "")).toMatch(/^[a-f0-9]{32}$/);

    const sigA = buildPayFastSignature(fields, "");
    const sigB = buildPayFastSignature(fields, "jt7NOE43FZPn");
    expect(sigA).not.toEqual(sigB);
    expect(sigB).toMatch(/^[a-f0-9]{32}$/);
  });

  it("ignores empty-string values", () => {
    const fields: Array<[string, string]> = [
      ["a", "1"],
      ["b", ""],
      ["c", "3"],
    ];
    const withEmpty = buildPayFastSignature(fields, "");
    const withoutEmpty = buildPayFastSignature(
      [["a", "1"], ["c", "3"]],
      "",
    );
    expect(withEmpty).toEqual(withoutEmpty);
  });

  it("uses PHP-style URL encoding (spaces → %20, uppercase hex)", () => {
    const fields: Array<[string, string]> = [
      ["item_name", "hello world"],
      ["x", "ä"],
    ];
    const sig = buildPayFastSignature(fields, "");
    expect(sig).toMatch(/^[a-f0-9]{32}$/);
    expect(sig).toEqual(buildPayFastSignature(fields, ""));
  });
});

describe("verifyItnSignature", () => {
  it("returns true for a self-built valid signature", () => {
    const formData = new URLSearchParams();
    formData.append("m_payment_id", "test-uuid");
    formData.append("pf_payment_id", "PF-123");
    formData.append("payment_status", "COMPLETE");
    formData.append("amount_gross", "99.00");
    const fields: Array<[string, string]> = [...formData.entries()] as Array<
      [string, string]
    >;
    const sig = buildPayFastSignature(fields, "test-pass");
    formData.append("signature", sig);

    expect(verifyItnSignature(formData, "test-pass")).toBe(true);
  });

  it("returns false when signature has been tampered with", () => {
    const formData = new URLSearchParams();
    formData.append("m_payment_id", "test-uuid");
    formData.append("amount_gross", "99.00");
    formData.append("signature", "0".repeat(32));

    expect(verifyItnSignature(formData, "test-pass")).toBe(false);
  });

  it("returns false when amount is tampered after signing", () => {
    const formData = new URLSearchParams();
    formData.append("m_payment_id", "test-uuid");
    formData.append("amount_gross", "99.00");
    const sig = buildPayFastSignature(
      [...formData.entries()] as Array<[string, string]>,
      "p",
    );
    formData.set("amount_gross", "999.00");
    formData.append("signature", sig);

    expect(verifyItnSignature(formData, "p")).toBe(false);
  });
});

describe("buildPlusSubscriptionFields", () => {
  it("produces the field set required for a Plus monthly subscription", () => {
    process.env.PAYFAST_MERCHANT_ID = "10000100";
    process.env.PAYFAST_MERCHANT_KEY = "46f0cd694581a";

    const result = buildPlusSubscriptionFields({
      userId: "user-123",
      email: "alice@example.com",
      firstName: "Alice",
      mPaymentId: "uuid-1",
      baseUrl: "https://nozar.co.za",
      todayISO: "2026-05-19",
    });

    const keys = result.fields.map(([k]) => k);
    expect(keys[0]).toBe("merchant_id");
    expect(keys[1]).toBe("merchant_key");
    expect(keys).toContain("subscription_type");
    expect(keys).toContain("recurring_amount");
    expect(keys).toContain("frequency");
    expect(keys).toContain("cycles");

    const fieldMap = Object.fromEntries(result.fields);
    expect(fieldMap.merchant_id).toBe("10000100");
    expect(fieldMap.amount).toBe("99.00");
    expect(fieldMap.recurring_amount).toBe("99.00");
    expect(fieldMap.subscription_type).toBe("1");
    expect(fieldMap.frequency).toBe("3");
    expect(fieldMap.cycles).toBe("0");
    expect(fieldMap.m_payment_id).toBe("uuid-1");
    expect(fieldMap.custom_str1).toBe("user-123");
    expect(fieldMap.custom_str2).toBe("plus");
    expect(fieldMap.notify_url).toBe("https://nozar.co.za/api/pay/webhook");
    expect(fieldMap.return_url).toBe(
      "https://nozar.co.za/dashboard/billing?pf=success",
    );
    expect(fieldMap.cancel_url).toBe(
      "https://nozar.co.za/dashboard/billing?pf=cancel",
    );
    expect(result.actionUrl).toMatch(/^https:\/\/(www|sandbox)\.payfast\.co\.za\/eng\/process$/);
  });
});
