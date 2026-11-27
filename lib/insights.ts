import CLIMATE_RULES from './climate-rules.json';
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
  Sheraton: 'Marriott Bonvoy',
  Westin: 'Marriott Bonvoy',
  'Park Hyatt': 'World of Hyatt',
  Alila: 'World of Hyatt',
  Andaz: 'World of Hyatt',
  'Grand Hyatt': 'World of Hyatt',
  'Hyatt Regency': 'World of Hyatt',
  'Hyatt Centric': 'World of Hyatt',
  'Thompson Hotels': 'World of Hyatt',
  'Secrets Resorts': 'World of Hyatt',
  'Dreams Resorts': 'World of Hyatt',
  'Alua Hotels': 'World of Hyatt',
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
  [/\bsheraton\b/i, 'Sheraton'],
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
  [/\bdreams\b/i, 'Dreams Resorts'],
  [/\balua\b/i, 'Alua Hotels'],
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

/**
 * Best months to go: the same rules, in the same order, as stayodds.com (CLIMATE_RULES_PY in
 * build_stayodds_site.py, exported to climate-rules.json), so the app and the website agree.
 */
const MONTH_INDEX: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

const CLIMATE: { re: RegExp; label: string; note: string; months: number[] }[] = (CLIMATE_RULES as [string, string, string][]).map(
  ([pattern, label, note]) => ({ re: new RegExp(pattern, 'i'), label, note, months: monthsFromLabel(label) })
);

/** "Apr–May & Oct–Nov" -> [4, 5, 10, 11]; "Year-Round ..." -> every month; ranges wrap over New Year. */
function monthsFromLabel(label: string): number[] {
  if (/year-round/i.test(label)) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const out = new Set<number>();
  const re = /([A-Z][a-z]{2})\s*[–-]\s*([A-Z][a-z]{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(label))) {
    const a = MONTH_INDEX[m[1].toLowerCase()];
    const b = MONTH_INDEX[m[2].toLowerCase()];
    if (!a || !b) continue;
    for (let k = a; ; k = (k % 12) + 1) {
      out.add(k);
      if (k === b) break;
    }
  }
  return out.size ? [...out].sort((x, y) => x - y) : [3, 4, 5, 9, 10, 11];
}

export function getBestMonths(hotel: Hotel): BestMonthsInfo {
  const hay = `${hotel.name || ''} ${hotel.location || ''} ${hotel.country || ''} ${hotel.region || ''}`;
  const rule = CLIMATE.find((r) => r.re.test(hay));
  if (rule) return { months: rule.months, shortLabel: rule.label, note: rule.note };
  return { months: [3, 4, 5, 9, 10, 11], shortLabel: 'Spring & Autumn', note: 'Mild shoulder-season conditions' };
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

export interface RoomTipInfo {
  text: string;
  isUnchartedTip: boolean;
  label: string;
}

const VERIFIED_FIRST_HAND_ROOM_TIPS: Record<string, string> = {
  'st-regis-bali': 'Skip the older 2008 main-building suites — book a private villa instead for fresher finishes and more space.',
  'ritz-carlton-bali': 'Book a Pavilion Pool Villa for newer interiors, direct lagoon-style privacy, and strong value vs. nearby Nusa Dua rivals.',
  'the-sira-lombok': 'Book a Beachfront Pool Villa for a brand-new layout, private pool, butler care, and direct sand access.',
  'w-bali-seminyak': 'Book a One-Bedroom Oasis Pool Villa (~£400/night) — one of the best-value private-pool villa categories in Seminyak.',
  'radisson-blu-maldives': 'Every villa category includes a private infinity pool and overwater hammock — even entry villas deliver the full Maldives setup.',
  'four-seasons-jimbaran': 'Ask for a renovated villa — older 30-year-old villa interiors felt noticeably bare on our stay (3/5 Rooms score).',
  'w-maldives': 'Book a refurbished overwater villa with direct reef access so you can snorkel straight off your deck.',
  'bask-gili-meno': 'Book a Beachfront Pool Villa for large private pools with turtle snorkeling steps from your sun lounger.',
  'phulay-bay-krabi': 'Book a Pool Villa — the cavernous 20ft-ceiling layouts are the centerpiece (and a standout 80k Bonvoy points sweet spot).',
  'w-koh-samui': 'All 75 villas come with a private pool — just note 2010 villa finishes feel slightly older than newer Samui rivals.',
  'como-uma-canggu': 'Modern rooms feature outdoor showers and real soundproofing from busy Canggu — a sharp ~£200/night luxury base.',
  'regent-bali-canggu': 'Book a 1-Bedroom Suite — flawlessly designed, spacious room hardware is a standout highlight right on Canggu beach.',
  'taaktana-labuan-bajo': 'Pick between the brand-new Private Pool Villas or Overwater Villas — both include dedicated 24/7 butler service.',
  'finolhu-baa-atoll': 'Book an Ocean Water Villa for spacious overwater living with easy access to the 1.8km sandbank.',
  'st-regis-bora-bora': 'Overwater Villas start at a massive 1,550+ sq ft — classic styling with one of Bora Bora’s largest room footprints.',
  'westin-bora-bora': 'Fresh modern Polynesian bungalows & villas — newer and more comfortable inside than St. Regis next door.',
  'four-seasons-koh-samui': 'Hillside Pool Villas deliver iconic palm-framed ocean views, though classic interiors feel slightly dated for the price.',
  'le-meridien-maldives': 'Stylish modern beach and overwater villas — one of the smartest Marriott Bonvoy points redemptions in the Maldives.',
  'w-algarve': 'Watch for elite suite upgrades (the Supreme Two-Bedroom Suite is standout) — note a few suite layouts have quirky details.',
  'rayavadee-krabi': 'Two-story jungle Pavilions tucked beneath limestone cliffs offer real privacy across the boat-only peninsula.',
  'cocana-gili-t': 'Book a Private Pool Villa for true modern 5-star resort comfort on Gili Trawangan.',
  'manor-house-castle-combe': 'Choose between historic 14th-century manor rooms or picturesque garden cottages beside Castle Combe village.',
  'heights-melasti-bali': 'The modern 2-Bedroom Private Pool Villa is strong Uluwatu value (pack mosquito repellent for open-air bathrooms).',
  'the-pod-singapore': "Book a single 'bookshelf' capsule with privacy blind for 1–2 night solo stopovers (expect shared-room noise).",
  'the-edge-bali': 'Book an ultra-private Cliffside Villa — includes privileged quiet access outside busy dayclub hours.',
  'sebali-nusa-penida': 'Book a Pool-Access Room for rare beachfront resort polish on Nusa Penida.',
  'hiliwatu-ubud': "Modern rainforest-valley balcony suites deliver dramatic jungle views at a fraction of Mandapa's nightly rate.",
  'four-seasons-bangkok': 'Standard riverside rooms already outclass many resort suites — spacious Jean-Michel Gathy design throughout.',
  'the-ungasan-bali': 'Private multi-bedroom clifftop villas are grouped into intimate neighborhoods sharing huge infinity pools.',
  'kin-house-wiltshire': 'Primarily booked as an exclusive-use Georgian house for private groups and weddings rather than individual rooms.',
};

const SPECIFIC_ROOM_CATEGORY_RE =
  /\b(\d+[- ]?(?:bedroom|room|suite|villa|casita|bungalow|pavilion|tented\s+(?:suite|villa))s?|all[- ](?:suite|villa|casita|pool[- ]villa)|overwater\s+(?:pool\s+)?villas?|beachfront\s+(?:pool\s+)?villas?|beach\s+(?:pool\s+)?villas?|private[- ]pool\s+(?:villas?|suites?)|swim[- ]up\s+(?:rooms?|suites?)|ocean[- ]view\s+(?:rooms?|suites?|villas?)|cliffside\s+(?:pool\s+)?villas?|hillside\s+(?:pool\s+)?(?:villas?|casitas?)|lagoon\s+(?:pool\s+)?villas?|tented\s+(?:suites?|villas?|camps?)|treehouses?|penthouse\s+suites?|junior\s+suites?|garden\s+(?:pool\s+)?villas?|bungalows?|casitas?)\b/i;

function extractStrictRoomClause(rawText?: string | null): string | null {
  const txt = String(rawText || '').trim();
  if (!txt) return null;
  const parts = txt
    .split(/(?:(?<=[.!?])\s+|\s+[—–]\s+|;\s+)/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (!SPECIFIC_ROOM_CATEGORY_RE.test(part)) continue;
    const subParts = part.split(/,\s+(?=(?:and\s+|plus\s+|with\s+|featuring\s+)?)/i);
    const roomSegments = subParts.filter((seg) => SPECIFIC_ROOM_CATEGORY_RE.test(seg));
    if (roomSegments.length) {
      let clean = roomSegments.slice(0, 2).join(', ').replace(/^(?:featuring|with|and|plus)\s+/i, '').trim();
      clean = clean.replace(/[.;,\s]+$/, '');
      if (clean.length >= 16 && clean.length <= 180) {
        return clean.charAt(0).toUpperCase() + clean.slice(1) + '.';
      }
    }
  }
  return null;
}

export function getRoomTipInfo(hotel: Hotel): RoomTipInfo | null {
  if (!hotel) return null;
  const id = String(hotel.id || '').trim();
  if (VERIFIED_FIRST_HAND_ROOM_TIPS[id]) {
    return {
      text: VERIFIED_FIRST_HAND_ROOM_TIPS[id],
      isUnchartedTip: true,
      label: 'Rooms to Book (Uncharted Note)',
    };
  }
  const candidates = [hotel.standout, hotel.verdict].filter(Boolean) as string[];
  for (const c of candidates) {
    const clause = extractStrictRoomClause(c);
    if (clause) {
      return {
        text: clause,
        isUnchartedTip: false,
        label: 'Room & Villa Setup',
      };
    }
  }
  return null;
}

export function getVerifiedRoomTip(hotel: Hotel): string | null {
  return getRoomTipInfo(hotel)?.text || null;
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
