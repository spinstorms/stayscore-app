import type { StayOddsResult } from './scoring';
import type { Hotel } from './types';

export interface PropertyStatusMeta {
  hasDetails: boolean;
  operatingStatus: string;
  badge: string;
  tone: 'neutral' | 'open' | 'warn' | 'danger';
  renovationsExtensions: string;
  nearbyConstruction: string;
  sourceUrl: string;
  sourceNote: string;
  verifiedAt: string;
  shortSummary: string;
}

export function getPropertyStatusMeta(hotel: Hotel | null | undefined): PropertyStatusMeta {
  const st = hotel?.propertyStatus;
  const op = String(st?.operatingStatus || '').trim();
  const reno = String(st?.renovationsExtensions || '').trim();
  const nearby = String(st?.nearbyConstruction || '').trim();
  const sourceUrl = String(st?.sourceUrl || '').trim();
  const sourceNote = String(st?.sourceNote || '').trim();
  const verifiedAt = String(st?.verifiedAt || '').trim();

  const hasDetails = Boolean(op || reno || nearby);
  const lower = op.toLowerCase();

  let badge = op || 'No Confirmed Works Listed';
  let tone: PropertyStatusMeta['tone'] = 'neutral';
  if (lower.includes('closed')) {
    tone = 'danger';
  } else if (lower.includes('rebrand') || lower.includes('transition') || Boolean(nearby)) {
    tone = 'warn';
  } else if (op === 'Open' && reno) {
    tone = 'open';
    badge = 'Open · Confirmed Works';
  } else if (op === 'Open') {
    tone = 'open';
  }

  let shortSummary = 'No confirmed renovations, closures, or nearby works listed';
  if (lower.includes('closed')) {
    shortSummary = reno || `${op} — verify reopening dates before planning travel.`;
  } else if (lower.includes('rebrand') || lower.includes('transition')) {
    shortSummary = reno || `${op} — verify current brand & operator.`;
  } else if (reno && nearby) {
    shortSummary = `${reno} Nearby: ${nearby}`;
  } else if (reno) {
    shortSummary = reno;
  } else if (nearby) {
    shortSummary = `Nearby works: ${nearby}`;
  }

  return {
    hasDetails,
    operatingStatus: op || 'No confirmed works listed',
    badge,
    tone,
    renovationsExtensions: reno,
    nearbyConstruction: nearby,
    sourceUrl,
    sourceNote,
    verifiedAt,
    shortSummary,
  };
}

export function extractTopKeyFacts(
  hotel: Hotel,
  odds: StayOddsResult,
  maxCount = 3
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const kf of odds.keyFacts || []) {
    if (kf.label && kf.value) out.push({ label: kf.label, value: kf.value });
  }
  if (out.length < maxCount && hotel.priceRange) {
    out.push({ label: 'Indicative Tier', value: hotel.priceRange });
  }
  if (out.length < maxCount && hotel.standout) {
    out.push({ label: 'Standout', value: hotel.standout });
  }
  return out.slice(0, maxCount);
}

export function buildFactualVsVerdict(
  hotelA: Hotel,
  hotelB: Hotel,
  oddsA: StayOddsResult,
  oddsB: StayOddsResult
): { headline: string; detail: string; winnerSide: 'A' | 'B' | 'TIE' } {
  const stA = getPropertyStatusMeta(hotelA);
  const stB = getPropertyStatusMeta(hotelB);
  const aClosed = stA.tone === 'danger';
  const bClosed = stB.tone === 'danger';

  const scoreA = oddsA.greatStayOdds;
  const scoreB = oddsB.greatStayOdds;

  if (aClosed && !bClosed) {
    return {
      headline: `Status Alert: ${hotelA.name} is ${stA.operatingStatus}`,
      detail: `${hotelB.name} is the active option right now${scoreB != null ? ` (${scoreB}% StayOdds)` : ''}. Verify ${hotelA.name} reopening dates first.`,
      winnerSide: 'B',
    };
  }
  if (bClosed && !aClosed) {
    return {
      headline: `Status Alert: ${hotelB.name} is ${stB.operatingStatus}`,
      detail: `${hotelA.name} is the active option right now${scoreA != null ? ` (${scoreA}% StayOdds)` : ''}. Verify ${hotelB.name} reopening dates first.`,
      winnerSide: 'A',
    };
  }

  if (scoreA != null && scoreB != null) {
    const diff = scoreA - scoreB;
    if (diff === 0) {
      return {
        headline: `Dead Heat at ${scoreA}% StayOdds`,
        detail: 'Compare verified Key Facts, Opinion Gap, and beach/transfer trade-offs below.',
        winnerSide: 'TIE',
      };
    }
    const winH = diff > 0 ? hotelA : hotelB;
    const loseH = diff > 0 ? hotelB : hotelA;
    const winO = diff > 0 ? oddsA : oddsB;
    const loseO = diff > 0 ? oddsB : oddsA;
    const reasons: string[] = [];
    if (winO.firstHand && winO.personalScoreLabel) reasons.push(`My Stay ${winO.personalScoreLabel}`);
    if (winO.verifiedGuest) {
      reasons.push(`Verified Guests ${winO.verifiedGuest.rating.toFixed(1)}/${winO.verifiedGuest.scale}`);
    }
    if (winO.statusBadge) reasons.push(winO.statusBadge);
    return {
      headline: `${winH.name} leads by +${Math.abs(diff)}% (${winO.greatStayOdds}% vs ${loseO.greatStayOdds}%)`,
      detail: reasons.length
        ? `Backed by ${reasons.join(' • ')}. Compare verified facts & caveats against ${loseH.name}.`
        : 'Leads on verified StayOdds data across available guest & critic sources.',
      winnerSide: diff > 0 ? 'A' : 'B',
    };
  }

  if (scoreA != null || scoreB != null) {
    const scoredH = scoreA != null ? hotelA : hotelB;
    const scoredO = scoreA != null ? oddsA : oddsB;
    return {
      headline: `${scoredH.name}: ${scoredO.greatStayOdds}% Verified StayOdds`,
      detail: `Only ${scoredH.name} has a static verified numeric score so far — check live Google reviews & Key Facts on StayOdds.`,
      winnerSide: scoreA != null ? 'A' : 'B',
    };
  }

  return {
    headline: `${hotelA.name} vs ${hotelB.name}`,
    detail: 'Compare verified official awards, key property facts, and live guest ratings — zero fabricated numbers.',
    winnerSide: 'TIE',
  };
}

function shortCriticSource(name = ''): string {
  const s = name.trim();
  if (!s) return '';
  if (/flip-flop/i.test(s)) return 'Flip-Flop';
  if (/walker/i.test(s)) return 'Walker Index';
  if (/nonstop\s*dan/i.test(s)) return 'Nonstop Dan';
  if (/telegraph/i.test(s)) return 'Telegraph';
  if (/fat\s*voyage/i.test(s)) return 'Fat Voyage';
  if (/forbes/i.test(s)) return 'Forbes';
  return s.length > 14 ? `${s.slice(0, 13)}…` : s;
}

export function formatCriticSlot(odds: StayOddsResult): { compact: string; sub: string; full: string } {
  const scored = (odds.editorialRatings || []).filter(
    (e) => typeof e.normalized100 === 'number' && e.normalized100 > 0
  );
  const unverified = odds.unverifiedEditorial || [];
  if (odds.critic100 != null) {
    if (scored.length === 1) {
      const src = scored[0].sourceName || '';
      return {
        compact: `${odds.critic100}/100`,
        sub: shortCriticSource(src) || 'Verified',
        full: `${scored[0].rawScore || `${odds.critic100}/100`}${src ? ` (${src})` : ''}`,
      };
    }
    if (scored.length > 1) {
      return {
        compact: `${odds.critic100}/100`,
        sub: `${scored.length} critics`,
        full: `${odds.critic100}/100 (${scored.length} verified critics)`,
      };
    }
    return { compact: `${odds.critic100}/100`, sub: 'Verified', full: `${odds.critic100}/100` };
  }
  if (unverified.length > 0) {
    const src = unverified[0].sourceName || '';
    return {
      compact: 'Unverified',
      sub: shortCriticSource(src) || 'Score unverified',
      full: `Score awarded — unverified${src ? ` (${src})` : ''}`,
    };
  }
  const qualCount = (odds.editorialRatings?.length || 0) + (odds.youtubeReviews?.length || 0);
  if (qualCount > 0) {
    return {
      compact: 'Review Only',
      sub: `${qualCount} linked`,
      full: `${qualCount} verified review${qualCount > 1 ? 's' : ''} (no numeric score)`,
    };
  }
  return { compact: '—', sub: 'None listed', full: 'None listed' };
}

export function buildVsDeepLink(hotelA: Hotel, hotelB: Hotel): string {
  return `https://uncharteditinerary.com/compare/?a=${encodeURIComponent(hotelA.id)}&b=${encodeURIComponent(hotelB.id)}`;
}

export function buildSingleDeepLink(hotel: Hotel): string {
  return `https://uncharteditinerary.com/stayodds/${encodeURIComponent(hotel.id)}/`;
}

export function buildRedditMarkdownVs(
  hotelA: Hotel,
  hotelB: Hotel,
  oddsA: StayOddsResult,
  oddsB: StayOddsResult
): string {
  const verdict = buildFactualVsVerdict(hotelA, hotelB, oddsA, oddsB);
  const stA = getPropertyStatusMeta(hotelA);
  const stB = getPropertyStatusMeta(hotelB);
  const factsA =
    extractTopKeyFacts(hotelA, oddsA, 2)
      .map((f) => `${f.label}: ${f.value}`)
      .join('; ') || '—';
  const factsB =
    extractTopKeyFacts(hotelB, oddsB, 2)
      .map((f) => `${f.label}: ${f.value}`)
      .join('; ') || '—';

  const guestStr = (o: StayOddsResult) =>
    o.verifiedGuest ? `${o.verifiedGuest.rating.toFixed(1)}/${o.verifiedGuest.scale}` : 'Live on page';
  const myStr = (o: StayOddsResult) =>
    o.personalScoreLabel || (o.visited ? 'Filmed (Unscored)' : 'Not Visited');
  const criticStr = (o: StayOddsResult) => formatCriticSlot(o).full;
  const oddsStr = (o: StayOddsResult) => (o.greatStayOdds != null ? `**${o.greatStayOdds}%**` : 'Open Breakdown');
  const url = buildVsDeepLink(hotelA, hotelB);

  return [
    `### ${hotelA.name} vs ${hotelB.name} — StayOdds Verified Breakdown`,
    ``,
    `**Verdict:** ${verdict.headline}${verdict.detail ? ` — ${verdict.detail}` : ''}`,
    ``,
    `| Metric | ${hotelA.name} | ${hotelB.name} |`,
    `| :--- | :--- | :--- |`,
    `| **Location** | ${hotelA.location}, ${hotelA.country} | ${hotelB.location}, ${hotelB.country} |`,
    `| **StayOdds %** | ${oddsStr(oddsA)} | ${oddsStr(oddsB)} |`,
    `| **Consensus Badge** | ${oddsA.statusBadge} | ${oddsB.statusBadge} |`,
    `| **My Stay** | ${myStr(oddsA)} | ${myStr(oddsB)} |`,
    `| **Critics / Other Reviews** | ${criticStr(oddsA)} | ${criticStr(oddsB)} |`,
    `| **Verified Guests** | ${guestStr(oddsA)} | ${guestStr(oddsB)} |`,
    `| **Opinion Gap** | ${oddsA.opinionGap.deltaLabel} | ${oddsB.opinionGap.deltaLabel} |`,
    `| **Status & Works** | ${stA.hasDetails ? `${stA.operatingStatus}: ${stA.shortSummary}` : 'No confirmed works listed'} | ${stB.hasDetails ? `${stB.operatingStatus}: ${stB.shortSummary}` : 'No confirmed works listed'} |`,
    `| **Verified Key Facts** | ${factsA.replace(/\|/g, '/')} | ${factsB.replace(/\|/g, '/')} |`,
    ``,
    `*Zero fabricated scores — real verified ratings, awards, and property facts only at **[stayodds.com](https://stayodds.com)**.*`,
    `Explore at https://stayodds.com • Direct comparison: ${url}`,
  ].join('\n');
}

export function buildRedditMarkdownSingle(hotel: Hotel, odds: StayOddsResult): string {
  const st = getPropertyStatusMeta(hotel);
  const facts = extractTopKeyFacts(hotel, odds, 3);
  const url = buildSingleDeepLink(hotel);
  const lines = [
    `### ${hotel.name} (${hotel.location}, ${hotel.country}) — StayOdds Verified Scorecard`,
    ``,
    `| Metric | Verified Data |`,
    `| :--- | :--- |`,
    `| **StayOdds %** | ${odds.greatStayOdds != null ? `**${odds.greatStayOdds}%**` : 'Open Breakdown'} |`,
    `| **Status Badge** | ${odds.statusBadge} (${odds.tierLabel}) |`,
    `| **My Stay** | ${odds.personalScoreLabel || (odds.visited ? 'Filmed (Unscored)' : 'Not Visited')} |`,
    `| **Critics / Other Reviews** | ${formatCriticSlot(odds).full} |`,
    `| **Verified Guests** | ${odds.verifiedGuest ? `${odds.verifiedGuest.rating.toFixed(1)}/${odds.verifiedGuest.scale}` : 'Live Google on page'} |`,
    `| **Opinion Gap** | ${odds.opinionGap.deltaLabel} — ${odds.opinionGap.headline} |`,
    `| **Property Status & Works** | ${st.hasDetails ? `${st.operatingStatus}: ${st.shortSummary}` : 'No confirmed renovations, closures, or nearby works listed'} |`,
  ];
  for (const f of facts) {
    lines.push(`| **${f.label}** | ${f.value.replace(/\|/g, '/')} |`);
  }
  lines.push(
    ``,
    `*Zero fabricated scores — real verified data only at **[stayodds.com](https://stayodds.com)**.*`,
    `Explore at https://stayodds.com • Direct breakdown: ${url}`
  );
  return lines.join('\n');
}
