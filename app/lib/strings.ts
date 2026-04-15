import strings from "./strings.json";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Strings = typeof strings;
export type NavStrings = Strings["nav"];
export type ButtonStrings = Strings["buttons"];
export type CtaStrings = Strings["cta"];
export type PlaceholderStrings = Strings["placeholders"];
export type LabelStrings = Strings["labels"];
export type ErrorStrings = Strings["errors"];
export type WarningStrings = Strings["warnings"];
export type ConfirmationStrings = Strings["confirmations"];
export type SafetyStrings = Strings["safety"];
export type StatusStrings = Strings["status"];
export type TimeStrings = Strings["time"];
export type TradeStrings = Strings["trade"];
export type MeetupStrings = Strings["meetup"];
export type ChatStrings = Strings["chat"];
export type ProfileStrings = Strings["profile"];
export type NotificationStrings = Strings["notifications"];
export type EmptyStrings = Strings["empty"];
export type OnboardingStrings = Strings["onboarding"];
export type LegalStrings = Strings["legal"];
export type VerificationStrings = Strings["verification"];
export type LocationStrings = Strings["location"];
export type FilterStrings = Strings["filter"];
export type TraderStrings = Strings["trader"];
export type CurrencyStrings = Strings["currency"];
export type ConditionStrings = Strings["conditions"];
export type CategoryStrings = Strings["categories"];

export function t<K extends keyof Strings>(
  category: K
): Strings[K];
export function t<C extends string>(
  category: string,
  key: C
): string;
export function t(category: string, key?: string): unknown {
  if (key) {
    return (strings as Record<string, Record<string, unknown>>)[category]?.[key];
  }
  return (strings as Record<string, unknown>)[category];
}

export function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(values[key] ?? `{${key}}`)
  );
}

export function getString<C extends string, K extends string>(
  category: C,
  key: K,
  values?: Record<string, string | number>
): string {
  const categoryStrings = (strings as Record<string, Record<string, string | undefined>>)[category];
  const value = categoryStrings?.[key];
  if (!value || typeof value !== "string") {
    console.warn(`String not found: ${category}.${key}`);
    return key;
  }
  if (values) {
    return interpolate(value, values);
  }
  return value;
}

export const nav = strings.nav;
export const buttons = strings.buttons;
export const cta = strings.cta;
export const placeholders = strings.placeholders;
export const labels = strings.labels;
export const errors = strings.errors;
export const warnings = strings.warnings;
export const confirmations = strings.confirmations;
export const safety = strings.safety;
export const status = strings.status;
export const time = strings.time;
export const trade = strings.trade;
export const meetup = strings.meetup;
export const chat = strings.chat;
export const profile = strings.profile;
export const notifications = strings.notifications;
export const empty = strings.empty;
export const onboarding = strings.onboarding;
export const legal = strings.legal;
export const verification = strings.verification;
export const location = strings.location;
export const filter = strings.filter;
export const trader = strings.trader;
export const currency = strings.currency;
export const conditions = strings.conditions;
export const categories = strings.categories;

export const SIDEBAR_LABELS = {
  home: nav.home,
  map: nav.map,
  add: nav.add,
  messages: nav.messages,
  profile: nav.profile,
} as const;

export const BOTTOM_NAV_LABELS = {
  home: nav.home,
  map: nav.map,
  add: "",
  messages: nav.messages,
  profile: nav.profile,
} as const;

export const SECTION_HEADERS = {
  home: strings["nav.section"].main,
  map: strings["nav.section"].map,
  add: strings["nav.section"].add,
  messages: strings["nav.section"].messages,
  profile: strings["nav.section"].profile,
} as const;

export const ALL_STRINGS = strings;

export default strings;