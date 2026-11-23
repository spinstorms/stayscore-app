import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { HotelDetailContent } from '../../components/HotelDetailContent';
import { RequestResortModal } from '../../components/SupportModals';
import { openExternalUrl } from '../../lib/api';
import { BRAND } from '../../lib/brand';
import { formatPersonalScore, useAdaptiveLayout } from '../../lib/layout';
import { computeStayOdds, getTonePalette, getTripAdvisorUrl, isVisitedProperty } from '../../lib/scoring';
import { useStayOdds } from '../../lib/store';
import { Colors } from '../../lib/theme';
import type { Hotel } from '../../lib/types';

type Scope = 'all' | 'visited' | 'world';

export default function StayOddsHomeScreen() {
  const router = useRouter();
  const { isSplitScreen } = useAdaptiveLayout();
  const { hotels, visitedCount, worldCount, loading, refreshing, refresh } = useStayOdds();

  const [scope, setScope] = useState<Scope>('all');
  const [region, setRegion] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('taaktana-labuan-bajo');
  const [requestOpen, setRequestOpen] = useState(false);

  const scopedHotels = useMemo(() => {
    if (scope === 'visited') return hotels.filter(isVisitedProperty);
    if (scope === 'world') return hotels.filter((h) => !isVisitedProperty(h));
    return hotels;
  }, [hotels, scope]);

  const regions = useMemo(() => {
    const set = new Set(scopedHotels.map((h) => h.region));
    return ['All', ...Array.from(set)];
  }, [scopedHotels]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedHotels
      .filter((h) => {
        if (region !== 'All' && h.region !== region) return false;
        if (!q) return true;
        return [h.name, h.location, h.country, h.region, h.brand, h.verdict, h.standout]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const oa = computeStayOdds(a);
        const ob = computeStayOdds(b);
        const tierRank = (o: ReturnType<typeof computeStayOdds>) =>
          o.firstHand ? 2 : o.visited ? 1 : 0;
        if (tierRank(ob) !== tierRank(oa)) return tierRank(ob) - tierRank(oa);
        return (ob.greatStayOdds ?? -1) - (oa.greatStayOdds ?? -1) || a.name.localeCompare(b.name);
      });
  }, [scopedHotels, region, search]);

  const selectedHotel = useMemo(
    () => hotels.find((h) => h.id === selectedId) || filtered[0] || hotels[0] || null,
    [hotels, filtered, selectedId]
  );

  const handleOpenHotel = (h: Hotel) => {
    if (isSplitScreen) {
      setSelectedId(h.id);
    } else {
      router.push({ pathname: '/hotel/[id]', params: { id: h.id } });
    }
  };

  const renderCard = ({ item: h, index }: { item: Hotel; index: number }) => {
    const o = computeStayOdds(h);
    const palette = getTonePalette(o.statusTone);
    const active = isSplitScreen && selectedHotel?.id === h.id;
    const topAward = o.officialAwards?.[0]?.label;

    return (
      <Pressable
        onPress={() => handleOpenHotel(h)}
        style={[styles.card, active && styles.cardSelected]}
      >
        <View style={styles.cardHeroWrap}>
          <Image source={{ uri: h.thumbnail }} style={styles.cardHeroImg} resizeMode="cover" />

          {/* Top overlay: tier pill + floating white-and-orange StayOdds ring */}
          <View style={styles.cardHeroTop}>
            <View style={styles.topLeftPills}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{index + 1}</Text>
              </View>
              <View
                style={[
                  styles.heroTag,
                  {
                    backgroundColor: o.firstHand ? Colors.accent : 'rgba(15, 23, 42, 0.78)',
                  },
                ]}
              >
                <Text style={styles.heroTagText}>{o.tierLabel}</Text>
              </View>
            </View>

            <View
              style={[
                styles.ring,
                { borderColor: o.greatStayOdds != null ? Colors.accent : palette.ring },
              ]}
            >
              <Text style={styles.ringPct}>
                {o.greatStayOdds != null ? `${o.greatStayOdds}%` : topAward ? '★' : '—'}
              </Text>
              <Text style={styles.ringLabel}>
                {o.greatStayOdds != null ? 'ODDS' : topAward ? 'AWARD' : 'OPEN'}
              </Text>
            </View>
          </View>

          {/* Bottom frosted light glass overlay panel (Option 3 signature) */}
          <View style={styles.cardBottomOverlay}>
            {topAward ? (
              <View style={styles.awardPill}>
                <Ionicons name="ribbon-outline" size={11} color="#FFFFFF" />
                <Text style={styles.awardPillText} numberOfLines={1}>
                  {topAward}
                </Text>
              </View>
            ) : null}

            <View style={styles.frostedInfoBox}>
              <View style={styles.frostedTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.hotelName} numberOfLines={1}>
                    {h.name}
                  </Text>
                  <Text style={styles.hotelLoc} numberOfLines={1}>
                    {h.location}, {h.country}
                    {h.brand ? ` • ${h.brand}` : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    openExternalUrl(getTripAdvisorUrl(h));
                  }}
                  style={styles.taChip}
                >
                  <Text style={styles.taChipText}>TripAdvisor</Text>
                  <Ionicons name="open-outline" size={11} color={Colors.inkSecondary} />
                </Pressable>
              </View>

              <View style={styles.frostedStatsRow}>
                <Text style={styles.statText}>
                  <Text style={styles.statBold}>
                    {o.personalScore25 != null
                      ? `${o.personalScore25}/25`
                      : o.firstHand
                      ? `${formatPersonalScore(h.overall)}/5`
                      : o.visited
                      ? 'Short'
                      : 'Global'}
                  </Text>{' '}
                  {o.firstHand ? 'My Stay' : 'Tier'}
                </Text>
                <Text style={styles.statDot}>•</Text>
                <Text style={styles.statText}>
                  <Text style={[styles.statBold, o.verifiedGuest && { color: Colors.teal }]}>
                    {o.verifiedGuest
                      ? `${o.verifiedGuest.rating.toFixed(1)}/${o.verifiedGuest.scale}`
                      : 'Live'}
                  </Text>{' '}
                  Guests
                </Text>
                <Text style={styles.statDot}>•</Text>
                <Text style={styles.statText}>
                  <Text style={styles.statBold}>{o.opinionGap.deltaLabel}</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.navyHeaderPanel}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={17} color="rgba(255,255,255,0.68)" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${BRAND.name}: Maldives, Bali, Four Seasons...`}
          placeholderTextColor="rgba(255,255,255,0.58)"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.75)" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.scopeBar}>
        {(
          [
            ['all', `All (${hotels.length})`],
            ['visited', `First-Hand (${visitedCount})`],
            ['world', `Global (${worldCount})`],
          ] as const
        ).map(([val, lbl]) => (
          <Pressable
            key={val}
            onPress={() => {
              setScope(val);
              setRegion('All');
            }}
            style={[styles.scopeBtn, scope === val && styles.scopeBtnActive]}
          >
            <Text style={[styles.scopeText, scope === val && styles.scopeTextActive]}>{lbl}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
        {regions.map((r) => {
          const isActive = region === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRegion(r)}
              style={[styles.regionPill, isActive && styles.regionPillActive]}
            >
              <Text style={[styles.regionText, isActive && styles.regionTextActive]}>{r}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setRequestOpen(true)}
          style={[styles.regionPill, { borderColor: Colors.accent, backgroundColor: 'rgba(255, 93, 34, 0.22)' }]}
        >
          <Text style={[styles.regionText, { color: '#FFFFFF', fontWeight: '700' }]}>+ Request Resort</Text>
        </Pressable>
      </ScrollView>
    </View>
  );

  if (loading && !hotels.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading {BRAND.name} directory…</Text>
      </View>
    );
  }

  if (isSplitScreen) {
    return (
      <View style={styles.splitRoot}>
        <View style={styles.splitLeft}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            ListHeaderComponent={listHeader}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
          />
        </View>
        <View style={styles.splitRight}>
          {selectedHotel ? <HotelDetailContent hotel={selectedHotel} isSidePane /> : null}
        </View>
        <RequestResortModal visible={requestOpen} onClose={() => setRequestOpen(false)} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      />
      <RequestResortModal visible={requestOpen} onClose={() => setRequestOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.bgCanvas },
  loadingText: { color: Colors.inkSecondary, fontSize: 14, fontWeight: '600' },

  splitRoot: { flex: 1, flexDirection: 'row', backgroundColor: Colors.bgCanvas },
  splitLeft: { width: '44%', minWidth: 320, borderRightWidth: 1, borderRightColor: Colors.border },
  splitRight: { flex: 1 },

  listContent: { paddingBottom: 34, gap: 14 },

  navyHeaderPanel: {
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 11,
    marginBottom: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#FFFFFF' },

  scopeBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 999,
    padding: 3,
    gap: 4,
  },
  scopeBtn: { flex: 1, paddingVertical: 7, borderRadius: 999, alignItems: 'center' },
  scopeBtnActive: { backgroundColor: '#FFFFFF' },
  scopeText: { fontSize: 11.5, fontWeight: '700', color: 'rgba(255,255,255,0.75)' },
  scopeTextActive: { color: Colors.navy },

  regionRow: { gap: 8, paddingVertical: 2 },
  regionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  regionPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  regionText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
  regionTextActive: { color: '#FFFFFF' },

  card: {
    marginHorizontal: 14,
    backgroundColor: Colors.bgWhite,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardSelected: {
    borderColor: Colors.accent,
    borderWidth: 2,
  },
  cardHeroWrap: {
    position: 'relative',
    height: 256,
    backgroundColor: Colors.navy,
  },
  cardHeroImg: {
    width: '100%',
    height: '100%',
  },
  cardHeroTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topLeftPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  rankBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rankBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' },
  heroTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroTagText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' },

  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3.5,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 15, fontWeight: '900', color: Colors.navy, lineHeight: 17 },
  ringLabel: { fontSize: 7.5, fontWeight: '800', color: Colors.inkMuted, letterSpacing: 0.4 },

  cardBottomOverlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    gap: 6,
  },
  awardPill: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.teal,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  awardPillText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' },

  frostedInfoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  frostedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  hotelName: { fontSize: 16.5, fontWeight: '800', color: Colors.navy },
  hotelLoc: { fontSize: 11.5, color: Colors.inkSecondary, marginTop: 1 },
  frostedStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statText: { fontSize: 11.5, color: Colors.inkSecondary, fontWeight: '500' },
  statBold: { fontWeight: '800', color: Colors.navy },
  statDot: { fontSize: 11, color: Colors.inkMuted },

  taChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  taChipText: { fontSize: 10.5, fontWeight: '700', color: Colors.inkSecondary },
});
