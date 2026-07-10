export type Locale = "es" | "en";

export const DEFAULT_LOCALE: Locale = "es";

export function localize<T>(locale: Locale, english: T, spanish: T): T {
  return locale === "es" ? spanish : english;
}
