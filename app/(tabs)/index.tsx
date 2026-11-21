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
import {
  formatPersonalScore,
  isRatedHotel,
  isVisitedHotel,
  useAdaptiveLayout,
} from '../../lib/layout';
import { useStayScore } from '../../lib/store';
import { Colors, getVerdictPalette } from '../../lib/theme';
import type { Hotel } from '../../lib/types';

type Scope = 'all' | 'visited' | 'world';

export default function StayScoreHomeScreen() {
  const router = useRouter();
  const { isSplitScreen } = useAdaptiveLayout();
  const { hotels, visitedCount, worldCount, loading, refreshing, refresh } = useStayScore();

  const [scope, setScope] = useState<Scope>('all');
  const [region, setRegion] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('taaktana-labuan-bajo');

  const scopedHotels = useMemo(() => {
    if (scope === 'visited') return hotels.filter(isVisitedHotel);
    if (scope === 'world') return hotels.filter((h) => !isVisitedHotel(h));
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
        return [h.name, h.location, h.country, h.region, h.brand, h.consensus?.award, h.standout]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort(
        (a, b) =>
          (b.consensus?.greatStayChance || 0) - (a.consensus?.greatStayChance || 0) ||
          (b.consensus?.overallIndex || 0) - (a.consensus?.overallIndex || 0)
      );
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
    const c = h.consensus;
    const rated = isRatedHotel(h);
    const visited = isVisitedHotel(h);
    const palette = getVerdictPalette(c.agreement, rated);
    const active = isSplitScreen && selectedHotel?.id === h.id;

    return (
      <Pressable
        onPress={() => handleOpenHotel(h)}
        style={[
          styles.card,
          { borderLeftColor: palette.ring },
          active && styles.cardSelected,
        ]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.ring, { borderColor: palette.ring, backgroundColor: palette.soft }]}>
            <Text style={[styles.ringPct, { color: palette.color }]}>{c.greatStayChance}%</Text>
            <Text style={styles.ringLabel}>ODDS</Text>
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.tagLine}>
              <Text style={styles.rankText}>#{index + 1}</Text>
              <View style={[styles.miniTag, { backgroundColor: visited ? Colors.accentSoft : Colors.slateSoft }]}>
                <Text style={[styles.miniTagText, { color: visited ? Colors.accent : Colors.slate }]}>
                  {visited ? 'Visited' : 'Global'}
                </Text>
              </View>
              <View style={[styles.miniTag, { backgroundColor: palette.soft }]}>
                <Text style={[styles.miniTagText, { color: palette.color }]}>{c.agreement}</Text>
              </View>
            </View>
            <Text style={styles.hotelName} numberOfLines={2}>
              {h.name}
            </Text>
            <Text style={styles.hotelLoc} numberOfLines={1}>
              {h.location}, {h.country} • {h.priceRange || h.brand}
            </Text>
          </View>

          <Image source={{ uri: h.thumbnail }} style={styles.thumb} />
        </View>

        {/* 3 Color-Coded Pillars */}
        <View style={styles.pillarRow}>
          <View style={[styles.pillar, { backgroundColor: Colors.accentSoft }]}>
            <Text style={styles.pillarK}>Uncharted</Text>
            <Text style={[styles.pillarV, { color: Colors.accent }]}>
              {rated ? `${formatPersonalScore(h.overall)}/5` : visited ? 'Short' : 'Unvisited'}
            </Text>
          </View>
          <View style={[styles.pillar, { backgroundColor: Colors.bookingSoft }]}>
            <Text style={styles.pillarK}>Booking</Text>
            <Text style={[styles.pillarV, { color: Colors.bookingBlue }]}>
              {(c.bookingOverall || c.googleRating * 2).toFixed(1)}/10
            </Text>
          </View>
          <View style={[styles.pillar, { backgroundColor: Colors.googleSoft }]}>
            <Text style={styles.pillarK}>Google</Text>
            <Text style={[styles.pillarV, { color: Colors.googleGreen }]}>
              {c.googleRating.toFixed(1)}★
            </Text>
          </View>
          <View style={[styles.pillar, { backgroundColor: Colors.slateSoft }]}>
            <Text style={styles.pillarK}>StayScore</Text>
            <Text style={[styles.pillarV, { color: Colors.inkPrimary }]}>{c.overallIndex}/100</Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.headerWrap}>
      {/* Scope Switcher */}
      <View style={styles.scopeBar}>
        {[
          { id: 'all' as Scope, label: `All World (${hotels.length})` },
          { id: 'visited' as Scope, label: `Visited (${visitedCount})` },
          { id: 'world' as Scope, label: `Global (${worldCount})` },
        ].map((t) => (
          <Pressable
            key={t.id}
            onPress={() => {
              setScope(t.id);
              setRegion('All');
            }}
            style={[styles.scopeBtn, scope === t.id && styles.scopeBtnActive]}
          >
            <Text style={[styles.scopeText, scope === t.id && styles.scopeTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Colors.inkMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search Maldives, Aman, Ritz-Carlton, Dubai, Bali…"
          placeholderTextColor={Colors.inkMuted}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Region Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
        {regions.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRegion(r)}
            style={[styles.regionPill, region === r && styles.regionPillActive]}
          >
            <Text style={[styles.regionText, region === r && styles.regionTextActive]}>{r}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

  if (loading && !hotels.length) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading 112 Global Luxury StayScores…</Text>
      </View>
    );
  }

  const listPane = (
    <FlatList
      data={filtered}
      keyExtractor={(item) => item.id}
      renderItem={renderCard}
      ListHeaderComponent={listHeader}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No hotels matched your search. Try switching to All World.</Text>
        </View>
      }
    />
  );

  // Adaptive Dual-Screen / Unfolded Foldable / iPhone Duo / Tablet Split-Pane!
  if (isSplitScreen) {
    return (
      <View style={styles.splitRoot}>
        <View style={styles.splitLeft}>{listPane}</View>
        <View style={styles.splitRight}>
          {selectedHotel ? (
            <HotelDetailContent hotel={selectedHotel} isSidePane />
          ) : (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>Select any luxury hotel on the left to inspect its StayScore.</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return <View style={styles.root}>{listPane}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bgCanvas },
  splitRoot: { flex: 1, flexDirection: 'row', backgroundColor: Colors.bgCanvas },
  splitLeft: {
    width: '45%',
    maxWidth: 460,
    minWidth: 320,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  splitRight: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  loadingText: { fontSize: 14, color: Colors.inkSecondary, textAlign: 'center' },
  listContent: { padding: 14, gap: 12, paddingBottom: 32 },
  headerWrap: { gap: 10, marginBottom: 4 },
  scopeBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  scopeBtnActive: { backgroundColor: Colors.charcoal },
  scopeText: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary },
  scopeTextActive: { color: '#FFFFFF' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },
  regionRow: { gap: 7, paddingVertical: 2 },
  regionPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regionPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  regionText: { fontSize: 12, fontWeight: '600', color: Colors.inkSecondary },
  regionTextActive: { color: '#FFFFFF' },
  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 5,
    gap: 11,
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: '#FFFDFB',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  ringLabel: { fontSize: 8.5, fontWeight: '700', color: Colors.inkMuted },
  tagLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5 },
  rankText: { fontSize: 11, fontWeight: '800', color: Colors.inkMuted },
  miniTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  miniTagText: { fontSize: 10, fontWeight: '700' },
  hotelName: { fontSize: 15.5, fontWeight: '700', color: Colors.inkPrimary, lineHeight: 20 },
  hotelLoc: { fontSize: 12, color: Colors.inkSecondary },
  thumb: { width: 68, height: 56, borderRadius: 10, backgroundColor: Colors.charcoal },
  pillarRow: { flexDirection: 'row', gap: 6 },
  pillar: { flex: 1, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 6, alignItems: 'center' },
  pillarK: { fontSize: 9.5, fontWeight: '600', color: Colors.inkSecondary },
  pillarV: { fontSize: 12, fontWeight: '800', marginTop: 1 },
  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { color: Colors.inkSecondary, textAlign: 'center' },
});
