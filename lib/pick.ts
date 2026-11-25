import { getPropertyStatusMeta } from './propertyStatus';
import type { computeStayOdds } from './scoring';
import type { Hotel } from './types';

type Odds = ReturnType<typeof computeStayOdds>;

export interface StayOddsPick {
  title: string;
  why: string[];
  consider: string[];
}

function awardLabels(h: Hotel): string[] {
  const out: string[] = [];
  for (const a of h.officialAwards || []) {
    const body = String(a.awardBody || '');
    const label = String(a.label || '');
    if (/50\s*best/i.test(body)) {
      const m = label.match(/No\.\s*(\d+)/);
      out.push(m ? `No. ${m[1]} World's 50 Best Hotels` : "World's 50 Best Hotels");
    } else if (/michelin/i.test(`${body} ${label}`) || /forbes/i.test(body)) out.push(label);
  }
  return [...new Set(out)].slice(0, 3);
}

/** Which compared hotel to choose and why, written only from the scores, review counts and awards in the data. */
export function buildStayOddsPick(entries: { hotel: Hotel; odds: Odds }[]): StayOddsPick | null {
  const n = (v: number) => v.toLocaleString('en-GB');
  const rows = entries.map(({ hotel, odds }) => {
    const st = getPropertyStatusMeta(hotel);
    return {
      h: hotel,
      o: odds,
      closed: st.tone === 'danger',
      status: st.operatingStatus,
      score: odds.greatStayOdds ?? null,
      guest: odds.verifiedGuest ? odds.verifiedGuest.normalized100 : null,
      reviews: odds.verifiedGuest ? odds.verifiedGuest.reviewCount : null,
      critic: odds.critic100 ?? null,
      critics: (odds.editorialRatings || []).filter((e) => e.normalized100 != null).length,
    };
  });
  const open = rows.filter((r) => !r.closed && r.score != null).sort((a, b) => (b.score as number) - (a.score as number));
  if (!open.length) return null;
  const top = open[0];
  const others = rows.filter((r) => r !== top);
  const margin = open[1] ? (top.score as number) - (open[1].score as number) : null;

  const title =
    margin === 0 ? 'Too close to call' : margin != null && margin <= 2 ? `Narrow pick: ${top.h.name}` : `StayOdds pick: ${top.h.name}`;

  const why: string[] = [];
  if (margin === 0) {
    const tied = open.filter((r) => r.score === top.score).map((r) => r.h.name).join(' and ');
    why.push(`${tied} share the same StayOdds score of ${top.score}%. Choose on location, style and price.`);
  } else {
    const line = others.filter((r) => r.score != null).map((r) => `${r.score}% for ${r.h.name}`).join(' and ');
    why.push(`Highest StayOdds score: ${top.score}%${line ? `, against ${line}` : ''}.`);
  }
  if (top.guest != null) {
    const better = others.filter((r) => r.guest != null && r.guest > (top.guest as number));
    const rest = others.filter((r) => r.guest != null && r.guest <= (top.guest as number));
    const rc = top.reviews ? ` from ${n(top.reviews)} reviews` : '';
    if (!better.length && rest.length) {
      why.push(`Guests rate it highest: ${top.guest}/100${rc}, against ${rest.map((r) => `${r.guest}/100 for ${r.h.name}`).join(' and ')}.`);
    } else if (!better.length) {
      why.push(`Guests rate it ${top.guest}/100${rc}.`);
    }
  }
  if (top.critic != null) {
    const beaten = others.filter((r) => r.critic != null && r.critic < (top.critic as number));
    const higher = others.filter((r) => r.critic != null && r.critic > (top.critic as number));
    if (!higher.length) {
      why.push(
        `Published critics score it ${top.critic}/100 (${top.critics} critic${top.critics === 1 ? '' : 's'})` +
          (beaten.length ? `, against ${beaten.map((r) => `${r.critic}/100 for ${r.h.name}`).join(' and ')}.` : '.'),
      );
    }
  }
  const awards = awardLabels(top.h);
  if (awards.length) why.push(`Recognised by ${awards.join(' · ')}.`);
  if (top.o.firstHand && top.o.personalScoreLabel) why.push(`We stayed here and scored it ${top.o.personalScoreLabel}.`);

  const consider: string[] = [];
  for (const r of others) {
    if (r.closed) {
      consider.push(`${r.h.name} is listed as ${r.status || 'closed'}, so it was left out.`);
      continue;
    }
    const bits: string[] = [];
    if (r.guest != null && top.guest != null && r.guest > top.guest) {
      bits.push(`guests rate it higher (${r.guest}/100${r.reviews ? ` from ${n(r.reviews)} reviews` : ''})`);
    }
    if (r.critic != null && (top.critic == null || r.critic > top.critic)) bits.push(`critics score it ${r.critic}/100`);
    if (bits.length) consider.push(`Consider ${r.h.name} if that matters most: ${bits.join(' and ')}.`);
  }
  if (top.reviews != null && top.reviews < 100) {
    consider.push(`The guest score for ${top.h.name} rests on fewer than 100 reviews, so treat it as a guide.`);
  }
  return { title, why, consider };
}
