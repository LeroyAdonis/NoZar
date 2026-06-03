export const CONDITION_MULTIPLIERS = {
  poor: 0.60,
  fair: 0.75,
  good: 0.90,
  excellent: 1.05,
  mint: 1.15,
} as const;

export type Condition = keyof typeof CONDITION_MULTIPLIERS;

export function getConditionWeightedValue(
  baseValue: number | null,
  condition: string | null
): number | null {
  if (baseValue == null) return null;
  const multiplier = condition && condition in CONDITION_MULTIPLIERS
    ? CONDITION_MULTIPLIERS[condition as Condition]
    : 1.0;
  return Math.round(baseValue * multiplier);
}
