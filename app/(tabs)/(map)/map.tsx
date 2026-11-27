import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DotMap } from '../../../components/map/DotMap';
import { NativeHotelMap, nativeMapAvailable } from '../../../components/map/NativeHotelMap';
import { openExternalUrl } from '../../../lib/api';
import { openInMaps } from '../../../lib/openInMaps';
import {
  applyAwardFilters,
  AWARD_FILTERS,
  AWARD_LISTS,
  matchesAwardList,
  type AwardFilterId,
  type AwardListId,
  type DiningMap,
} from '../../../lib/awards';
import { loadGuestRanks } from '../../../lib/ranks';
import { computeStayOdds, getTonePalette, isVisitedProperty } from '../../../lib/scoring';
import { useStayOdds } from '../../../lib/store';
import { Colors } from '../../../lib/theme';
import type { Hotel } from '../../../lib/types';
import { lazyTab } from '../../../components/LazyTab';
import { withRailShortcuts } from '../../../components/RailShortcuts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '../../../lib/i18n';

type MapScope = 'all' | 'visited' | 'saved' | AwardListId;
const AWARD_SCOPES = AWARD_LISTS.map((l) => l.id) as string[];

interface RegionViewport {
  id: string;
  label: string;
  regionFilter: string | null;
  countryFilter?: string[];
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const REGION_VIEWPORTS: RegionViewport[] = [
  { id: 'world', label: 'World', regionFilter: null, minLat: -55, maxLat: 66, minLng: -162, maxLng: 179.5 },
  { id: 'europe', label: 'Europe', regionFilter: 'Europe', minLat: 35.0, maxLat: 65.5, minLng: -25.0, maxLng: 36.0 },
  { id: 'asia', label: 'Asia', regionFilter: 'Asia', minLat: -11.5, maxLat: 46.0, minLng: 70.0, maxLng: 146.5 },
  { id: 'maldives-io', label: 'Maldives & Indian Ocean', regionFilter: 'Maldives & Indian Ocean', minLat: -22.5, maxLat: 8.5, minLng: 51.0, maxLng: 76.0 },
  { id: 'australia-pacific', label: 'Australia & Pacific', regionFilter: 'Australia & Pacific', minLat: -47.5, maxLat: -10.0, minLng: 112.0, maxLng: 179.5 },
  { id: 'americas', label: 'Americas', regionFilter: 'Americas', minLat: -54.0, maxLat: 54.0, minLng: -162.0, maxLng: -34.0 },
  { id: 'caribbean-mexico', label: 'Caribbean & Mexico', regionFilter: 'Caribbean & Mexico', minLat: 10.5, maxLat: 33.0, minLng: -112.0, maxLng: -58.5 },
  { id: 'middle-east', label: 'Middle East', regionFilter: 'Middle East', minLat: 19.0, maxLat: 31.5, minLng: 29.0, maxLng: 60.0 },
  { id: 'africa', label: 'Africa', regionFilter: 'Africa', minLat: -36.0, maxLat: 36.0, minLng: -18.0, maxLng: 45.0 },
  { id: 'japan', label: 'Japan', regionFilter: null, countryFilter: ['Japan'], minLat: 24.0, maxLat: 45.8, minLng: 123.5, maxLng: 146.0 },
  { id: 'maldives', label: 'Maldives', regionFilter: null, countryFilter: ['Maldives'], minLat: -1.2, maxLat: 7.4, minLng: 71.8, maxLng: 74.6 },
  { id: 'mexico', label: 'Mexico', regionFilter: null, countryFilter: ['Mexico'], minLat: 16.5, maxLat: 26.0, minLng: -112.0, maxLng: -85.5 },
  { id: 'bali', label: 'Indonesia', regionFilter: null, countryFilter: ['Indonesia'], minLat: -10.8, maxLat: -6.5, minLng: 109.5, maxLng: 121.0 },
  { id: 'thailand', label: 'Thailand', regionFilter: null, countryFilter: ['Thailand'], minLat: 6.5, maxLat: 20.5, minLng: 97.5, maxLng: 103.5 },
  { id: 'greece', label: 'Greece', regionFilter: null, countryFilter: ['Greece'], minLat: 34.8, maxLat: 41.2, minLng: 19.5, maxLng: 28.5 },
  { id: 'turkey', label: 'Turkey', regionFilter: null, countryFilter: ['Turkey'], minLat: 36.2, maxLat: 42.0, minLng: 26.2, maxLng: 36.5 },
  { id: 'egypt', label: 'Egypt', regionFilter: null, countryFilter: ['Egypt'], minLat: 23.5, maxLat: 31.5, minLng: 29.0, maxLng: 35.5 },
];

export function WorldMapScreen() {
  const router = useRouter();
  const { hotels, shortlist, isShortlisted, toggleShortlist, pushToCompare, loading } = useStayOdds();

  const [viewportId, setViewportId] = useState<string>('world');
  const params = useLocalSearchParams<{ scope?: string; awards?: string; match?: string }>();
  const [scope, setScope] = useState<MapScope>('all');
  // Multi-select award filters, as on stayodds.com/hotels/: pick one or more, match all or any.
  const [awards, setAwards] = useState<AwardFilterId[]>([]);
  const [awardMatch, setAwardMatch] = useState<'all' | 'any'>('all');
  const [dining, setDining] = useState<DiningMap>({});
  React.useEffect(() => {
    const sc = params.scope ? String(params.scope) : '';
    if (sc === 'w50') {
      // legacy single-award scope -> award filter (the website migrates it the same way)
      setScope('all');
      setAwards((a) => (a.includes('w50') ? a : [...a, 'w50']));
    } else if (sc && AWARD_SCOPES.includes(sc)) setScope(sc as MapScope);
    if (params.awards) {
      const ids = String(params.awards)
        .split(',')
        .filter((a): a is AwardFilterId => AWARD_FILTERS.some((f) => f.id === a));
      setAwards(ids);
    }
    if (params.match === 'any') setAwardMatch('any');
  }, [params.scope, params.awards, params.match]);
  React.useEffect(() => {
    let active = true;
    loadGuestRanks().then((d) => {
      if (!active || !d?.extras) return;
      const m: DiningMap = {};
      for (const [id, x] of Object.entries(d.extras)) if (x.dining?.length) m[id] = x.dining;
      setDining(m);
    });
    return () => {
      active = false;
    };
  }, []);
  const toggleAward = (id: AwardFilterId) =>
    setAwards((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const [selectedId, setSelectedIdRaw] = useState<string>('taaktana-labuan-bajo');
  // map first: the hotel card shows once a pin is tapped, and closes to give the map the screen
  const [cardOpen, setCardOpen] = useState(false);
  const setSelectedId = (id: string) => {
    setSelectedIdRaw(id);
    setCardOpen(true);
  };
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const insets = useSafeAreaInsets();
  // keep the floating card above the iPhone tab bar; on the Duo the tabs sit in the side rail
  const railOnSide = insets.left > 40 || insets.right > 40;
  const cardBottom =
    process.env.EXPO_OS === 'ios' ? insets.bottom + (railOnSide ? 12 : 58) : 12;

  const viewport = useMemo(
    () => REGION_VIEWPORTS.find((v) => v.id === viewportId) || REGION_VIEWPORTS[0],
    [viewportId]
  );

  // Hotels in the chosen scope, before award filters (award chip counts are taken from this, as on the website)
  const scopeBase = useMemo(() => {
    const savedSet = new Set(shortlist);
    return hotels.filter((h) => {
      if (typeof h.lat !== 'number' || typeof h.lng !== 'number') return false;
      // a few directory hotels have no real location yet (0, 0 sits in the sea off Africa)
      if (Math.abs(h.lat) < 0.01 && Math.abs(h.lng) < 0.01) return false;
      if (scope === 'visited' && !isVisitedProperty(h)) return false;
      if (scope === 'saved' && !savedSet.has(h.id)) return false;
      if (AWARD_SCOPES.includes(scope) && !matchesAwardList(h, scope as AwardListId)) return false;
      return true;
    });
  }, [hotels, scope, shortlist]);

  const awardMatched = useMemo(
    () => applyAwardFilters(scopeBase, awards, awardMatch, dining),
    [scopeBase, awards, awardMatch, dining]
  );

  const visibleHotels = useMemo(
    () =>
      awardMatched.filter((h) => {
        if (viewport.countryFilter && !viewport.countryFilter.includes(h.country)) return false;
        if (viewport.regionFilter && h.region !== viewport.regionFilter) return false;
        return true;
      }),
    [awardMatched, viewport]
  );

  const savedKey = shortlist.join(',');
  const colorFor = useCallback(
    // our filmed stays in The Uncharted Itinerary's orange, other hotels in lagoon teal
    (h: Hotel) => (shortlist.includes(h.id) ? '#F43F5E' : isVisitedProperty(h) ? Colors.uncharted : Colors.accent),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedKey]
  );

  const pinKind = useCallback(
    (h: Hotel) => (shortlist.includes(h.id) ? 'saved' : isVisitedProperty(h) ? 'ours' : 'global') as 'saved' | 'ours' | 'global',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedKey]
  );

  const selectedHotel: Hotel | null = useMemo(() => {
    return (
      visibleHotels.find((h) => h.id === selectedId) ||
      visibleHotels[0] ||
      hotels.find((h) => h.id === selectedId) ||
      null
    );
  }, [visibleHotels, hotels, selectedId]);

  const selectedOdds = useMemo(
    () => (selectedHotel ? computeStayOdds(selectedHotel) : null),
    [selectedHotel]
  );

  const openWebMap = () => {
    const q = viewport.regionFilter ? `?region=${encodeURIComponent(viewport.regionFilter)}` : '';
    openExternalUrl(`https://stayodds.com/hotels/${q}`);
  };

  if (loading && !hotels.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>{t("Plotting luxury stays worldwide…")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Top Coastal Navy Controls */}
      <View style={styles.headerPanel}>
        <View style={styles.topRow}>
          <View style={styles.scopeRow}>
            {(
              [
                ['all', `All (${hotels.length})`],
                ['visited', 'Verified'],
                ['saved', `♥ ${shortlist.length}`],
              ] as const
            ).map(([k, lbl]) => (
              <Pressable
                key={k}
                onPress={() => setScope(k)}
                style={[styles.scopeBtn, scope === k && styles.scopeBtnActive]}
              >
                <Text style={[styles.scopeText, scope === k && styles.scopeTextActive]}>{lbl}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.webMapBtn, (filtersOpen || awards.length > 0) && styles.filtersBtnOn]}
            onPress={() => setFiltersOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
          >
            <Ionicons name="options-outline" size={14} color={Colors.accentDark} />
            <Text style={styles.webMapBtnText}>Awards{awards.length ? ` (${awards.length})` : ''}</Text>
          </Pressable>
        </View>

        {filtersOpen ? (
        <>
        <Text style={styles.awardRowLabel}>{t("Awards (pick one or more)")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionStrip}>
          {AWARD_SCOPES.includes(scope)
            ? AWARD_LISTS.filter((l) => l.id === scope).map((l) => (
                <Pressable key={l.id} onPress={() => setScope('all')} style={[styles.scopeBtn, styles.scopeBtnActive]}>
                  <Text style={[styles.scopeText, styles.scopeTextActive]}>
                    {l.id === 'w50' ? "World's 50 Best" : `MICHELIN ${l.short}`} ✕
                  </Text>
                </Pressable>
              ))
            : null}
          {AWARD_FILTERS.map((f) => {
            const on = awards.includes(f.id);
            const cnt = scopeBase.filter((h) => f.test(h, dining)).length;
            if (!cnt && !on) return null;
            return (
              <Pressable
                key={f.id}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => toggleAward(f.id)}
                style={[styles.scopeBtn, on && styles.scopeBtnActive]}
              >
                <Text style={[styles.scopeText, on && styles.scopeTextActive]}>
                  {on ? '✓ ' : ''}
                  {f.label} ({cnt})
                </Text>
              </Pressable>
            );
          })}
          {awards.length ? (
            <Pressable onPress={() => setAwards([])} style={styles.awardClear}>
              <Text style={styles.awardClearText}>{t("Clear")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        {awards.length > 1 ? (
          <View style={styles.matchRow}>
            <Text style={styles.matchText}>{t("Show hotels with")}</Text>
            {(['all', 'any'] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: awardMatch === m }}
                onPress={() => setAwardMatch(m)}
                style={[styles.matchBtn, awardMatch === m && styles.matchBtnActive]}
              >
                <Text style={[styles.matchBtnText, awardMatch === m && styles.matchBtnTextActive]}>
                  {m === 'all' ? 'all of these' : 'any of these'}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.matchText}>
              · {awardMatched.length} hotel{awardMatched.length === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
        <Pressable onPress={openWebMap} hitSlop={6}>
          <Text style={styles.awardClearText}>{t("Open the full map on stayodds.com ↗")}</Text>
        </Pressable>
        </>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionStrip}>
          {REGION_VIEWPORTS.map((rv) => {
            const active = rv.id === viewportId;
            return (
              <Pressable
                key={rv.id}
                onPress={() => setViewportId(rv.id)}
                style={[styles.regionPill, active && styles.regionPillActive]}
              >
                <Text style={[styles.regionText, active && styles.regionTextActive]}>{t(rv.label)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Interactive Coordinate Map Canvas (100% Expo Go & Web compatible) */}
      <View style={styles.mapContainer}>
        <View style={styles.mapCanvas}>
          {/* Subtle coordinate gridlines (dot map only) */}
          {(nativeMapAvailable ? [] : [0.2, 0.4, 0.6, 0.8]).map((frac) => (
            <React.Fragment key={frac}>
              <View style={[styles.gridLineH, { top: `${frac * 100}%` }]} pointerEvents="none" />
              <View style={[styles.gridLineV, { left: `${frac * 100}%` }]} pointerEvents="none" />
            </React.Fragment>
          ))}

          {/* Legend & Count Badge */}
          <View style={styles.mapOverlayBadge} pointerEvents="none">
            <Text style={styles.mapOverlayBadgeText}>
              {viewport.label} • {visibleHotels.length} {visibleHotels.length === 1 ? 'stay' : 'stays'}
            </Text>
          </View>

          <View style={styles.legendRow} pointerEvents="none">
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.uncharted }]} />
              <Text style={styles.legendText}>{t("Our stays")}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
              <Text style={styles.legendText}>{t("Other hotels")}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F43F5E' }]} />
              <Text style={styles.legendText}>{t("Saved")}</Text>
            </View>
          </View>

          {nativeMapAvailable ? (
            <Pressable
              style={styles.layerBtn}
              onPress={() => setSatellite((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={satellite ? 'Show street map' : 'Show satellite view'}
            >
              <Ionicons name={satellite ? 'map-outline' : 'earth'} size={16} color={Colors.inkPrimary} />
              <Text style={styles.layerBtnText}>{satellite ? t('Map') : t('Satellite')}</Text>
            </Pressable>
          ) : null}

          {/* The phone's own map (Apple Maps / Google Maps), or the light dot map */}
          {nativeMapAvailable ? (
            <NativeHotelMap
              hotels={visibleHotels}
              selectedId={selectedHotel?.id ?? null}
              onSelect={setSelectedId}
              colorFor={colorFor}
              bounds={viewport}
              satellite={satellite}
              pinKind={pinKind}
            />
          ) : (
            <DotMap
              hotels={visibleHotels}
              selectedId={selectedHotel?.id ?? null}
              onSelect={setSelectedId}
              colorFor={colorFor}
              bounds={viewport}
            />
          )}
        </View>
      </View>

      {/* Selected Hotel Preview Sheet */}
      {cardOpen && selectedHotel && selectedOdds ? (
        <View style={[styles.previewWrap, { bottom: cardBottom }]}>
          <View style={styles.previewCard}>
            <Pressable
              onPress={() => setCardOpen(false)}
              style={styles.previewClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close hotel card"
            >
              <Ionicons name="close" size={16} color={Colors.inkSecondary} />
            </Pressable>
            <View style={styles.previewTop}>
              <Image source={{ uri: selectedHotel.thumbnail }} style={styles.previewThumb} />
              <View style={{ flex: 1 }}>
                <View style={styles.previewMetaRow}>
                  <Text
                    style={[
                      styles.previewTier,
                      { color: selectedOdds.firstHand ? Colors.accent : Colors.teal },
                    ]}
                  >
                    {selectedOdds.tierLabel}
                  </Text>
                  <Text style={styles.previewCoords}>
                    {selectedHotel.lat.toFixed(2)}°, {selectedHotel.lng.toFixed(2)}°
                  </Text>
                </View>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {selectedHotel.name}
                </Text>
                <Text style={styles.previewLoc} numberOfLines={1}>
                  {selectedHotel.location}, {selectedHotel.country}
                  {selectedHotel.brand ? ` • ${selectedHotel.brand}` : ''}
                </Text>
              </View>

              <View
                style={[
                  styles.previewRing,
                  { borderColor: getTonePalette(selectedOdds.statusTone).ring },
                ]}
              >
                <Text style={styles.previewRingNum}>
                  {selectedOdds.greatStayOdds != null ? `${selectedOdds.greatStayOdds}%` : '—'}
                </Text>
                <Text style={styles.previewRingLbl}>ODDS</Text>
              </View>
            </View>

            <View style={styles.previewActions}>
              <Pressable
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={() =>
                  router.push({ pathname: '/hotel/[id]', params: { id: selectedHotel.id } })
                }
              >
                <Text style={styles.btnPrimaryText}>{t("Full Breakdown →")}</Text>
              </Pressable>

              <Pressable
                style={styles.btnOutline}
                accessibilityLabel={process.env.EXPO_OS === 'ios' ? 'Open in Apple Maps' : 'Open in Google Maps'}
                onPress={() => openInMaps(selectedHotel)}
              >
                <Ionicons name="navigate-outline" size={14} color={Colors.accentDark} />
                <Text style={styles.btnOutlineText}>{t("Maps")}</Text>
              </Pressable>

              <Pressable
                style={styles.btnOutline}
                onPress={() => {
                  pushToCompare(selectedHotel.id);
                  router.push('/compare');
                }}
              >
                <Ionicons name="git-compare-outline" size={14} color={Colors.accentDark} />
                <Text style={styles.btnOutlineText}>VS</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.btnOutline,
                  isShortlisted(selectedHotel.id) && {
                    backgroundColor: '#FFF1F2',
                    borderColor: '#F43F5E',
                  },
                ]}
                onPress={() => toggleShortlist(selectedHotel.id)}
              >
                <Ionicons
                  name={isShortlisted(selectedHotel.id) ? 'heart' : 'heart-outline'}
                  size={15}
                  color={isShortlisted(selectedHotel.id) ? '#E11D48' : Colors.inkSecondary}
                />
              </Pressable>
            </View>
          </View>

        </View>
      ) : visibleHotels.length ? null : (
        <View style={styles.emptyPreview}>
          <Text style={styles.emptyTitle}>
            {scope === 'saved'
              ? 'No saved hotels in this region yet'
              : 'No hotels matched this map filter'}
          </Text>
          <Text style={styles.emptySub}>
            Switch to World or All to see all {hotels.length} plotted luxury properties.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.bgCanvas },
  loadingText: { color: Colors.inkSecondary, fontSize: 14, fontWeight: '600' },

  headerPanel: {
    backgroundColor: Colors.bgWhite,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  scopeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  scopeText: {
    color: Colors.inkSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  scopeTextActive: {
    color: '#FFFFFF',
  },
  awardRowLabel: { color: Colors.inkSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  awardClear: { paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' },
  awardClearText: { color: Colors.accent, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  matchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  matchText: { color: Colors.inkSecondary, fontSize: 12 },
  matchBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  matchBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  matchBtnText: { color: Colors.inkSecondary, fontSize: 12, fontWeight: '700' },
  matchBtnTextActive: { color: '#FFFFFF' },
  webMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.5)',
  },
  webMapBtnText: {
    color: Colors.accentDark,
    fontSize: 11.5,
    fontWeight: '700',
  },
  regionStrip: {
    gap: 8,
    paddingRight: 8,
  },
  regionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regionPillActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  regionText: {
    color: Colors.inkSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  regionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // the map takes every bit of the screen the controls don't
  mapContainer: {
    flex: 1,
    minHeight: 260,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#0B3A44',
    overflow: 'hidden',
    position: 'relative',
  },
  layerBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  layerBtnText: { color: Colors.inkPrimary, fontSize: 13, fontWeight: '700' },
  filtersBtnOn: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  previewClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCanvas,
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  mapOverlayBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 19, 35, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    zIndex: 40,
  },
  mapOverlayBadgeText: {
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: '700',
  },
  legendRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(7, 19, 35, 0.82)',
    zIndex: 40,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#CBD5E1', fontSize: 10.5, fontWeight: '600' },

  pinWrap: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },

  // the card floats over the bottom of the map
  previewWrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 8,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  previewTop: {
    paddingRight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.slateSoft,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  previewTier: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  previewCoords: {
    fontSize: 10.5,
    color: Colors.inkMuted,
    fontWeight: '600',
  },
  previewTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.inkPrimary,
    marginTop: 1,
  },
  previewLoc: {
    fontSize: 12.5,
    color: Colors.inkSecondary,
    marginTop: 1,
  },
  previewRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRingNum: {
    fontSize: 13.5,
    fontWeight: '900',
    color: Colors.inkPrimary,
  },
  previewRingLbl: {
    fontSize: 8.5,
    fontWeight: '700',
    color: Colors.inkMuted,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: Colors.bgWarm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnOutlineText: {
    color: Colors.accentDark,
    fontSize: 12.5,
    fontWeight: '800',
  },
  nearbyRow: {
    gap: 8,
    paddingHorizontal: 2,
  },
  nearbyChip: {
    maxWidth: 185,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nearbyChipActive: {
    backgroundColor: Colors.navy,
    borderColor: Colors.navy,
  },
  nearbyChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.inkPrimary,
  },
  nearbyChipTextActive: {
    color: '#FFFFFF',
  },
  emptyPreview: {
    margin: 12,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: Colors.inkPrimary,
  },
  emptySub: {
    fontSize: 12.5,
    color: Colors.inkSecondary,
    textAlign: 'center',
  },
});

export default lazyTab(withRailShortcuts(WorldMapScreen));
