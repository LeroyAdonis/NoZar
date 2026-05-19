import { describe, expect, it } from "vitest";
import { buildPayFastSignature } from "./payfast.server";

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
