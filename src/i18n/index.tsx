import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Lang, TranslationKey } from "./translations";
import { translations } from "./translations";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  lang,
  onLangChange,
  children,
}: {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang: onLangChange,
      t: (key, vars) => {
        let text: string = translations[lang][key] ?? translations.en[key];
        if (vars) {
          for (const [name, val] of Object.entries(vars)) {
            text = text.split(`{${name}}`).join(String(val));
          }
        }
        return text;
      },
    }),
    [lang, onLangChange],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return ctx;
}