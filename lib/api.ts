import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { BRAND } from './brand';
import { PLACEHOLDER_IDS } from './placeholders';
import type { AffiliateDeal, Hotel, VideoItem } from './types';

export const LIVE_BASE_URL = BRAND.liveApiBaseUrl;
const CACHE_KEY = 'stayodds_supabase_cache_v23';

function resolveHotelThumbnail(id: string, rawHero?: string | null): string {
  const hero = String(rawHero || '').trim();
  const isBlocked =
    !hero ||
    hero.includes('www.fourseasons.com') ||
    hero.includes('www.lungarnocollection.com') ||
    hero.endsWith('/logo.jpg');
  const ownPlaceholder = PLACEHOLDER_IDS.has(id)
    ? `${LIVE_BASE_URL}/assets/placeholders/${id}.webp?v=169`
    : `${LIVE_BASE_URL}/assets/placeholders/default-stayodds.webp?v=169`;
  const missingPlaceholder = /\/assets\/placeholders\/([^/?]+)\.webp/.exec(hero);
  if (missingPlaceholder && !PLACEHOLDER_IDS.has(missingPlaceholder[1])) return ownPlaceholder;
  if (!isBlocked && /^https?:\/\//i.test(hero)) {
    return hero.includes('uncharteditinerary.com/assets/') && !hero.includes('?') ? `${hero}?v=169` : hero;
  }
  if (!isBlocked && hero.startsWith('assets/')) return `${LIVE_BASE_URL}/${hero}?v=169`;
  return ownPlaceholder;
}

function photoCreditFrom(src: unknown, thumb: string): { text: string; url: string } | null {
  if (typeof src !== 'string' || !src.startsWith('wikimedia|') || !/^https?:/i.test(thumb)) return null;
  const [, lic = '', artist = '', page = ''] = src.split('|');
  const text = `Photo: ${artist.trim() || 'Wikimedia Commons'}${lic.trim() ? `, ${lic.trim()}` : ''} via Wikimedia Commons`;
  return { text, url: page.trim() };
}

/** One guest score from every real guest rating, weighted by review count (same rule as stayodds.com). */
function combineGuestScores(rows?: Record<string, any>[] | null): Hotel['verifiedGuest'] {
  if (!rows || !rows.length) return null;
  const parts = rows.map((r) => {
    const isTa = r.partner_source === 'tripadvisor';
    const isGoogle = r.partner_source === 'google';
    return {
      name: isTa ? 'Tripadvisor' : isGoogle ? 'Google' : 'Verified booking guests',
      rating: Number(r.rating),
      scale: Number(r.scale || (isTa || isGoogle ? 5 : 10)),
      normalized100: Number(r.normalized_100),
      reviewCount: r.review_count != null ? Number(r.review_count) : null,
      verifiedAt: r.verified_at as string | undefined,
    };
  });
  const counts = parts.map((p) => p.reviewCount || 0);
  const total = counts.reduce((a, b) => a + b, 0);
  const n100 = total
    ? Math.round(parts.reduce((a, p, i) => a + p.normalized100 * counts[i], 0) / total)
    : Math.round(parts.reduce((a, p) => a + p.normalized100, 0) / parts.length);
  return {
    licensed: {
      sourceName: parts.length > 1 ? 'Guest Reviews' : parts[0].name,
      rating: Math.round(n100) / 10,
      scale: 10,
      normalized100: n100,
      reviewCount: total || null,
      attribution: parts.map((p) => p.name).join(' + '),
      verifiedAt: parts.map((p) => p.verifiedAt || '').sort().pop() || null,
      sources: parts,
    },
  } as Hotel['verifiedGuest'];
}

export interface StayOddsPayload {
  hotels: Hotel[];
  visitedCount: number;
  worldCount: number;
  videos: VideoItem[];
  shorts: VideoItem[];
  deals: AffiliateDeal[];
  updatedAt: string;
}

export interface LiveGoogleRating {
  status: 'ok' | 'cap_reached' | 'unavailable';
  placeId: string;
  rating: number | null;
  scale: number;
  normalized100: number | null;
  reviewCount: number | null;
  googleMapsUri?: string | null;
  attribution: string;
  policyNotice?: string;
  fetchedAt: string;
}

async function sbSelect<T>(table: string, select = '*'): Promise<T[]> {
  const pageSize = 1000;
  const all: T[] = [];
  for (let offset = 0; offset < 5000; offset += pageSize) {
    const url = `${BRAND.supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${pageSize}&offset=${offset}`;
    const res = await fetch(url, {
      headers: {
        apikey: BRAND.supabasePublishableKey,
        Authorization: `Bearer ${BRAND.supabasePublishableKey}`,
        Accept: 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Supabase ${table} HTTP ${res.status}`);
    const page = (await res.json()) as T[];
    all.push(...page);
    if (page.length < pageSize) break;
  }
  return all;
}

async function fetchLiveJson<T>(path: string): Promise<T> {
  const res = await fetch(`${LIVE_BASE_URL}${path}?v=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return (await res.json()) as T;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours: data changes at most a few times a day; cached copy shows instantly

interface CachedEnvelope {
  cachedAt: number;
  data: StayOddsPayload;
}

let inFlightDirectoryFetch: Promise<StayOddsPayload> | null = null;

function parseCachedPayload(raw: string | null): { data: StayOddsPayload; isFresh: boolean } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Support both new { cachedAt, data } envelope and legacy raw StayOddsPayload
    const data: StayOddsPayload | null =
      parsed.data && Array.isArray(parsed.data.hotels)
        ? (parsed.data as StayOddsPayload)
        : Array.isArray(parsed.hotels)
        ? (parsed as StayOddsPayload)
        : null;

    if (!data || !Array.isArray(data.hotels) || data.hotels.length === 0) return null;

    const cachedAt =
      typeof parsed.cachedAt === 'number'
        ? parsed.cachedAt
        : data.updatedAt
        ? Date.parse(data.updatedAt)
        : 0;
    const ageMs = Number.isFinite(cachedAt) && cachedAt > 0 ? Date.now() - cachedAt : Infinity;
    return { data, isFresh: ageMs >= 0 && ageMs < CACHE_TTL_MS };
  } catch {
    return null;
  }
}

export async function loadCachedDataWithMeta(): Promise<{ data: StayOddsPayload; isFresh: boolean } | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return parseCachedPayload(raw);
  } catch {
    return null;
  }
}

export async function loadCachedData(): Promise<StayOddsPayload | null> {
  const cached = await loadCachedDataWithMeta();
  return cached ? cached.data : null;
}

/**
 * Fetches live luxury hotel directory directly from Supabase Postgres (public RLS read),
 * paired with live-synced YouTube episodes & Google Sheet deals.
 * Uses a 60-minute client cache and in-flight deduplication to minimize Supabase egress
 * while failing gracefully to live Supabase queries if storage is unavailable.
 */
export async function fetchStayOddsData(options?: { forceRefresh?: boolean }): Promise<StayOddsPayload> {
  const forceRefresh = Boolean(options?.forceRefresh);

  if (!forceRefresh) {
    const cached = await loadCachedDataWithMeta();
    if (cached && cached.isFresh && cached.data.hotels.length > 0) {
      return cached.data;
    }
  }

  if (inFlightDirectoryFetch) {
    return inFlightDirectoryFetch;
  }

  inFlightDirectoryFetch = fetchStayOddsDataFromNetwork().finally(() => {
    inFlightDirectoryFetch = null;
  });
  return inFlightDirectoryFetch;
}

async function fetchStayOddsDataFromNetwork(): Promise<StayOddsPayload> {
  const [props, facts, fhReviews, licensedScores, awards, editorial, ytReviews, bookingLinks, videosRes, affRes] =
    await Promise.all([
      sbSelect<Record<string, any>>('properties'),
      sbSelect<Record<string, any>>('property_facts').catch(() => []),
      sbSelect<Record<string, any>>('first_hand_reviews').catch(() => []),
      sbSelect<Record<string, any>>('licensed_guest_scores').catch(() => []),
      sbSelect<Record<string, any>>('official_awards').catch(() => []),
      sbSelect<Record<string, any>>('editorial_ratings').catch(() => []),
      sbSelect<Record<string, any>>('youtube_reviews').catch(() => []),
      sbSelect<Record<string, any>>('booking_links').catch(() => []),
      fetchLiveJson<{ videos?: VideoItem[]; shorts?: VideoItem[] }>('/data/videos.json').catch(() => ({
        videos: [],
        shorts: [],
      })),
      fetchLiveJson<{ curated?: AffiliateDeal[]; fromVideos?: AffiliateDeal[] }>(
        '/data/affiliates.json'
      ).catch(() => ({ curated: [], fromVideos: [] })),
    ]);

  const factMap = new Map(facts.map((r) => [String(r.property_id), r]));
  const fhMap = new Map(fhReviews.map((r) => [String(r.property_id), r]));
  // A guest rating needs at least 20 reviews; thinner ones are left off. A hotel can have several
  // (booking-platform guests out of 10, Tripadvisor out of 5): they are combined below, weighted by review count.
  const guestMap = new Map<string, Record<string, any>[]>();
  licensedScores
    .filter((r) => (r.review_count != null ? Number(r.review_count) >= 20 : r.partner_source !== 'nuitee_connect'))
    .forEach((r) => {
      const k = String(r.property_id);
      guestMap.set(k, [...(guestMap.get(k) || []), r]);
    });

  const awardsMap = new Map<string, any[]>();
  awards.forEach((r) => {
    const k = String(r.property_id);
    awardsMap.set(k, [
      ...(awardsMap.get(k) || []),
      {
        awardBody: r.award_body,
        label: r.label,
        year: r.award_year,
        normalized100: r.normalized_100,
        sourceUrl: r.source_url,
      },
    ]);
  });

  const edMap = new Map<string, any[]>();
  editorial.forEach((r) => {
    const k = String(r.property_id);
    edMap.set(k, [
      ...(edMap.get(k) || []),
      {
        sourceName: r.source_name,
        sourceUrl: r.source_url,
        rawScore: r.raw_score,
        normalized100: r.normalized_100,
        takeaway: r.takeaway,
      },
    ]);
  });

  const ytMap = new Map<string, any[]>();
  ytReviews.forEach((r) => {
    const k = String(r.property_id);
    ytMap.set(k, [
      ...(ytMap.get(k) || []),
      {
        creatorName: r.creator_name,
        sourceUrl: r.source_url,
        sentiment: r.sentiment,
        takeaway: r.takeaway,
      },
    ]);
  });

  const bkMap = new Map<string, any[]>();
  bookingLinks.forEach((r) => {
    const k = String(r.property_id);
    bkMap.set(k, [
      ...(bkMap.get(k) || []),
      {
        channelType: r.channel_type,
        partnerName: r.partner_name,
        url: r.url,
        mobileAllowed: Boolean(r.mobile_allowed),
        perksSummary: r.perks_summary,
        priority: r.priority,
      },
    ]);
  });

  const hotels: Hotel[] = props.map((p) => {
    const id = String(p.id);
    const f = factMap.get(id) || {};
    const fh = fhMap.get(id);
    const gs = guestMap.get(id);
    const links = (bkMap.get(id) || []).sort((a, b) => (a.priority || 1) - (b.priority || 1));
    // Mobile Booking Compliance: prefer mobileAllowed link (StayOdds SEO web page or VIP/mobile-approved partner)
    const mobileBooking =
      links.find((l) => l.mobileAllowed)?.url || `${LIVE_BASE_URL}/stayodds/${id}/`;

    const rated = Boolean(fh && fh.overall_score != null);
    return {
      id,
      name: String(p.name || ''),
      location: String(p.city || ''),
      country: String(p.country || ''),
      region: String(p.region || 'Global'),
      lat: Number(p.lat || 0),
      lng: Number(p.lng || 0),
      brand: String(p.brand || ''),
      priceRange: p.price_tier || undefined,
      reviewedDate: fh?.reviewed_date || undefined,
      videoId: fh?.youtube_video_id || undefined,
      inLiveFeed: Boolean(fh?.in_live_feed),
      visitedByUs: Boolean(p.visited_by_founder),
      coverageType: fh?.coverage_type || 'Global Directory',
      tier: p.tier || 'global_directory',
      googlePlaceId: p.google_place_id || null,
      thumbnail: resolveHotelThumbnail(id, p.hero_image_url),
      photoCredit: photoCreditFrom(p.image_license_source, resolveHotelThumbnail(id, p.hero_image_url)),
      scores: rated && fh
        ? {
            rooms: fh.rooms_score != null ? Number(fh.rooms_score) : null,
            grounds: fh.grounds_score != null ? Number(fh.grounds_score) : null,
            food: fh.food_score != null ? Number(fh.food_score) : null,
            service: fh.service_score != null ? Number(fh.service_score) : null,
            value: fh.value_score != null ? Number(fh.value_score) : null,
          }
        : null,
      overall: rated && fh ? Number(fh.overall_score) : null,
      verdict: String(fh?.verdict || ''),
      whereWeDiffer: String(fh?.where_we_differ || ''),
      standout: String(f.standout || ''),
      watchOut: String(f.watch_out || ''),
      keyFacts: {
        poolHeating: f.pool_heating || undefined,
        beachOrReef: f.beach_or_reef || undefined,
        renovationYear: f.renovation_year || null,
        transferLogistics: f.transfer_logistics || undefined,
      },
      propertyStatus:
        f.operating_status || f.renovations_extensions || f.nearby_construction
          ? {
              operatingStatus: f.operating_status || undefined,
              renovationsExtensions: f.renovations_extensions || undefined,
              nearbyConstruction: f.nearby_construction || undefined,
              sourceUrl: f.status_source_url || undefined,
              sourceNote: f.status_source_note || undefined,
              verifiedAt: f.status_verified_at || undefined,
            }
          : null,
      redFlags: Array.isArray(f.red_flag_tags) ? f.red_flag_tags : [],
      bookingUrl: mobileBooking,
      bookingLinks: links,
      shorts: Array.isArray(fh?.shorts) ? fh.shorts : [],
      verifiedGuest: combineGuestScores(gs),
      editorialRatings: edMap.get(id) || [],
      youtubeReviews: ytMap.get(id) || [],
      officialAwards: awardsMap.get(id) || [],
    };
  });

  const visitedCount = hotels.filter((h) => h.visitedByUs).length;
  const payload: StayOddsPayload = {
    hotels,
    visitedCount,
    worldCount: hotels.length - visitedCount,
    videos: videosRes.videos || [],
    shorts: videosRes.shorts || [],
    deals: [...(affRes.curated || []), ...(affRes.fromVideos || [])],
    updatedAt: new Date().toISOString(),
  };

  // Never cache empty or failed responses; silently ignore storage errors (private mode / quota)
  if (payload.hotels.length > 0) {
    try {
      const envelope: CachedEnvelope = { cachedAt: Date.now(), data: payload };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(envelope)).catch(() => {});
    } catch {
      // Ignore storage serialization/quota errors
    }
  }
  return payload;
}

const liveGoogleMemoryCache = new Map<string, LiveGoogleRating>();
const liveGoogleInFlight = new Map<string, Promise<LiveGoogleRating | null>>();

/**
 * ToS-compliant on-demand live Google Places rating fetch for Detail screens ONLY.
 * Deduplicated in memory during the active app session; never cached permanently in Postgres or AsyncStorage.
 */
export async function fetchLiveGoogleRating(placeId?: string | null): Promise<LiveGoogleRating | null> {
  if (!placeId) return null;
  const cached = liveGoogleMemoryCache.get(placeId);
  if (cached) return cached;
  const pending = liveGoogleInFlight.get(placeId);
  if (pending) return pending;

  const fallbackMapsUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(placeId)}`;
  const req = (async (): Promise<LiveGoogleRating | null> => {
    try {
      const res = await fetch(
        `${BRAND.liveGoogleEdgeUrl}?place_id=${encodeURIComponent(placeId)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) {
        return {
          status: 'unavailable',
          placeId,
          rating: null,
          scale: 5,
          normalized100: null,
          reviewCount: null,
          googleMapsUri: fallbackMapsUrl,
          attribution: 'Google Maps',
          policyNotice: '',
          fetchedAt: new Date().toISOString(),
        };
      }
      const data = await res.json();
      if (data.status !== 'ok' || typeof data.rating !== 'number') {
        return {
          status: data.status === 'cap_reached' ? 'cap_reached' : 'unavailable',
          placeId,
          rating: null,
          scale: 5,
          normalized100: null,
          reviewCount: null,
          googleMapsUri: data.googleMapsUri || fallbackMapsUrl,
          attribution: 'Google Maps',
          policyNotice: '',
          fetchedAt: new Date().toISOString(),
        };
      }
      const okResult: LiveGoogleRating = {
        status: 'ok',
        placeId,
        rating: data.rating,
        scale: 5,
        normalized100: data.normalized100 ?? Math.round(data.rating * 20),
        reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : null,
        googleMapsUri: data.googleMapsUri || fallbackMapsUrl,
        attribution: data.attribution || 'Powered by Google',
        policyNotice: data.policyNotice || 'Reviews are not verified by Google.',
        fetchedAt: data.fetchedAt || new Date().toISOString(),
      };
      liveGoogleMemoryCache.set(placeId, okResult);
      return okResult;
    } catch {
      return {
        status: 'unavailable',
        placeId,
        rating: null,
        scale: 5,
        normalized100: null,
        reviewCount: null,
        googleMapsUri: fallbackMapsUrl,
        attribution: 'Google Maps',
        policyNotice: '',
        fetchedAt: new Date().toISOString(),
      };
    } finally {
      liveGoogleInFlight.delete(placeId);
    }
  })();

  liveGoogleInFlight.set(placeId, req);
  return req;
}

export async function openExternalUrl(url: string) {
  if (!url) return;
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    }
    await WebBrowser.openBrowserAsync(url, {
      toolbarColor: '#FF5D22',
      controlsColor: '#FFFFFF',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
    });
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}

export function getHotelVideoUrl(h: Hotel): string | null {
  if (!h.videoId) return null;
  if (h.coverageType === 'Short Tour') {
    return `https://www.youtube.com/shorts/${h.videoId}`;
  }
  return `https://www.youtube.com/watch?v=${h.videoId}`;
}
