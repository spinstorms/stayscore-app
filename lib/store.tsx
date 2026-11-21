import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchStayOddsData, loadCachedData } from './api';
import type { AffiliateDeal, Hotel, VideoItem } from './types';

interface StayOddsContextValue {
  hotels: Hotel[];
  visitedCount: number;
  worldCount: number;
  videos: VideoItem[];
  shorts: VideoItem[];
  deals: AffiliateDeal[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  compareA: string;
  compareB: string;
  setCompareA: (id: string) => void;
  setCompareB: (id: string) => void;
  pushToCompare: (id: string) => void;
  refresh: () => Promise<void>;
}

const StayOddsContext = createContext<StayOddsContextValue | null>(null);

export function StayOddsProvider({ children }: { children: React.ReactNode }) {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [visitedCount, setVisitedCount] = useState(0);
  const [worldCount, setWorldCount] = useState(0);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [shorts, setShorts] = useState<VideoItem[]>([]);
  const [deals, setDeals] = useState<AffiliateDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareA, setCompareA] = useState('taaktana-labuan-bajo');
  const [compareB, setCompareB] = useState('ritz-carlton-bali');

  const hydrate = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await fetchStayOddsData();
      setHotels(data.hotels);
      setVisitedCount(data.visitedCount);
      setWorldCount(data.worldCount);
      setVideos(data.videos);
      setShorts(data.shorts);
      setDeals(data.deals);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach StayOdds live feed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCachedData().then((cached) => {
      if (cached && cached.hotels.length) {
        setHotels(cached.hotels);
        setVisitedCount(cached.visitedCount);
        setWorldCount(cached.worldCount);
        setVideos(cached.videos);
        setShorts(cached.shorts);
        setDeals(cached.deals);
        setLoading(false);
      }
      hydrate(false);
    });
  }, [hydrate]);

  const pushToCompare = useCallback(
    (id: string) => {
      if (id === compareA) return;
      setCompareB(compareA);
      setCompareA(id);
    },
    [compareA]
  );

  return (
    <StayOddsContext.Provider
      value={{
        hotels,
        visitedCount,
        worldCount,
        videos,
        shorts,
        deals,
        loading,
        refreshing,
        error,
        compareA,
        compareB,
        setCompareA,
        setCompareB,
        pushToCompare,
        refresh: () => hydrate(true),
      }}
    >
      {children}
    </StayOddsContext.Provider>
  );
}

export function useStayOdds() {
  const ctx = useContext(StayOddsContext);
  if (!ctx) throw new Error('useStayOdds must be used inside StayOddsProvider');
  return ctx;
}
