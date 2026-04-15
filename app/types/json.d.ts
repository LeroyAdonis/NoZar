type StringsData = {
  nav: Record<string, string>;
  "nav.section": Record<string, string>;
  buttons: Record<string, string>;
  cta: Record<string, string>;
  placeholders: Record<string, string>;
  labels: Record<string, string>;
  conditions: Record<string, string>;
  categories: Record<string, string>;
  errors: Record<string, string>;
  warnings: Record<string, string>;
  confirmations: Record<string, string>;
  safety: Record<string, string>;
  status: Record<string, string>;
  time: Record<string, string>;
  trade: Record<string, string>;
  meetup: Record<string, string>;
  chat: Record<string, string>;
  profile: Record<string, string>;
  notifications: Record<string, string>;
  empty: Record<string, string>;
  onboarding: Record<string, string>;
  legal: Record<string, string>;
  verification: Record<string, string>;
  location: Record<string, string>;
  filter: Record<string, string>;
  trader: Record<string, string>;
  currency: Record<string, string>;
};

declare module "*.json" {
  const value: StringsData;
  export default value;
}