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

    return (
      <Pressable
        onPress={() => handleOpenHotel(h)}
        style={[styles.card, { borderLeftColor: palette.ring }, active && styles.cardSelected]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.ring, { borderColor: palette.ring, backgroundColor: palette.soft }]}>
            <Text style={[styles.ringPct, { color: palette.color }]}>
              {o.greatStayOdds != null ? `${o.greatStayOdds}%` : '—'}
            </Text>
            <Text style={styles.ringLabel}>{o.greatStayOdds != null ? 'ODDS' : 'PENDING'}</Text>
          </View>

          <View style={{ flex: 1, gap: 4 }}>
            <View style={styles.tagLine}>
              <Text style={styles.rankText}>#{index + 1}</Text>
              <View
                style={[
                  styles.miniTag,
                  { backgroundColor: o.firstHand ? Colors.accentSoft : Colors.slateSoft },
                ]}
              >
                <Text
                  style={[
                    styles.miniTagText,
                    { color: o.firstHand ? Colors.accent : Colors.slate },
                  ]}
                >
                  {o.tierLabel}
                </Text>
              </View>
              <View style={[styles.miniTag, { backgroundColor: palette.soft }]}>
                <Text style={[styles.miniTagText, { color: palette.color }]}>{o.statusBadge}</Text>
              </View>
            </View>
            <Text style={styles.hotelName} numberOfLines={2}>
              {h.name}
            </Text>
            <Text style={styles.hotelLoc} numberOfLines={1}>
              {h.location}, {h.country}
              {h.brand ? ` • ${h.brand}` : ''}
            </Text>
          </View>

          <Image source={{ uri: h.thumbnail }} style={styles.thumb} />
        </View>

        <View style={styles.pillarRow}>
          <View style={styles.pillar}>
            <Text style={styles.pillarLbl}>First-Hand ({o.weights.firstHand}%)</Text>
            <Text style={[styles.pillarVal, o.firstHand && { color: Colors.accent }]}>
              {o.personalScore25 != null
                ? `${o.personalScore25}/25`
                : o.firstHand
                ? `${formatPersonalScore(h.overall)}/5`
                : o.visited
                ? 'Short'
                : 'Global'}
            </Text>
          </View>
          <View style={styles.pillar}>
            <Text style={styles.pillarLbl}>Guests ({o.weights.guests}%)</Text>
            <Text style={[styles.pillarVal, o.verifiedGuest && { color: Colors.googleGreen }]}>
              {o.verifiedGuest
                ? `${o.verifiedGuest.rating.toFixed(1)}/${o.verifiedGuest.scale}`
                : 'Live Detail'}
            </Text>
          </View>
          <View style={styles.pillar}>
            <Text style={styles.pillarLbl}>Opinion Gap</Text>
            <Text style={styles.pillarVal}>{o.opinionGap.deltaLabel}</Text>
          </View>
        </View>

        <View style={[styles.factsStrip, { alignItems: 'center' }]}>
          {o.keyFacts.slice(0, 2).map((kf) => (
            <View key={kf.label} style={styles.factChip}>
              <Text style={styles.factChipText} numberOfLines={1}>
                {kf.label}: {kf.value}
              </Text>
            </View>
          ))}
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              openExternalUrl(getTripAdvisorUrl(h));
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              paddingVertical: 3,
              paddingHorizontal: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: Colors.border,
              backgroundColor: Colors.bgWhite,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: Colors.inkMuted }}>TripAdvisor</Text>
            <Ionicons name="open-outline" size={11} color={Colors.inkMuted} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.scopeBar}>
        {(
          [
            ['all', `All (${hotels.length})`],
            ['visited', `First-Hand (${visitedCount})`],
            ['world', `Global (${worldCount})`],
          ] as [Scope, string][]
        ).map(([key, label]) => {
          const isActive = scope === key;
          return (
            <Pressable
              key={key}
              onPress={() => {
                setScope(key);
                setRegion('All');
              }}
              style={[styles.scopeBtn, isActive && styles.scopeBtnActive]}
            >
              <Text style={[styles.scopeText, isActive && styles.scopeTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={Colors.inkMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${BRAND.name}: Maldives, Bali, Four Seasons...`}
          placeholderTextColor={Colors.inkMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={17} color={Colors.inkMuted} />
          </Pressable>
        ) : null}
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

  listContent: { padding: 14, gap: 12, paddingBottom: 30 },
  headerBlock: { gap: 10, marginBottom: 4 },

  scopeBar: {
    flexDirection: 'row',
    backgroundColor: Colors.charcoal,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  scopeBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  scopeBtnActive: { backgroundColor: Colors.accent },
  scopeText: { fontSize: 11.5, fontWeight: '700', color: '#B8BDC7' },
  scopeTextActive: { color: '#FFFFFF' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },

  regionRow: { gap: 7, paddingVertical: 2 },
  regionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regionPillActive: { backgroundColor: Colors.charcoal, borderColor: Colors.charcoal },
  regionText: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary },
  regionTextActive: { color: '#FFFFFF' },

  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    padding: 12,
    gap: 10,
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.bgWarm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ring: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 15, fontWeight: '900', lineHeight: 17 },
  ringLabel: { fontSize: 7.5, fontWeight: '800', color: Colors.inkMuted, letterSpacing: 0.4 },

  tagLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  rankText: { fontSize: 11, fontWeight: '800', color: Colors.inkMuted },
  miniTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  miniTagText: { fontSize: 10, fontWeight: '800' },
  hotelName: { fontSize: 15, fontWeight: '800', color: Colors.inkPrimary },
  hotelLoc: { fontSize: 12, color: Colors.inkSecondary },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: Colors.bgCanvas },

  pillarRow: {
    flexDirection: 'row',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    paddingTop: 9,
  },
  pillar: {
    flex: 1,
    backgroundColor: Colors.bgCanvas,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  pillarLbl: { fontSize: 9.5, fontWeight: '700', color: Colors.inkMuted },
  pillarVal: { fontSize: 12, fontWeight: '800', color: Colors.inkPrimary, marginTop: 2 },
  factsStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  factChip: {
    backgroundColor: Colors.bgWarm,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  factChipText: { fontSize: 11, fontWeight: '600', color: Colors.inkSecondary },
});
