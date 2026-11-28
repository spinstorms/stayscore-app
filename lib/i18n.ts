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
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'ko', name: '한국어' },
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
  if (t.startsWith('zh')) return 'zh-Hans';
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

/** Hotel text (verdicts, highlights, caveats) translated for stayodds.com, shared with the app. */
let content: Record<string, string> = {};
let contentLang: Lang = 'en';
async function loadContent(l: Lang) {
  if (l === 'en') {
    content = {};
    contentLang = 'en';
    return;
  }
  if (contentLang === l) return;
  try {
    const res = await fetch(`https://stayodds.com/assets/i18n/${l}/hotels.json`);
    if (!res.ok) return;
    content = (await res.json()) as Record<string, string>;
    contentLang = l;
    listeners.forEach((f) => f(current));
  } catch {
    // English hotel text until the translations can be fetched
  }
}

/** Translate an English phrase. `{n}`-style holes are filled from `vars`. */
export function t(en: string, vars?: Record<string, string | number>): string {
  let s =
    current === 'en'
      ? en
      : dict[en]?.[current] ?? (contentLang === current ? content[en.replace(/\s+/g, ' ').trim()] : undefined) ?? en;
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
  void loadContent(l);
}

/** Loads a saved choice, and re-renders the app when the language changes. */
export function useLanguage() {
  const [lang, setLang] = useState<Lang>(current);
  const [, bump] = useState(0);
  useEffect(() => {
    const f = (l: Lang) => {
      setLang(l);
      bump((x) => x + 1); // hotel text arrived for the same language: draw again
    };
    void loadContent(current);
    listeners.add(f);
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        const l = saved ? match(saved) ?? (saved as Lang) : null;
        if (l && l !== current && LANGUAGES.some((x) => x.code === l)) {
          current = l;
          listeners.forEach((g) => g(l));
          void loadContent(l);
        }
      })
      .catch(() => {});
    return () => {
      listeners.delete(f);
    };
  }, []);
  return lang;
}
