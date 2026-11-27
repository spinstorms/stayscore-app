import { FEATURE_FILTERS, getMichelinKeyCount, getW50BestRank, type VerifiedFeature } from './features';
import { getBrandCategories, isBestInMonth } from './insights';
import type { Hotel } from './types';

/**
 * "Describe your trip" — the same plain-English parser as stayodds.com's trip finder
 * (assets/stayodds-insights.js, parseNaturalTripQuery), matched against the app's hotel data.
 */
export interface TripQuery {
  region: string;
  excludeCountries: string[];
  includeLocations: string[];
  search: string;
  /** search is a place name: match it against where the hotel is only */
  placeSearch?: boolean;
  brand: string | null;
  month: number;
  feature: string;
  style: string;
  priceTier: 'all' | 'under500';
  maxGbp: number | null;
  sortBy: string | null;
  chips: string[];
}

const MONTHS: { m: number; label: string; re: RegExp }[] = [
  { m: 1, label: 'Jan', re: /\b(?:(jan|january))\b/i },
  { m: 2, label: 'Feb', re: /\b(?:(feb|february))\b/i },
  { m: 3, label: 'Mar', re: /\b(?:(mar|march))\b/i },
  { m: 4, label: 'Apr', re: /\b(?:(apr|april))\b/i },
  { m: 5, label: 'May', re: /\bmay\b/i },
  { m: 6, label: 'Jun', re: /\b(?:(jun|june))\b/i },
  { m: 7, label: 'Jul', re: /\b(?:(jul|july))\b/i },
  { m: 8, label: 'Aug', re: /\b(?:(aug|august))\b/i },
  { m: 9, label: 'Sep', re: /\b(?:(sep|sept|september))\b/i },
  { m: 10, label: 'Oct', re: /\b(?:(oct|october))\b/i },
  { m: 11, label: 'Nov', re: /\b(?:(nov|november))\b/i },
  { m: 12, label: 'Dec', re: /\b(?:(dec|december))\b/i },
];

const PLACES: { re: RegExp; region?: string; excludeCountries?: string[]; includeLocations?: string[]; search?: string; label: string }[] = [
  { re: /\bcaribbean\b/i, region: 'Caribbean & Mexico', excludeCountries: ['mexico'], label: 'Caribbean Islands' },
  { re: /\b(?:mexico|riviera maya|cancun|cancún|los cabos|cabo|tulum|punta mita)\b/i, region: 'Caribbean & Mexico', search: 'Mexico', label: 'Mexico' },
  {
    re: /\b(?:canary islands|canaries)\b/i,
    region: 'Europe',
    includeLocations: ['tenerife', 'gran canaria', 'lanzarote', 'fuerteventura', 'la palma', 'la gomera'],
    label: 'Canary Islands',
  },
  { re: /\btenerife\b/i, region: 'Europe', search: 'Tenerife', label: 'Tenerife' },
  { re: /\bgran canaria\b/i, region: 'Europe', search: 'Gran Canaria', label: 'Gran Canaria' },
  { re: /\blanzarote\b/i, region: 'Europe', search: 'Lanzarote', label: 'Lanzarote' },
  { re: /\bfuerteventura\b/i, region: 'Europe', search: 'Fuerteventura', label: 'Fuerteventura' },
  { re: /\bmaldives\b/i, region: 'Maldives & Indian Ocean', search: 'Maldives', label: 'Maldives' },
  { re: /\bseychelles\b/i, region: 'Maldives & Indian Ocean', search: 'Seychelles', label: 'Seychelles' },
  { re: /\bmauritius\b/i, region: 'Maldives & Indian Ocean', search: 'Mauritius', label: 'Mauritius' },
  { re: /\b(?:bora bora|french polynesia|tahiti)\b/i, region: 'Australia & Pacific', search: 'French Polynesia', label: 'Bora Bora & French Polynesia' },
  { re: /\b(?:sri lanka|galle|yala|tangalle)\b/i, search: 'Sri Lanka', label: 'Sri Lanka' },
  { re: /\b(?:india|rajasthan|udaipur|jaipur|goa)\b/i, region: 'Asia', search: 'India', label: 'India' },
  { re: /\b(?:vietnam|hoi an|phu quoc)\b/i, region: 'Asia', search: 'Vietnam', label: 'Vietnam' },
  { re: /\bfiji\b/i, region: 'Australia & Pacific', search: 'Fiji', label: 'Fiji' },
  { re: /\b(?:hawaii|maui|kauai|oahu)\b/i, region: 'Americas', search: 'Hawaii', label: 'Hawaii' },
  { re: /\bcosta rica\b/i, search: 'Costa Rica', label: 'Costa Rica' },
  { re: /\b(?:portugal|algarve|lisbon|comporta)\b/i, region: 'Europe', search: 'Portugal', label: 'Portugal' },
  { re: /\bbali\b/i, region: 'Asia', search: 'Bali', label: 'Bali' },
  { re: /\b(?:indonesia|lombok)\b/i, region: 'Asia', search: 'Indonesia', label: 'Indonesia' },
  { re: /\b(?:japan|tokyo|kyoto|niseko)\b/i, region: 'Asia', search: 'Japan', label: 'Japan' },
  { re: /\b(?:thailand|phuket|bangkok|koh samui)\b/i, region: 'Asia', search: 'Thailand', label: 'Thailand' },
  { re: /\b(?:dubai|abu dhabi|uae|oman|qatar|doha|middle east)\b/i, region: 'Middle East', label: 'Middle East' },
  { re: /\b(?:greece|santorini|mykonos|athens|crete)\b/i, region: 'Europe', search: 'Greece', label: 'Greece' },
  { re: /\b(?:italy|amalfi|como|tuscany|rome|milan|venice|florence|sicily)\b/i, region: 'Europe', search: 'Italy', label: 'Italy' },
  { re: /\b(?:france|paris|riviera|provence|courchevel)\b/i, region: 'Europe', search: 'France', label: 'France' },
  { re: /\b(?:spain|mallorca|ibiza|marbella|madrid|barcelona)\b/i, region: 'Europe', search: 'Spain', label: 'Spain' },
  { re: /\b(?:switzerland|st\.?\s*moritz|zermatt|gstaad|andermatt)\b/i, region: 'Europe', search: 'Switzerland', label: 'Switzerland' },
  { re: /\b(?:alps|alpine)\b/i, region: 'Europe', label: 'The Alps' },
  { re: /\b(?:united kingdom|\buk\b|london|scotland|cotswolds)\b/i, region: 'Europe', search: 'United Kingdom', label: 'United Kingdom' },
  { re: /\b(?:turkey|bodrum|istanbul)\b/i, region: 'Europe', search: 'Turkey', label: 'Turkey' },
  { re: /\b(?:egypt|red sea|cairo)\b/i, region: 'Middle East', search: 'Egypt', label: 'Egypt' },
  { re: /\b(?:africa|south africa|kenya|tanzania|botswana|morocco|marrakech)\b/i, region: 'Africa', label: 'Africa' },
  { re: /\b(?:australia|new zealand|fiji|pacific)\b/i, region: 'Australia & Pacific', label: 'Australia & Pacific' },
  { re: /\beurope\b/i, region: 'Europe', label: 'Europe' },
  { re: /\basia\b/i, region: 'Asia', label: 'Asia' },
  { re: /\b(?:americas|usa|united states|california|new york|hawaii|costa rica)\b/i, region: 'Americas', label: 'Americas' },
  { re: /\bindian ocean\b/i, region: 'Maldives & Indian Ocean', label: 'Maldives & Indian Ocean' },
];

const BRANDS: { re: RegExp; brand: string }[] = [
  { re: /\bfour seasons\b/i, brand: 'Four Seasons' },
  { re: /\baman\b/i, brand: 'Aman' },
  { re: /\brosewood\b/i, brand: 'Rosewood' },
  { re: /\bmandarin oriental\b/i, brand: 'Mandarin Oriental' },
  { re: /\bsix senses\b/i, brand: 'Six Senses' },
  { re: /\bbelmond\b/i, brand: 'Belmond' },
  { re: /\bone\s*&\s*only\b/i, brand: 'One&Only' },
  { re: /\bst\.?\s*regis\b/i, brand: 'St. Regis' },
  { re: /\britz[- ]?carlton\b/i, brand: 'The Ritz-Carlton' },
  { re: /\b(?:marriott|bonvoy)\b/i, brand: 'Marriott Bonvoy' },
  { re: /\bhyatt\b/i, brand: 'World of Hyatt' },
  { re: /\b(?:hilton|waldorf|conrad)\b/i, brand: 'Hilton Honors' },
  { re: /\bsoneva\b/i, brand: 'Soneva' },
  { re: /\bcapella\b/i, brand: 'Capella' },
];

export const TRIP_EXAMPLES = [
  'Sunny Caribbean in January',
  'Maldives overwater villa under £800',
  'Adults-only Greece in June',
  'MICHELIN Key hotels in Japan',
  'Family beach resort at Easter',
  'Ski chalet in the Alps',
  'Bali jungle retreat in May',
  'Seychelles honeymoon in October',
  'Thailand beach resort in February',
  'Amalfi Coast in September',
  'Dubai winter sun in December',
  'Mauritius family holiday in August',
  'Safari lodge in Kenya in July',
  'Four Seasons in the Maldives',
  'City break in Paris in April',
  'Lake Como in June',
  'Sri Lanka beach hotel in March',
  'Mexico adults-only in November',
];

let deck: string[] = [];
/**
 * "Surprise me": a different trip every tap. Works through a shuffled deck, so nothing repeats
 * until every idea has had a turn, and never gives the trip already on screen.
 */
export function nextSurprise(current?: string) {
  if (!deck.length) {
    deck = [...TRIP_EXAMPLES];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  let pick = deck.pop() as string;
  if (pick === current && deck.length) {
    const other = deck.pop() as string;
    deck.unshift(pick);
    pick = other;
  }
  return pick;
}

export function parseTripQuery(raw: string): TripQuery {
  const text = String(raw || '').trim();
  const p: TripQuery = {
    region: 'All',
    excludeCountries: [],
    includeLocations: [],
    search: '',
    brand: null,
    month: 0,
    feature: 'all',
    style: 'all',
    priceTier: 'all',
    maxGbp: null,
    sortBy: null,
    chips: [],
  };
  if (!text) return p;

  for (const r of PLACES) {
    if (r.re.test(text)) {
      if (r.region) p.region = r.region;
      if (r.excludeCountries) p.excludeCountries = r.excludeCountries;
      if (r.includeLocations) p.includeLocations = r.includeLocations;
      if (r.search) {
        p.search = r.search;
        p.placeSearch = true;
      }
      p.chips.push(`📍 ${r.label}`);
      break;
    }
  }

  const month = MONTHS.find((m) => m.re.test(text));
  if (month) {
    p.month = month.m;
    p.chips.push(`☀️ Best weather: ${month.label}`);
  } else if (/\bwinter sun\b/i.test(text)) {
    p.month = 1;
    p.chips.push('☀️ Winter sun (Jan)');
  } else if (/\bsummer\b/i.test(text)) {
    p.month = 7;
    p.chips.push('☀️ Summer (Jul)');
  } else if (/\b(?:spring|easter)\b/i.test(text)) {
    p.month = 4;
    p.chips.push('☀️ Spring (Apr)');
  } else if (/\b(?:autumn|fall)\b/i.test(text)) {
    p.month = 10;
    p.chips.push('☀️ Autumn (Oct)');
  }

  const price = text.match(/(?:under|below|max|less than|up to|<)\s*[£$€]?\s*(\d{3,4})/i);
  if (price) {
    const cap = Number(price[1]);
    if (cap <= 500) {
      p.priceTier = 'under500';
      if (cap < 500) p.maxGbp = cap;
    } else p.maxGbp = cap;
    p.chips.push(`£ Under £${cap}/night`);
  } else if (/\b(?:(cheap|budget|affordable|great value|good value|value))\b/i.test(text)) {
    p.priceTier = 'under500';
    p.sortBy = 'price_asc';
    p.chips.push('£ Under £500/night');
  }

  if (/\b(?:top\s*50|50\s*best)\b/i.test(text)) {
    p.feature = '50best_50';
    p.chips.push("🏆 World's 50 Best (#1–50)");
  } else if (/\btop\s*100\b/i.test(text)) {
    p.feature = '50best_100';
    p.chips.push('🏆 Top 100');
  } else if (/\b3\s*(?:michelin\s*)?keys?\b/i.test(text)) {
    p.feature = 'michelin_3';
    p.chips.push('🗝️ 3 MICHELIN Keys');
  } else if (/\bmichelin\b/i.test(text)) {
    p.feature = 'michelin';
    p.chips.push('🗝️ MICHELIN Keys');
  } else if (/\bforbes\b/i.test(text)) {
    p.feature = 'forbes';
    p.chips.push('⭐ Forbes star-rated');
  } else if (/\b(?:adults[- ]?only)\b/i.test(text)) {
    p.feature = 'adults';
    p.chips.push('🥂 Adults-only');
  } else if (/\b(?:honeymoon|romantic|couples)\b/i.test(text)) {
    // most romantic hotels aren't adults-only, so this doesn't narrow the list
    p.chips.push('💞 Honeymoon');
  } else if (/\b(?:family|families|kids|children)\b/i.test(text)) {
    p.feature = 'family';
    p.chips.push('👨‍👩‍👧 Family & kids');
  } else if (/\b(?:points|bonvoy|hyatt points|hilton points)\b/i.test(text)) {
    p.feature = 'points';
    p.chips.push('★ Points brands');
  }

  if (/\ball[- ]?inclusive\b/i.test(text)) {
    p.style = 'allinclusive';
    p.chips.push('🍽️ All-inclusive');
  } else if (/\b(?:overwater|water villa)\b/i.test(text)) {
    p.style = 'overwater';
    p.chips.push('🏝️ Overwater villas');
  } else if (/\b(?:snorkel|house reef|diving|reef)\b/i.test(text)) {
    p.style = 'snorkel';
    p.chips.push('🤿 Snorkelling & reef');
  } else if (/\b(?:safari|wildlife|jungle|nature)\b/i.test(text)) {
    p.style = 'safari';
    p.chips.push('🦁 Safari & nature');
  } else if (/\b(?:ski|mountain|alps|alpine|snow)\b/i.test(text)) {
    p.style = 'mountain';
    p.chips.push('🏔️ Mountain & ski');
  } else if (/\b(?:spa|wellness|onsen|retreat)\b/i.test(text)) {
    p.style = 'wellness';
    p.chips.push('💆 Spa & wellness');
  } else if (/\b(?:city|urban|shopping)\b/i.test(text)) {
    p.style = 'city';
    p.chips.push('🏙️ City breaks');
  } else if (/\b(?:culture|heritage|palace|historic)\b/i.test(text)) {
    p.style = 'culture';
    p.chips.push('🏛️ Culture & heritage');
  } else if (/\b(?:beach|island|sunny|sunshine|tropical)\b/i.test(text)) {
    p.style = 'beach';
    p.chips.push('🏖️ Beach resorts');
  }

  const brand = BRANDS.find((b) => b.re.test(text));
  if (brand) {
    p.brand = brand.brand;
    p.chips.push(`🏨 ${brand.brand}`);
  }

  if (!p.chips.length) {
    const cleaned = text
      .replace(/\b(?:(i want to|i would like to|stay in|looking for|find me|show me|hotels?|resorts?|in|the|a|an|with|for))\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    p.search = cleaned || text;
    p.chips.push(`🔎 "${p.search}"`);
  }
  return p;
}

// whole words only: "spa" mustn't match Spain, "ski" mustn't match skin, "city" mustn't match simplicity
const STYLE_WORDS: Record<string, RegExp> = {
  allinclusive: /\ball[- ]?inclusive\b/i,
  overwater: /\b(?:overwater|over-water|water villas?)\b/i,
  snorkel: /\b(?:snorkel\w*|house reef|reefs?|diving)\b/i,
  safari: /\b(?:safari|wildlife|jungle|game drives?|nature reserve)\b/i,
  mountain: /\b(?:ski|skiing|ski-in|mountains?|alpine|alps|slopes?|chalets?)\b/i,
  wellness: /\b(?:spa|wellness|onsen|retreat|thermal)\b/i,
  city: /\b(?:city|downtown|urban|shopping)\b/i,
  culture: /\b(?:palace|heritage|historic|culture|museums?)\b/i,
  beach: /\b(?:beach|beachfront|island|reef|lagoon|seafront|oceanfront)\b/i,
};

const factValues = (h: Hotel) =>
  Object.values(h.keyFacts || {})
    .filter((v) => typeof v === 'string')
    .join(' ');
const hotelText = (h: Hotel) =>
  [h.name, h.location, h.country, h.region, h.brand, h.verdict, h.standout, h.watchOut, factValues(h)]
    .filter(Boolean)
    .join(' ');

/** Lowest £ figure in a price label like "£400–£700/night". */
export function lowestGbp(h: Hotel): number | null {
  const m = String(h.priceRange || '').match(/£\s*([\d,]+)/);
  return m ? Number(m[1].replace(/,/g, '')) : null;
}

export function matchTrip(hotels: Hotel[], q: TripQuery): Hotel[] {
  const feat = FEATURE_FILTERS.find((f) => f.id === (q.feature as VerifiedFeature));
  const search = q.search.toLowerCase();
  return hotels.filter((h) => {
    if (q.region !== 'All' && h.region !== q.region) return false;
    if (q.excludeCountries.length && q.excludeCountries.includes(String(h.country).toLowerCase())) return false;
    if (q.includeLocations.length) {
      const loc = `${h.location} ${h.name}`.toLowerCase();
      if (!q.includeLocations.some((l) => loc.includes(l))) return false;
    }
    if (q.month && !isBestInMonth(h, q.month)) return false;
    if (feat && feat.id !== 'all' && !feat.match(h)) return false;
    if (q.style !== 'all') {
      const re = STYLE_WORDS[q.style];
      const beachFact = q.style === 'beach' && Boolean(h.keyFacts?.beachOrReef);
      if (re && !beachFact && !re.test(hotelText(h))) return false;
    }
    if (q.priceTier === 'under500' || q.maxGbp) {
      const cap = q.maxGbp ?? 500;
      const low = lowestGbp(h);
      if (low == null || low > cap) return false;
    }
    if (q.brand) {
      const brands = getBrandCategories(h).allBrands.join(' ').toLowerCase();
      if (!brands.includes(q.brand.toLowerCase()) && !String(h.brand).toLowerCase().includes(q.brand.toLowerCase())) return false;
    }
    // a named place matches where the hotel is, not its wider region ("Maldives" must not pull in
    // Mauritius just because both sit in "Maldives & Indian Ocean")
    const haystack = q.placeSearch ? `${h.name} ${h.location} ${h.country}` : hotelText(h);
    if (search && !haystack.toLowerCase().includes(search)) return false;
    return true;
  });
}

/** Sort: awards first when asked about awards, cheapest first for "value", otherwise best guest score. */
export function sortTripResults(list: Hotel[], q: TripQuery, guest: (h: Hotel) => number): Hotel[] {
  const out = [...list];
  if (q.feature.startsWith('50best')) out.sort((a, b) => (getW50BestRank(a) ?? 999) - (getW50BestRank(b) ?? 999));
  else if (q.feature.startsWith('michelin')) out.sort((a, b) => (getMichelinKeyCount(b) ?? 0) - (getMichelinKeyCount(a) ?? 0) || guest(b) - guest(a));
  else if (q.sortBy === 'price_asc') out.sort((a, b) => (lowestGbp(a) ?? 99999) - (lowestGbp(b) ?? 99999));
  else out.sort((a, b) => Number(Boolean(b.visitedByUs)) - Number(Boolean(a.visitedByUs)) || guest(b) - guest(a));
  return out;
}
