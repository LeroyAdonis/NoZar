import { describe, expect, it } from "vitest";
import { buildPayFastSignature, verifyItnSignature } from "./payfast.server";

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
