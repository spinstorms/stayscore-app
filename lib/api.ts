import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import type { AffiliateDeal, Hotel, VideoItem } from './types';

export const LIVE_BASE_URL = 'https://live.uncharteditinerary.com';
const CACHE_KEY = 'stayscore_live_cache_v1';

export interface StayScorePayload {
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

export async function loadCachedData(): Promise<StayScorePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as StayScorePayload) : null;
  } catch {
    return null;
  }
}

export async function fetchStayScoreData(): Promise<StayScorePayload> {
  const [visitedRes, worldRes, videosRes, affRes] = await Promise.all([
    fetchJson<{ updatedAt?: string; hotels?: Hotel[] }>('/data/hotels.json'),
    fetchJson<{ hotels?: Hotel[] }>('/data/world-hotels.json').catch(() => ({ hotels: [] })),
    fetchJson<{ videos?: VideoItem[]; shorts?: VideoItem[] }>('/data/videos.json').catch(() => ({
      videos: [],
      shorts: [],
    })),
    fetchJson<{ curated?: AffiliateDeal[]; fromVideos?: AffiliateDeal[] }>('/data/affiliates.json').catch(() => ({
      curated: [],
      fromVideos: [],
    })),
  ]);

  const visitedHotels: Hotel[] = (visitedRes.hotels || []).map((h) => ({
    ...h,
    visitedByUs: true,
  }));
  const visitedIds = new Set(visitedHotels.map((h) => h.id));
  const visitedNames = new Set(visitedHotels.map((h) => h.name.toLowerCase()));

  const worldHotels: Hotel[] = (worldRes.hotels || [])
    .filter((h) => !visitedIds.has(h.id) && !visitedNames.has((h.name || '').toLowerCase()))
    .map((h) => ({
      ...h,
      visitedByUs: false,
      coverageType: 'Global Directory',
    }));

  const payload: StayScorePayload = {
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
