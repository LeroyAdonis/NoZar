/**
 * AI Fraud Shield — Pattern-based fraud detection for trade chat messages.
 * Scans messages for known scam patterns and returns severity flags.
 *
 * Patterns are fast regex checks (no AI needed) for instant feedback.
 * For deep analysis, use fraud-detection-ai.server.ts.
 */

export interface FraudFlag {
  pattern: string;
  severity: "low" | "medium" | "high";
  label: string;
}

export interface FraudCheckResult {
  hasFraud: boolean;
  flags: FraudFlag[];
  score: number; // 0–100
}

export const FRAUD_PATTERNS: Array<{
  pattern: RegExp;
  severity: "low" | "medium" | "high";
  label: string;
}> = [
  {
    pattern: /send\s+(me\s+)?(money|cash|e?transfer|eft|pay)/i,
    severity: "high",
    label: "Money request in chat",
  },
  {
    pattern: /pay\s+(for\s+)?(shipping|delivery|courier|postage)/i,
    severity: "high",
    label: "Shipping fee request",
  },
  {
    pattern: /(click|open|visit)\s+(this\s+)?(link|url|site)/i,
    severity: "medium",
    label: "Suspicious link shared",
  },
  {
    pattern: /(whatsapp|telegram|signal)\.(com|me|link)/i,
    severity: "high",
    label: "Off-platform contact",
  },
  {
    pattern: /(bank|account|card)\s+details/i,
    severity: "high",
    label: "Bank details requested",
  },
  {
    pattern: /too\s+good\s+to\s+be\s+true/i,
    severity: "medium",
    label: "Too-good-to-be-true language",
  },
  {
    pattern: /(urgent|immediate|asap).{0,20}(money|pay|cash|transfer)/i,
    severity: "medium",
    label: "Urgent money request",
  },
  {
    pattern: /(deposit|fee|payment).{0,20}(first|before|upfront|refundable)/i,
    severity: "high",
    label: "Upfront payment requested",
  },
];

/**
 * Check a single message text for fraud patterns.
 * Returns flags and a severity score (0–100).
 */
export function checkMessageForFraud(text: string): FraudCheckResult {
  const flags: FraudFlag[] = [];

  for (const { pattern, severity, label } of FRAUD_PATTERNS) {
    if (pattern.test(text)) {
      flags.push({ pattern: pattern.source, severity, label });
    }
  }

  const score = Math.min(
    flags.reduce(
      (s, f) =>
        s + (f.severity === "high" ? 40 : f.severity === "medium" ? 20 : 10),
      0,
    ),
    100,
  );

  return {
    hasFraud: flags.length > 0,
    flags,
    score,
  };
}

/**
 * Severity icon helper for display.
 */
export function severityIcon(severity: "low" | "medium" | "high"): string {
  switch (severity) {
    case "high":
      return "🚨";
    case "medium":
      return "⚠️";
    case "low":
      return "ℹ️";
  }
}
