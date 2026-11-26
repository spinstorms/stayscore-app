import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { readBig, writeBig } from './bigStore';
import { BRAND } from './brand';
import { buildPayload, type RawDirectory, type StayOddsPayload } from './payload';
import type { AffiliateDeal, Hotel, VideoItem } from './types';

export { buildPayload, type RawDirectory, type StayOddsPayload } from './payload';

export const LIVE_BASE_URL = BRAND.liveApiBaseUrl;
const CACHE_KEY = 'stayodds_supabase_cache_v23';



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
    const raw = await readBig(CACHE_KEY);
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
  const payload = buildPayload(await fetchRawDirectory());
  // Never cache empty or failed responses
  if (payload.hotels.length > 0) {
    const envelope: CachedEnvelope = { cachedAt: Date.now(), data: payload };
    writeBig(CACHE_KEY, JSON.stringify(envelope));
  }
  return payload;
}

export async function fetchRawDirectory(): Promise<RawDirectory> {
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
  return { props, facts, fhReviews, licensedScores, awards, editorial, ytReviews, bookingLinks, videosRes, affRes };
}


let snapshotPayload: StayOddsPayload | null = null;
/**
 * The directory as it was when the app was built (assets/data/snapshot.json, prepared by
 * scripts/snapshot-data.mjs on every EAS build). Used on first launch and offline, so the app
 * never opens to a loading screen. Older raw-table snapshots are still understood.
 */
export function loadBundledSnapshot(): StayOddsPayload | null {
  if (snapshotPayload) return snapshotPayload;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const snap = require('../assets/data/snapshot.json') as Partial<StayOddsPayload> & Partial<RawDirectory>;
    if (Array.isArray(snap?.hotels) && snap.hotels.length) snapshotPayload = snap as StayOddsPayload;
    else if (Array.isArray(snap?.props) && snap.props.length) snapshotPayload = buildPayload(snap as RawDirectory);
    return snapshotPayload;
  } catch {
    return null;
  }
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
