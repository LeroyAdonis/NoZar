/**
 * South Africa's 11 Official Languages
 * ISO 639-1 codes where available, BCP-47 tags otherwise.
 */
export const SA_LANGUAGES = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa" },
  { code: "st", name: "Sesotho", nativeName: "Sesotho" },
  { code: "tn", name: "Tswana", nativeName: "Setswana" },
  { code: "ss", name: "Swati", nativeName: "SiSwati" },
  { code: "ts", name: "Tsonga", nativeName: "Xitsonga" },
  { code: "ve", name: "Venda", nativeName: "Tshivenḓa" },
  { code: "nr", name: "Southern Ndebele", nativeName: "isiNdebele" },
  { code: "nso", name: "Northern Sotho", nativeName: "Sesotho sa Leboa" },
] as const;

export type SaLanguageCode = (typeof SA_LANGUAGES)[number]["code"];

const DEFAULT_LANGUAGE: SaLanguageCode = "en";

/**
 * Resolve a language code from a user input or cookie.
 * Falls back to English for invalid codes.
 */
export function resolveLanguage(code: string | null | undefined): SaLanguageCode {
  if (!code) return DEFAULT_LANGUAGE;
  const match = SA_LANGUAGES.find((l) => l.code === code);
  return match?.code ?? DEFAULT_LANGUAGE;
}

/**
 * Label for a language code — used in UI dropdowns.
 */
export function languageLabel(code: SaLanguageCode): string {
  const lang = SA_LANGUAGES.find((l) => l.code === code);
  if (!lang) return "English";
  return `${lang.nativeName} (${lang.name})`;
}
