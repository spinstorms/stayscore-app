import { LIVE_BASE_URL } from './api';
import type { Hotel } from './types';

export interface BrandCategories {
  primaryBrand: string;
  parentGroup: string | null;
  allBrands: string[];
}

export interface PartnerPrograms {
  brand: string;
  parentGroup: string | null;
  preferredProgram: string | null;
  pointsProgram: string | null;
  isPointsEligible: boolean;
  hasPreferredPerks: boolean;
}

export interface BestMonthsInfo {
  months: number[];
  shortLabel: string;
  note: string;
}

export interface GuestProfileInfo {
  adultsOnly: boolean;
  familyFriendly: boolean;
  badgeLabel: string | null;
  detail: string | null;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SUBBRAND_PARENT_MAP: Record<string, string> = {
  'W Hotels': 'Marriott Bonvoy',
  'St. Regis': 'Marriott Bonvoy',
  'The Ritz-Carlton': 'Marriott Bonvoy',
  'Ritz-Carlton Reserve': 'Marriott Bonvoy',
  'The Luxury Collection': 'Marriott Bonvoy',
  EDITION: 'Marriott Bonvoy',
  'JW Marriott': 'Marriott Bonvoy',
  'Le Méridien': 'Marriott Bonvoy',
  'Autograph Collection': 'Marriott Bonvoy',
  'Tribute Portfolio': 'Marriott Bonvoy',
  'Courtyard by Marriott': 'Marriott Bonvoy',
  'Element by Westin': 'Marriott Bonvoy',
  Westin: 'Marriott Bonvoy',
  'Park Hyatt': 'World of Hyatt',
  Alila: 'World of Hyatt',
  Andaz: 'World of Hyatt',
  'Grand Hyatt': 'World of Hyatt',
  'Hyatt Regency': 'World of Hyatt',
  'Hyatt Centric': 'World of Hyatt',
  'Thompson Hotels': 'World of Hyatt',
  'Secrets Resorts': 'World of Hyatt',
  'Zoëtry': 'World of Hyatt',
  'Hyatt All-Inclusive': 'World of Hyatt',
  Miraval: 'World of Hyatt',
  'Waldorf Astoria': 'Hilton Honors',
  Conrad: 'Hilton Honors',
  'LXR Hotels & Resorts': 'Hilton Honors',
  'Tapestry Collection by Hilton': 'Hilton Honors',
  'Canopy by Hilton': 'Hilton Honors',
  'Six Senses': 'IHG One Rewards',
  Regent: 'IHG One Rewards',
  InterContinental: 'IHG One Rewards',
  Kimpton: 'IHG One Rewards',
  'Vignette Collection': 'IHG One Rewards',
  'Hotel Indigo': 'IHG One Rewards',
  'Crowne Plaza': 'IHG One Rewards',
  Raffles: 'Accor',
  Fairmont: 'Accor',
  'Sofitel Legend': 'Accor',
  'Banyan Tree': 'Accor',
  Belmond: 'LVMH Hospitality',
  'Cheval Blanc': 'LVMH Hospitality',
};

const CANONICAL_BRAND_PATTERNS: [RegExp, string][] = [
  [/\bfour\s+seasons\b/i, 'Four Seasons'],
  [/\britz[-\s]?carlton\s+reserve\b/i, 'Ritz-Carlton Reserve'],
  [/\b(?:the\s+)?ritz[-\s]?carlton\b/i, 'The Ritz-Carlton'],
  [/\bst\.?\s*regis\b/i, 'St. Regis'],
  [/^(?:the\s+luxury\s+collection|marriott\s+luxury\s+collection)\b|,\s*a\s+luxury\s+collection\b/i, 'The Luxury Collection'],
  [/\bw\s+hotels?\b|^w\s+(?:maldives|bali|koh\s+samui|algarve|sardinia|osaka|sydney|punta\s+cana|new\s+york|verbier|barcelona|london|rome|dubai|doha|singapore|tokyo|kyoto|miami|south\s+beach|aspen|costa\s+rica|scottsdale|hong\s+kong|amsterdam|ibiza|budapest|prague|florence|edinburgh|macau|taipei|melbourne|brisbane)\b/i, 'W Hotels'],
  [/\bvirgin\s+limited\s+edition\b/i, 'Virgin Limited Edition'],
  [/\bedition\b/i, 'EDITION'],
  [/\bjw\s+marriott\b/i, 'JW Marriott'],
  [/\belement\s+by\s+westin\b/i, 'Element by Westin'],
  [/\bwestin\b/i, 'Westin'],
  [/\ble\s+m[eé]ridien\b/i, 'Le Méridien'],
  [/\bautograph\s+collection\b/i, 'Autograph Collection'],
  [/\btribute\s+portfolio\b/i, 'Tribute Portfolio'],
  [/\bcourtyard\s+by\s+marriott\b/i, 'Courtyard by Marriott'],
  [/\baman(?:puri|pulo|giri|zoe|kora|wella|galla|bagh|i[-\s]?khas|dara|jiwo|kila|dusa|sara|taka|emu|oi|fayun|dayan|yangyun|ruya|jena|le\s+m[eé]l[eé]zin|sveti|venice|tokyo|kyoto|new\s+york|bangkok|nai\s+lert)?\b/i, 'Aman'],
  [/\brosewood\b/i, 'Rosewood'],
  [/\bpark\s+hyatt\b/i, 'Park Hyatt'],
  [/\balila\b/i, 'Alila'],
  [/\bandaz\b/i, 'Andaz'],
  [/\bgrand\s+hyatt\b/i, 'Grand Hyatt'],
  [/\bhyatt\s+regency\b/i, 'Hyatt Regency'],
  [/\bhyatt\s+centric\b/i, 'Hyatt Centric'],
  [/\bthompson\b/i, 'Thompson Hotels'],
  [/\bsecrets\b/i, 'Secrets Resorts'],
  [/\bzo[eë]try\b/i, 'Zoëtry'],
  [/\bhyatt\s+(?:zilara|ziva)\b/i, 'Hyatt All-Inclusive'],
  [/\bwaldorf\s+astoria\b/i, 'Waldorf Astoria'],
  [/\bconrad\b/i, 'Conrad'],
  [/\blxr\b/i, 'LXR Hotels & Resorts'],
  [/\btapestry\s+collection\b/i, 'Tapestry Collection by Hilton'],
  [/\bcanopy\s+by\s+hilton\b/i, 'Canopy by Hilton'],
  [/\bsix\s+senses\b/i, 'Six Senses'],
  [/\bregent\b/i, 'Regent'],
  [/\bintercontinental\b/i, 'InterContinental'],
  [/\bkimpton\b/i, 'Kimpton'],
  [/\bvignette\s+collection\b/i, 'Vignette Collection'],
  [/\bhotel\s+indigo\b/i, 'Hotel Indigo'],
  [/\bcrowne\s+plaza\b/i, 'Crowne Plaza'],
  [/\braffles\b/i, 'Raffles'],
  [/\bfairmont\b/i, 'Fairmont'],
  [/\bsofitel\b/i, 'Sofitel Legend'],
  [/\bbanyan\s+tree\b/i, 'Banyan Tree'],
  [/\bbelmond\b/i, 'Belmond'],
  [/\bcheval\s+blanc\b/i, 'Cheval Blanc'],
  [/\bone\s*&\s*only\b|\bone&only\b/i, 'One&Only'],
  [/\bmandarin\s+oriental\b/i, 'Mandarin Oriental'],
  [/\bbaillie\s+lodges\b|\bsouthern\s+ocean\s+lodge\b|\blongitude\s+131\b|\bcapella\s+lodge\b|\bsilky\s+oaks\b|\bhuka\s+lodge\b/i, 'Baillie Lodges'],
  [/\bcapella\b/i, 'Capella'],
  [/\bthe\s+peninsula\b/i, 'The Peninsula'],
  [/\boetker\b|\bhotel\s+du\s+cap[-\s]eden[-\s]roc\b|\ble\s+bristol\b|\beden\s+rock\b|\bjumby\s+bay\b|\blanesborough\b|\bpalacio\s+tangara\b/i, 'Oetker Collection'],
  [/\bdorchester\b|\bhotel\s+plaza\s+ath[eé]n[eé]e\b|\ble\s+meurice\b|\bhotel\s+eden\b|\bprincipe\s+di\s+savoia\b|\bbeverly\s+hills\s+hotel\b|\bhotel\s+bel[-\s]air\b|\bthe\s+lana\b/i, 'Dorchester Collection'],
  [/\bshangri[-\s]?la\b/i, 'Shangri-La'],
  [/\bjumeirah\b/i, 'Jumeirah'],
  [/\bauberge\b/i, 'Auberge Resorts'],
  [/\bhoshinoya\b/i, 'HOSHINOYA'],
  [/\bsingita\b/i, 'Singita'],
  [/\b&beyond\b|\bandbeyond\b/i, '&Beyond'],
  [/\bsoneva\b/i, 'Soneva'],
  [/\boberoi\b/i, 'Oberoi'],
  [/\btaj\b|umaid\s+bhawan|rambagh\s+palace/i, 'Taj Hotels'],
  [/\bbulgari\b|\bbvlgari\b/i, 'Bulgari Hotels'],
  [/\bkempinski\b/i, 'Kempinski'],
  [/\bsmall\s+luxury\s+hotels\b|\bslh\b/i, 'Small Luxury Hotels'],
  [/\bdesign\s+hotels\b/i, 'Design Hotels'],
  [/\bmarriott\b/i, 'Marriott Bonvoy'],
  [/\bhyatt\b/i, 'World of Hyatt'],
  [/\bhilton\b/i, 'Hilton Honors'],
  [/\bihg\b/i, 'IHG One Rewards'],
];

export function normalizeBrandName(hotel: Hotel): string {
  const raw = String(hotel.brand || '').trim();
  const isGenericRaw = /^(independent|boutique|boutique\s+ultra[- ]luxury|luxury\s+collection\s*&\s*boutique|other|none|unknown)$/i.test(raw);
  const safeRaw = isGenericRaw ? '' : raw;
  const name = String(hotel.name || '').trim();
  if (/\bcomo\b/i.test(safeRaw) || /^como\b/i.test(name)) return 'COMO Hotels';
  const hay = `${safeRaw} ${name}`.trim();
  for (const [re, canonical] of CANONICAL_BRAND_PATTERNS) {
    if (re.test(hay)) return canonical;
  }
  if (safeRaw) return safeRaw;
  return 'Independent & Boutique';
}

export function getBrandCategories(hotel: Hotel): BrandCategories {
  const primaryBrand = normalizeBrandName(hotel);
  const raw = String(hotel.brand || '').trim();
  let parentGroup = SUBBRAND_PARENT_MAP[primaryBrand] || null;
  if (primaryBrand === 'Design Hotels' && /marriott/i.test(raw)) {
    parentGroup = 'Marriott Bonvoy';
  }
  const allBrands = parentGroup && parentGroup !== primaryBrand ? [primaryBrand, parentGroup] : [primaryBrand];
  return { primaryBrand, parentGroup, allBrands };
}

export function matchesBrandCategory(hotel: Hotel, targetBrand: string): boolean {
  if (!targetBrand || targetBrand === 'All') return true;
  const t = targetBrand.trim().toLowerCase();
  const { allBrands } = getBrandCategories(hotel);
  return allBrands.some((b) => b.toLowerCase() === t);
}

// Strictly brand-wide official Preferred Partner programs (zero unverified blanket Virtuoso guesses)
const PREFERRED_PARTNER_MAP: Record<string, string> = {
  'Four Seasons': 'Four Seasons Preferred',
  Rosewood: 'Rosewood Elite',
  'The Ritz-Carlton': 'Marriott STARS',
  'Ritz-Carlton Reserve': 'Marriott STARS',
  'St. Regis': 'Marriott STARS',
  'The Luxury Collection': 'Marriott STARS',
  EDITION: 'Marriott STARS',
  'Bulgari Hotels': 'Marriott STARS',
  'W Hotels': 'Marriott Luminous',
  'JW Marriott': 'Marriott Luminous',
  Westin: 'Marriott Luminous',
  'Le Méridien': 'Marriott Luminous',
  'Autograph Collection': 'Marriott Luminous',
  'Tribute Portfolio': 'Marriott Luminous',
  'Park Hyatt': 'Hyatt Privé',
  Alila: 'Hyatt Privé',
  Andaz: 'Hyatt Privé',
  'Grand Hyatt': 'Hyatt Privé',
  'Thompson Hotels': 'Hyatt Privé',
  'Waldorf Astoria': 'Hilton for Luxury',
  Conrad: 'Hilton for Luxury',
  'LXR Hotels & Resorts': 'Hilton for Luxury',
  'Six Senses': 'IHG Destined',
  Regent: 'IHG Destined',
  InterContinental: 'IHG Destined',
  Kimpton: 'IHG Destined',
  'Vignette Collection': 'IHG Destined',
  Raffles: 'Accor STEP',
  Fairmont: 'Accor STEP',
  'Sofitel Legend': 'Accor STEP',
  'Banyan Tree': 'Accor STEP',
  Belmond: 'Belmond Bellini Club',
  'Mandarin Oriental': 'Mandarin Oriental Fan Club',
  'Oetker Collection': 'Oetker Pearl Partner',
  'The Peninsula': 'Peninsula PenClub',
  'Dorchester Collection': 'Dorchester Diamond Club',
  'Shangri-La': 'Shangri-La Luxury Circle',
  'Leading Hotels of the World': 'LHW Leaders Club',
  'Small Luxury Hotels': 'SLH Invited',
};

export function getPartnerPrograms(hotel: Hotel): PartnerPrograms {
  const { primaryBrand, parentGroup } = getBrandCategories(hotel);
  const preferredProgram = PREFERRED_PARTNER_MAP[primaryBrand] || null;
  let pointsProgram: string | null = null;
  if (parentGroup && parentGroup !== 'LVMH Hospitality') {
    pointsProgram = parentGroup === 'Accor' ? 'Accor ALL' : parentGroup;
  } else if (
    ['Marriott Bonvoy', 'World of Hyatt', 'Hilton Honors', 'IHG One Rewards'].includes(primaryBrand)
  ) {
    pointsProgram = primaryBrand;
  }
  return {
    brand: primaryBrand,
    parentGroup,
    preferredProgram,
    pointsProgram,
    isPointsEligible: Boolean(pointsProgram),
    hasPreferredPerks: Boolean(preferredProgram),
  };
}

export function getBestMonths(hotel: Hotel): BestMonthsInfo {
  const country = String(hotel.country || '').toLowerCase();
  const region = String(hotel.region || '').toLowerCase();
  const loc = String(hotel.location || '').toLowerCase();

  if (region.includes('maldives') || country.includes('maldives')) {
    return { months: [1, 2, 3, 4, 12], shortLabel: 'Dec–Apr', note: 'Dry northeast monsoon & calmest visibility' };
  }
  if (country.includes('indonesia') || region.includes('bali')) {
    return { months: [5, 6, 7, 8, 9, 10], shortLabel: 'May–Oct', note: 'Dry season with low humidity & clear seas' };
  }
  if (country.includes('thailand')) {
    if (/samui|phangan/i.test(loc)) {
      return { months: [1, 2, 3, 4, 6, 7, 8], shortLabel: 'Jan–Apr, Jun–Aug', note: 'Gulf of Thailand dry windows' };
    }
    return { months: [11, 12, 1, 2, 3], shortLabel: 'Nov–Mar', note: 'Cool, dry Andaman & Bangkok peak season' };
  }
  if (country.includes('japan')) {
    if (/hokkaido|niseko/i.test(loc)) {
      return { months: [1, 2, 3, 7, 8, 9, 12], shortLabel: 'Dec–Mar (Ski), Jul–Sep', note: 'Powder snow winter & cool green summer' };
    }
    return { months: [3, 4, 5, 10, 11], shortLabel: 'Mar–May, Oct–Nov', note: 'Cherry blossom spring & crisp autumn foliage' };
  }
  if (country.includes('australia')) {
    if (/queensland|lizard|orpheus|whitsunday|daintree|port douglas|uluru/i.test(loc)) {
      return { months: [5, 6, 7, 8, 9, 10], shortLabel: 'May–Oct', note: 'Dry tropical & Outback winter sunshine' };
    }
    return { months: [11, 12, 1, 2, 3, 4], shortLabel: 'Nov–Apr', note: 'Warm Southern Hemisphere summer & autumn' };
  }
  if (country.includes('new zealand')) {
    return { months: [11, 12, 1, 2, 3, 4], shortLabel: 'Nov–Apr', note: 'Long sunlit summer & autumn days' };
  }
  if (country.includes('greece') || country.includes('turkey') || country.includes('italy') || country.includes('spain') || country.includes('portugal') || country.includes('croatia')) {
    return { months: [5, 6, 9, 10], shortLabel: 'May–Jun, Sep–Oct', note: 'Warm Mediterranean sun without peak-August crowds' };
  }
  if (country.includes('egypt') || region.includes('middle east') || country.includes('united arab emirates') || country.includes('oman') || country.includes('qatar') || country.includes('saudi arabia')) {
    return { months: [10, 11, 12, 1, 2, 3, 4], shortLabel: 'Oct–Apr', note: 'Pleasant desert winter warmth' };
  }
  if (country.includes('french polynesia') || region.includes('bora bora')) {
    return { months: [5, 6, 7, 8, 9, 10], shortLabel: 'May–Oct', note: 'Dry austral winter with clear lagoon skies' };
  }
  if (region.includes('caribbean') || region.includes('mexico')) {
    return { months: [12, 1, 2, 3, 4], shortLabel: 'Dec–Apr', note: 'Dry winter season outside hurricane window' };
  }
  if (country.includes('south africa')) {
    return { months: [11, 12, 1, 2, 3, 4], shortLabel: 'Nov–Apr', note: 'Warm Cape summer & wine-country sunshine' };
  }
  if (country.includes('kenya') || country.includes('tanzania') || country.includes('botswana') || country.includes('rwanda')) {
    return { months: [6, 7, 8, 9, 10], shortLabel: 'Jun–Oct', note: 'Dry safari season & peak wildlife viewing' };
  }
  if (country.includes('switzerland') || country.includes('austria') || country.includes('norway') || country.includes('iceland')) {
    return { months: [1, 2, 3, 6, 7, 8, 9], shortLabel: 'Jan–Mar, Jun–Sep', note: 'Alpine snow season & bright Nordic summer' };
  }
  if (region.includes('europe')) {
    return { months: [5, 6, 7, 8, 9, 10], shortLabel: 'May–Oct', note: 'Mild European late spring through early autumn' };
  }
  if (country.includes('peru') || country.includes('chile')) {
    return { months: [5, 6, 7, 8, 9, 10], shortLabel: 'May–Oct', note: 'Clear Andean dry season' };
  }
  if (region.includes('indian ocean') || country.includes('seychelles') || country.includes('mauritius')) {
    return { months: [4, 5, 10, 11], shortLabel: 'Apr–May, Oct–Nov', note: 'Calmest seas between trade-wind seasons' };
  }
  return { months: [4, 5, 6, 9, 10], shortLabel: 'Apr–Jun, Sep–Oct', note: 'Balanced shoulder-season weather' };
}

export function isBestInMonth(hotel: Hotel, monthNum: number): boolean {
  if (!monthNum || monthNum < 1 || monthNum > 12) return true;
  return getBestMonths(hotel).months.includes(monthNum);
}

export function getMonthShortName(monthNum: number): string {
  return MONTH_LABELS[monthNum - 1] || '';
}

const VERIFIED_ADULTS_ONLY_IDS = new Set([
  'jade-mountain-st-lucia',
  'hermitage-bay-antigua',
  'baoase-luxury-resort-curacao',
  'secret-bay-dominica',
  'palm-heights-grand-cayman',
  'impressions-moxche-by-secrets',
  'atelier-playa-mujeres',
  'le-blanc-spa-resort-los-cabos',
  'le-blanc-spa-resort-cancun',
  'naviva-four-seasons-punta-mita',
  'w-punta-cana-all-inclusive',
  'komandoo-maldives',
  'hurawalhi-island-resort',
  'kudadoo-maldives-private-island',
  'you-and-me-maldives',
  'saffire-freycinet',
  'qualia-hamilton-island',
  'lizard-island-resort',
  'likuliku-lagoon-resort',
  'al-maha-desert-resort-dubai',
  'katikies-santorini',
  'canaves-oia-epitome',
  'amanruya-bodrum',
  'post-ranch-inn',
  'twin-farms-vermont',
  'little-palm-island',
  'calistoga-ranch',
  'amanpulo-philippines',
]);

export function getGuestProfile(hotel: Hotel): GuestProfileInfo {
  const text = `${hotel.name || ''} ${hotel.verdict || ''} ${hotel.standout || ''} ${hotel.watchOut || ''}`.toLowerCase();
  const isAdultsOnly =
    VERIFIED_ADULTS_ONLY_IDS.has(hotel.id) ||
    /\badults[-\s]?only\b|\bno\s+children\b|\b16\+\b|\b18\+\b/i.test(text);

  if (isAdultsOnly) {
    return {
      adultsOnly: true,
      familyFriendly: false,
      badgeLabel: '🥂 Adults-Only',
      detail: 'Adults-only / romantic retreat atmosphere',
    };
  }

  const isFamily =
    /\bkids?\s*club\b|\bfamil(?:y|ies)\b|\bchildren\b|\bwater\s*park\b|\bteen\b|\bmulti[-\s]?gen\b/i.test(text) ||
    ['Four Seasons', 'St. Regis', 'The Ritz-Carlton', 'One&Only', 'Rosewood', 'Soneva', 'Six Senses', 'Jumeirah'].includes(
      normalizeBrandName(hotel)
    );

  if (isFamily) {
    return {
      adultsOnly: false,
      familyFriendly: true,
      badgeLabel: '👨‍👩‍👧 Family & Kids',
      detail: 'Welcomes families & dedicated kids programming',
    };
  }

  return {
    adultsOnly: false,
    familyFriendly: false,
    badgeLabel: null,
    detail: null,
  };
}

export function getVerifiedRoomTip(hotel: Hotel): string | null {
  if (!hotel.visitedByUs) return null;
  const sources = [hotel.standout, hotel.whereWeDiffer, hotel.verdict].filter(Boolean) as string[];
  for (const s of sources) {
    if (/\b(villa|suite|room|overwater|lagoon|beach|sunset|sunrise|pool|floor|wing|upgrade|bungalow|pavilion)\b/i.test(s)) {
      return s.trim();
    }
  }
  return hotel.standout ? hotel.standout.trim() : null;
}

/**
 * Returns a clean resort photo URL (never a YouTube video thumbnail with overlay text)
 * for branded share cards. Keeps YouTube thumbnails on normal browsing cards.
 */
export function getCleanCardPhotoUrl(hotel: Hotel): string {
  const thumb = String(hotel.thumbnail || '').trim();
  const isYoutubeThumb = /img\.youtube\.com|i\.ytimg\.com/i.test(thumb);
  if (isYoutubeThumb || hotel.videoId) {
    return `${LIVE_BASE_URL}/assets/card-photos/${encodeURIComponent(hotel.id)}.webp?v=2`;
  }
  return thumb || `${LIVE_BASE_URL}/assets/thumbs/${encodeURIComponent(hotel.id)}.webp`;
}
