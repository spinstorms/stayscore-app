import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { BRAND } from './brand';
import type { AffiliateDeal, Hotel, VideoItem } from './types';

export const LIVE_BASE_URL = BRAND.liveApiBaseUrl;
const CACHE_KEY = 'stayodds_live_cache_v2';

export interface StayOddsPayload {
  hotels: Hotel[];
  visitedCount: number;
  worldCount: number;
  videos: VideoItem[];
  shorts: VideoItem[];
  deals: AffiliateDeal[];
  updatedAt: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${LIVE_BASE_URL}${path}?v=${Date.now()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return (await res.json()) as T;
}

/**
 * Defensive sanitizer: guarantees legacy unverified/estimated external scores
 * can NEVER enter the app even if fetched before a remote deploy finishes.
 */
function sanitizeHotelRecord(raw: Record<string, any>, visitedByUs: boolean): Hotel {
  const rated = visitedByUs && raw.overall != null && raw.scores != null;
  const bookingUrl = typeof raw.bookingUrl === 'string' ? raw.bookingUrl : '';
  return {
    id: String(raw.id || ''),
    name: String(raw.name || ''),
    location: String(raw.location || ''),
    country: String(raw.country || ''),
    region: String(raw.region || 'Global'),
    lat: Number(raw.lat || 0),
    lng: Number(raw.lng || 0),
    brand: String(raw.brand || ''),
    priceRange: visitedByUs ? raw.priceRange : undefined,
    reviewedDate: raw.reviewedDate,
    videoId: visitedByUs ? raw.videoId : undefined,
    inLiveFeed: visitedByUs ? Boolean(raw.inLiveFeed) : false,
    visitedByUs,
    coverageType: visitedByUs
      ? raw.coverageType || (rated ? 'Full Review' : 'Short Tour')
      : 'Global Directory',
    tier: rated ? 'first_hand_verified' : visitedByUs ? 'short_preview' : 'global_directory',
    thumbnail: String(raw.thumbnail || ''),
    scores: rated ? raw.scores : null,
    overall: rated ? Number(raw.overall) : null,
    verdict: String(raw.verdict || ''),
    standout: String(raw.standout || ''),
    watchOut: String(raw.watchOut || ''),
    bookingUrl,
    bookingLinks: Array.isArray(raw.bookingLinks)
      ? raw.bookingLinks
      : bookingUrl
      ? [{ channelType: 'ota_affiliate', partnerName: 'Booking.com', url: bookingUrl, priority: 1 }]
      : [],
    shorts: visitedByUs && Array.isArray(raw.shorts) ? raw.shorts : [],
    verifiedGuest: raw.verifiedGuest || null,
    editorialRatings: Array.isArray(raw.editorialRatings) ? raw.editorialRatings : [],
    youtubeReviews: Array.isArray(raw.youtubeReviews) ? raw.youtubeReviews : [],
    officialAwards: Array.isArray(raw.officialAwards) ? raw.officialAwards : [],
    redFlags: Array.isArray(raw.redFlags) ? raw.redFlags : [],
  };
}

export async function loadCachedData(): Promise<StayOddsPayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as StayOddsPayload) : null;
  } catch {
    return null;
  }
}

export async function fetchStayOddsData(): Promise<StayOddsPayload> {
  const [visitedRes, worldRes, videosRes, affRes] = await Promise.all([
    fetchJson<{ updatedAt?: string; hotels?: Record<string, any>[] }>('/data/hotels.json'),
    fetchJson<{ hotels?: Record<string, any>[] }>('/data/world-hotels.json').catch(() => ({
      hotels: [],
    })),
    fetchJson<{ videos?: VideoItem[]; shorts?: VideoItem[] }>('/data/videos.json').catch(() => ({
      videos: [],
      shorts: [],
    })),
    fetchJson<{ curated?: AffiliateDeal[]; fromVideos?: AffiliateDeal[] }>(
      '/data/affiliates.json'
    ).catch(() => ({
      curated: [],
      fromVideos: [],
    })),
  ]);

  const visitedHotels: Hotel[] = (visitedRes.hotels || []).map((h) => sanitizeHotelRecord(h, true));
  const visitedIds = new Set(visitedHotels.map((h) => h.id));
  const visitedNames = new Set(visitedHotels.map((h) => h.name.toLowerCase()));

  const worldHotels: Hotel[] = (worldRes.hotels || [])
    .filter((h) => !visitedIds.has(String(h.id)) && !visitedNames.has(String(h.name || '').toLowerCase()))
    .map((h) => sanitizeHotelRecord(h, false));

  const payload: StayOddsPayload = {
    hotels: [...visitedHotels, ...worldHotels],
    visitedCount: visitedHotels.length,
    worldCount: worldHotels.length,
    videos: videosRes.videos || [],
    shorts: videosRes.shorts || [],
    deals: [...(affRes.curated || []), ...(affRes.fromVideos || [])],
    updatedAt: visitedRes.updatedAt || new Date().toISOString(),
  };

  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload)).catch(() => {});
  return payload;
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
