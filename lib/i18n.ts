import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import DICT from './i18n-dict.json';

/**
 * The app's languages. English is the source text; the others come from one small dictionary
 * (a few hundred KB at most, built into the app, nothing downloaded). The same dictionary is
 * published with stayodds.com, so the app and the website say the same thing.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt-BR', name: 'Português (Brasil)' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ar', name: 'العربية', rtl: true },
  { code: 'ja', name: '日本語' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'fa', name: 'فارسی', rtl: true },
] as const;
export type Lang = (typeof LANGUAGES)[number]['code'];

const KEY = 'stayodds_language_v1';
const dict = DICT as Record<string, Partial<Record<Lang, string>>>;
let current: Lang = detect();
const listeners = new Set<(l: Lang) => void>();

function match(tag: string | undefined): Lang | null {
  if (!tag) return null;
  const t = tag.toLowerCase();
  if (t.startsWith('pt')) return 'pt-BR';
  const base = t.split(/[-_]/)[0];
  return (LANGUAGES.find((l) => l.code === base)?.code as Lang) ?? null;
}

/** The phone's own language, if the app speaks it; English otherwise. */
function detect(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale;
    return match(loc) ?? 'en';
  } catch {
    return 'en';
  }
}

/** Translate an English phrase. `{n}`-style holes are filled from `vars`. */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s = current === 'en' ? en : dict[en]?.[current] ?? en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export function getLanguage() {
  return current;
}

export function isRtl(l: Lang = current) {
  return LANGUAGES.some((x) => x.code === l && 'rtl' in x && x.rtl);
}

export async function setLanguage(l: Lang) {
  current = l;
  await AsyncStorage.setItem(KEY, l).catch(() => {});
  listeners.forEach((f) => f(l));
}

/** Loads a saved choice, and re-renders the app when the language changes. */
export function useLanguage() {
  const [lang, setLang] = useState<Lang>(current);
  useEffect(() => {
    const f = (l: Lang) => setLang(l);
    listeners.add(f);
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        const l = saved ? match(saved) ?? (saved as Lang) : null;
        if (l && l !== current && LANGUAGES.some((x) => x.code === l)) {
          current = l;
          listeners.forEach((g) => g(l));
        }
      })
      .catch(() => {});
    return () => {
      listeners.delete(f);
    };
  }, []);
  return lang;
}
