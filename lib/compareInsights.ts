import { getForbesRank, getMichelinKeyCount, getW50BestRank } from './features';
import { getBestMonths, getGuestProfile } from './insights';
import type { HotelExtras, HotelRanks } from './ranks';
import { computeStayOdds } from './scoring';
import { lowestGbp } from './tripQuery';
import type { Hotel } from './types';

/**
 * "Generate insights" for 2-3 hotels on Compare. Every line is worked out from the data the app
 * already shows (guest reviews, critics, our stays, awards, prices, seasons, ranks, dining, water);
 * nothing is guessed. The website's compare page uses the same rules.
 */
export interface CompareInsight {
  icon: string;
  title: string;
  text: string;
}

interface Extra {
  ranks?: Record<string, HotelRanks>;
  extras?: Record<string, HotelExtras>;
}

const short = (h: Hotel) => h.name.replace(/,.*$/, '').replace(/^The /, '');
const reviews = (h: Hotel) => Number(h.verifiedGuest?.licensed?.reviewCount || 0);
const guest = (h: Hotel) => h.verifiedGuest?.licensed?.normalized100 ?? null;
const n = (x: number) => x.toLocaleString('en-GB');
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function km(a: Hotel, b: Hotel) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function buildCompareInsights(hotels: Hotel[], data: Extra = {}): CompareInsight[] {
  const hs = hotels.filter(Boolean);
  if (hs.length < 2) return [];
  const out: CompareInsight[] = [];
  const odds = hs.map((h) => computeStayOdds(h));

  // 1. What guests say
  const rated = hs.filter((h) => guest(h) != null);
  if (rated.length >= 2) {
    const sorted = [...rated].sort((a, b) => (guest(b) ?? 0) - (guest(a) ?? 0) || reviews(b) - reviews(a));
    const top = sorted[0];
    const gap = (guest(top) ?? 0) - (guest(sorted[sorted.length - 1]) ?? 0);
    out.push({
      icon: '👥',
      title:
        gap <= 1
          ? 'Guests rate them almost the same'
          : guest(sorted[1]) === guest(top)
            ? `Guests rate ${list(sorted.filter((h) => guest(h) === guest(top)).map(short))} highest`
            : `Guests prefer ${short(top)}`,
      text:
        sorted.map((h) => `${short(h)} ${guest(h)}/100 from ${n(reviews(h))} reviews`).join(' · ') +
        (gap <= 1 ? '. A gap this small is within normal variation, so decide on location, rooms or price.' : `. That's ${gap} points clear.`),
    });
    const thin = rated.filter((h) => reviews(h) > 0 && reviews(h) < 150);
    if (thin.length) {
      out.push({
        icon: '🔍',
        title: 'Fewer reviews to go on',
        text: `${list(thin.map(short))} ${thin.length > 1 ? 'have' : 'has'} under 150 guest reviews, so ${thin.length > 1 ? 'their scores' : 'its score'} can move more than the others.`,
      });
    }
  }

  // 2. Critics vs guests
  const gaps = hs
    .map((h, i) => ({ h, c: odds[i].critic100, g: odds[i].guest100 }))
    .filter((x) => x.c != null && x.g != null) as { h: Hotel; c: number; g: number }[];
  const bigGap = gaps.filter((x) => Math.abs(x.c - x.g) >= 6);
  if (bigGap.length) {
    out.push({
      icon: '📰',
      title: 'Where critics and guests disagree',
      text: bigGap
        .map((x) => `${short(x.h)}: critics ${x.c}, guests ${x.g} (${x.c > x.g ? 'critics are keener' : 'guests are keener'})`)
        .join(' · '),
    });
  }

  // 3. Our own stays
  const ours = hs.map((h, i) => ({ h, o: odds[i] })).filter((x) => x.o.personalScore25 != null);
  if (ours.length) {
    out.push({
      icon: '🎥',
      title: ours.length === hs.length ? 'We stayed at all of them' : `We stayed at ${list(ours.map((x) => short(x.h)))}`,
      text: ours.map((x) => `${short(x.h)} ${x.o.personalScore25}/25 from our filmed stay`).join(' · ') + '.',
    });
  }

  // 4. Awards
  const awards = hs
    .map((h) => {
      const bits: string[] = [];
      const k = getMichelinKeyCount(h);
      const w = getW50BestRank(h);
      const f = getForbesRank(h);
      if (k) bits.push(`${k} MICHELIN Key${k > 1 ? 's' : ''}`);
      if (w && w < 999) bits.push(`No. ${w} World's 50 Best`);
      if (f === 5) bits.push('Forbes Five-Star');
      else if (f === 4) bits.push('Forbes Four-Star');
      return { h, bits };
    })
    .filter((x) => x.bits.length);
  if (awards.length) {
    const none = hs.filter((h) => !awards.some((a) => a.h.id === h.id));
    out.push({
      icon: '🏆',
      title: 'Awards',
      text:
        awards.map((a) => `${short(a.h)}: ${a.bits.join(', ')}`).join(' · ') +
        (none.length ? ` · ${list(none.map(short))}: no major award (guest scores often match award winners anyway)` : ''),
    });
  }

  // 5. Price and value
  const priced = hs.map((h) => ({ h, p: lowestGbp(h), g: guest(h) })).filter((x) => x.p != null) as { h: Hotel; p: number; g: number | null }[];
  if (priced.length >= 2) {
    const cheap = [...priced].sort((a, b) => a.p - b.p);
    const lo = cheap[0];
    const hi = cheap[cheap.length - 1];
    if (hi.p - lo.p >= 50) {
      const better = lo.g != null && hi.g != null ? (lo.g >= hi.g ? 'with an equal or better guest score' : `for ${hi.g - lo.g} fewer guest points`) : '';
      out.push({
        icon: '💷',
        title: `${short(lo.h)} is the better-value pick`,
        text: `Prices start around £${n(lo.p)} a night against £${n(hi.p)} at ${short(hi.h)}, roughly £${n(hi.p - lo.p)} less per night ${better}. Prices are from our latest check, so look at your own dates.`.replace(/\s+\./, '.'),
      });
    }
  }

  // 6. When to go
  const seasons = hs.map((h) => ({ h, b: getBestMonths(h) }));
  const shared = seasons[0].b.months.filter((m) => seasons.every((s) => s.b.months.includes(m)));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  out.push({
    icon: '☀️',
    title: shared.length ? 'Best months overlap' : 'Different best seasons',
    text: shared.length
      ? `All are at their best in ${shared.map((m) => MONTHS[m - 1]).join(', ')}. ` + seasons.map((s) => `${short(s.h)}: ${s.b.shortLabel}`).join(' · ')
      : seasons.map((s) => `${short(s.h)}: ${s.b.shortLabel} (${s.b.note.toLowerCase()})`).join(' · ') + '. Pick by when you can travel.',
  });

  // 7. Rank among nearby hotels
  const r = data.ranks || {};
  const areaRanks = hs.map((h) => ({ h, a: r[h.id]?.area })).filter((x) => x.a) as { h: Hotel; a: NonNullable<HotelRanks['area']> }[];
  if (areaRanks.length) {
    out.push({
      icon: '📍',
      title: 'Against their neighbours',
      text: areaRanks.map((x) => `${short(x.h)} is ${ordinal(x.a.rank)} of ${x.a.of} in ${x.a.group}`).join(' · ') + ' (by guest score, among hotels on StayOdds).',
    });
  }

  // 8. Dining and water
  const ex = data.extras || {};
  const starred = hs
    .map((h) => ({ h, d: (ex[h.id]?.dining || []).filter((d) => /MICHELIN Star/.test(d.distinction)) }))
    .filter((x) => x.d.length);
  if (starred.length) {
    out.push({
      icon: '🍽️',
      title: 'MICHELIN-starred dining on site',
      text: starred.map((x) => `${short(x.h)}: ${x.d.map((d) => `${d.name} (${d.distinction.replace(/MICHELIN /, '')})`).join(', ')}`).join(' · '),
    });
  }
  const water = hs.map((h) => ({ h, w: ex[h.id]?.waterPolicy })).filter((x) => x.w);
  const paid = water.filter((x) => !/free/i.test(x.w!.status));
  if (paid.length) {
    out.push({ icon: '💧', title: 'Bottled water', text: paid.map((x) => `${short(x.h)}: ${x.w!.status.toLowerCase()}`).join(' · ') + '.' });
  }

  // 9. Who it suits
  const profiles = hs.map((h) => ({ h, p: getGuestProfile(h) }));
  const adults = profiles.filter((x) => x.p.adultsOnly);
  const family = profiles.filter((x) => x.p.familyFriendly);
  if (adults.length || family.length) {
    out.push({
      icon: '🧳',
      title: 'Who each one suits',
      text: [
        adults.length ? `Adults-only: ${list(adults.map((x) => short(x.h)))}` : '',
        family.length ? `Good for families: ${list(family.map((x) => short(x.h)))}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }

  // 10. Distance apart
  if (hs.length === 2) {
    const d = km(hs[0], hs[1]);
    if (d < 60) out.push({ icon: '🗺️', title: 'Close neighbours', text: `They're about ${d < 2 ? d.toFixed(1) : Math.round(d)} km apart, so it comes down to the hotel itself rather than the destination.` });
  }

  // 11. Watch-outs we noted
  const watch = hs.filter((h) => h.watchOut && h.watchOut.length > 8);
  if (watch.length) {
    out.push({ icon: '⚠️', title: 'Watch-outs', text: watch.map((h) => `${short(h)}: ${h.watchOut.replace(/\.$/, '')}`).join(' · ') + '.' });
  }
  return out;
}

function ordinal(k: number) {
  const v = k % 100;
  if (v >= 11 && v <= 13) return `${k}th`;
  return `${k}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[k % 10] || 'th'}`;
}
