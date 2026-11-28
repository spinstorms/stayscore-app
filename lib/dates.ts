import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Trip dates, the same as the website's "When are you going?" box and /holidays/ page:
 * quick dates are the next upcoming occurrence of each, worked out from today, and the
 * chosen dates are remembered and carried into booking links.
 */
export type QuickDateKey = 'weekend' | 'christmas' | 'newyear' | 'valentines' | 'easter' | 'summer';

export interface QuickDate {
  key: QuickDateKey;
  label: string;
  checkin: string; // YYYY-MM-DD
  checkout: string;
}

export interface TripDates {
  checkin: string;
  checkout: string;
  adults: number;
}

const STORE_KEY = 'so_dates';
const DAY = 86400000;

export const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parse = (s: string) => new Date(`${s}T12:00:00`);

function easterSunday(y: number): Date {
  const a = y % 19,
    b = Math.floor(y / 100),
    c = y % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31);
  return new Date(y, mo - 1, ((h + l - 7 * m + 114) % 31) + 1);
}

function today(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Quick dates in the website's hotel-page order (weekend first). */
export function quickDates(): QuickDate[] {
  const t = today();
  const nextOf = (fn: (y: number) => [Date, Date]): [Date, Date] => {
    let r = fn(t.getFullYear());
    if (r[0] <= t) r = fn(t.getFullYear() + 1);
    return r;
  };
  const fri = addDays(t, (5 - t.getDay() + 7) % 7 || 7);
  const rows: [QuickDateKey, string, [Date, Date]][] = [
    ['weekend', fri.getTime() - t.getTime() <= 5 * DAY ? 'This weekend' : 'Next weekend', [fri, addDays(fri, 2)]],
    ['christmas', 'Christmas', nextOf((y) => [new Date(y, 11, 23), new Date(y, 11, 27)])],
    ['newyear', 'New Year', nextOf((y) => [new Date(y, 11, 30), new Date(y + 1, 0, 2)])],
    ['valentines', "Valentine's", nextOf((y) => [new Date(y, 1, 13), new Date(y, 1, 15)])],
    ['easter', 'Easter', nextOf((y) => { const e = easterSunday(y); return [addDays(e, -2), addDays(e, 2)]; })],
    ['summer', 'Summer week', nextOf((y) => [new Date(y, 7, 1), new Date(y, 7, 8)])],
  ];
  return rows.map(([key, label, [a, b]]) => ({ key, label, checkin: fmtDate(a), checkout: fmtDate(b) }));
}

/** The /holidays/ page order: holidays first, weekend last. */
export function holidayDates(): QuickDate[] {
  const q = quickDates();
  return [...q.filter((x) => x.key !== 'weekend'), ...q.filter((x) => x.key === 'weekend')];
}

export function findQuickDate(key?: string | null): QuickDate | undefined {
  return key ? quickDates().find((q) => q.key === key) : undefined;
}

export function defaultDates(): TripDates {
  const t = today();
  return { checkin: fmtDate(addDays(t, 45)), checkout: fmtDate(addDays(t, 47)), adults: 2 };
}

export const shortDate = (s: string) => parse(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const nightsBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / DAY);
export const isValidRange = (d: TripDates) => Boolean(d.checkin && d.checkout && d.checkout > d.checkin);

export function rangeLabel(d: TripDates): string {
  if (!isValidRange(d)) return '';
  const n = nightsBetween(d.checkin, d.checkout);
  return `${shortDate(d.checkin)} – ${shortDate(d.checkout)} · ${n} night${n === 1 ? '' : 's'}`;
}

/** Saved dates from an earlier visit, if they are still in the future. */
export async function loadSavedDates(): Promise<TripDates | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    const s = raw ? (JSON.parse(raw) as { ci?: string; co?: string; ad?: string | number }) : null;
    if (!s?.ci || !s.co || !(s.ci > fmtDate(today()))) return null;
    return { checkin: s.ci, checkout: s.co, adults: Number(s.ad) || 2 };
  } catch {
    return null;
  }
}

export function saveDates(d: TripDates) {
  AsyncStorage.setItem(STORE_KEY, JSON.stringify({ ci: d.checkin, co: d.checkout, ad: String(d.adults) })).catch(() => {});
}

/** Sets one query parameter with plain string handling (React Native's URL object has no working searchParams). */
function setParam(url: string, key: string, value: string): string {
  const hashAt = url.indexOf('#');
  const hash = hashAt >= 0 ? url.slice(hashAt) : '';
  const base = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const [path, query = ''] = base.split('?');
  const parts = query ? query.split('&').filter((p) => p && decodeURIComponent(p.split('=')[0]) !== key) : [];
  parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return `${path}?${parts.join('&')}${hash}`;
}

const hostOf = (url: string) => (url.match(/^https?:\/\/([^/?#]+)/i)?.[1] || '').toLowerCase();

/** Adds the dates to a booking link the same way the website does (Partnerize deep links and Booking.com). */
export function datedBookingUrl(baseUrl: string, d: TripDates): string {
  if (!baseUrl || !isValidRange(d)) return baseUrl;
  const ad = String(d.adults || 2);
  try {
    const host = hostOf(baseUrl);
    if (/prf\.hn$/.test(host)) {
      const m = baseUrl.match(/destination:(.+)$/);
      if (m && m.index != null) {
        const us = (x: string) => `${x.slice(5, 7)}/${x.slice(8, 10)}/${x.slice(0, 4)}`;
        let dest = decodeURIComponent(m[1]);
        dest = setParam(dest, 'fromDate', us(d.checkin));
        dest = setParam(dest, 'toDate', us(d.checkout));
        dest = setParam(dest, 'numAdultsPerRoom', ad);
        return baseUrl.slice(0, m.index) + 'destination:' + encodeURIComponent(dest);
      }
    }
    if (/booking\.com$/.test(host)) {
      let u = baseUrl;
      u = setParam(u, 'checkin', d.checkin);
      u = setParam(u, 'checkout', d.checkout);
      u = setParam(u, 'group_adults', ad);
      return setParam(u, 'no_rooms', '1');
    }
  } catch {
    // not a link we can add dates to
  }
  return baseUrl;
}
