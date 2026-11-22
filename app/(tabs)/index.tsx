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
    const topAward = o.officialAwards?.[0]?.label;

    return (
      <Pressable
        onPress={() => handleOpenHotel(h)}
        style={[styles.card, active && styles.cardSelected]}
      >
        <View style={styles.cardHeroWrap}>
          <Image source={{ uri: h.thumbnail }} style={styles.cardHeroImg} resizeMode="cover" />
          <View style={styles.cardHeroScrim} />

          {/* Top overlay badges */}
          <View style={styles.cardHeroTop}>
            <View style={styles.topLeftPills}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{index + 1}</Text>
              </View>
              <View
                style={[
                  styles.heroTag,
                  {
                    backgroundColor: o.firstHand ? 'rgba(217, 169, 89, 0.92)' : 'rgba(11, 14, 20, 0.78)',
                    borderColor: o.firstHand ? Colors.accent : 'rgba(255,255,255,0.18)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroTagText,
                    { color: o.firstHand ? Colors.accentInk : Colors.inkPrimary },
                  ]}
                >
                  {o.tierLabel}
                </Text>
              </View>
            </View>

            <View style={[styles.ring, { borderColor: palette.ring }]}>
              <Text style={[styles.ringPct, { color: palette.color }]}>
                {o.greatStayOdds != null ? `${o.greatStayOdds}%` : topAward ? '★' : '—'}
              </Text>
              <Text style={styles.ringLabel}>
                {o.greatStayOdds != null ? 'ODDS' : topAward ? 'AWARD' : 'OPEN'}
              </Text>
            </View>
          </View>

          {/* Bottom title overlay */}
          <View style={styles.cardHeroBottom}>
            {topAward ? (
              <View style={styles.awardPill}>
                <Ionicons name="ribbon-outline" size={11} color={Colors.accent} />
                <Text style={styles.awardPillText} numberOfLines={1}>
                  {topAward}
                </Text>
              </View>
            ) : null}
            <Text style={styles.hotelName} numberOfLines={2}>
              {h.name}
            </Text>
            <Text style={styles.hotelLoc} numberOfLines={1}>
              {h.location}, {h.country}
              {h.brand ? ` • ${h.brand}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.pillarRow}>
            <View style={styles.pillar}>
              <Text style={styles.pillarLbl}>My Stay</Text>
              <Text style={[styles.pillarVal, o.firstHand && { color: Colors.accent }]}>
                {o.personalScore25 != null
                  ? `${o.personalScore25}/25`
                  : o.firstHand
                  ? `${formatPersonalScore(h.overall)}/5`
                  : o.visited
                  ? 'Short'
                  : 'Directory'}
              </Text>
            </View>
            <View style={styles.pillar}>
              <Text style={styles.pillarLbl}>Guests</Text>
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
              style={styles.taChip}
            >
              <Text style={styles.taChipText}>TripAdvisor</Text>
              <Ionicons name="open-outline" size={11} color={Colors.inkSecondary} />
            </Pressable>
          </View>
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

  listContent: { padding: 14, gap: 16, paddingBottom: 34 },
  headerBlock: { gap: 11, marginBottom: 4 },

  scopeBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  scopeBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  scopeBtnActive: { backgroundColor: Colors.accent },
  scopeText: { fontSize: 11.5, fontWeight: '700', color: Colors.inkSecondary },
  scopeTextActive: { color: Colors.accentInk },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgWhite,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },

  regionRow: { gap: 8, paddingVertical: 2 },
  regionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regionPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  regionText: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary },
  regionTextActive: { color: Colors.accentInk },

  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: Colors.accent,
    borderWidth: 1.5,
  },
  cardHeroWrap: {
    position: 'relative',
    height: 196,
    backgroundColor: Colors.charcoal,
  },
  cardHeroImg: {
    width: '100%',
    height: '100%',
  },
  cardHeroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 14, 20, 0.42)',
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
    backgroundColor: 'rgba(11, 14, 20, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rankBadgeText: { fontSize: 10.5, fontWeight: '800', color: Colors.inkPrimary },
  heroTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroTagText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.2 },

  ring: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    backgroundColor: 'rgba(11, 14, 20, 0.84)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: { fontSize: 15, fontWeight: '900', lineHeight: 17 },
  ringLabel: { fontSize: 7.5, fontWeight: '800', color: Colors.inkSecondary, letterSpacing: 0.5 },

  cardHeroBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(11, 14, 20, 0.72)',
    gap: 3,
  },
  awardPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 169, 89, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(217, 169, 89, 0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
  },
  awardPillText: { fontSize: 10, fontWeight: '800', color: Colors.accentDark },
  hotelName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.1 },
  hotelLoc: { fontSize: 12, color: '#D1D5DB', fontWeight: '500' },

  cardFooter: {
    padding: 12,
    gap: 10,
  },
  pillarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillar: {
    flex: 1,
    backgroundColor: Colors.bgCanvas,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  pillarLbl: { fontSize: 9.5, fontWeight: '700', color: Colors.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  pillarVal: { fontSize: 12.5, fontWeight: '800', color: Colors.inkPrimary, marginTop: 2 },
  factsStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  factChip: {
    backgroundColor: Colors.bgWarm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: '100%',
  },
  factChipText: { fontSize: 11, fontWeight: '600', color: Colors.inkSecondary },
  taChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCanvas,
  },
  taChipText: { fontSize: 11, fontWeight: '600', color: Colors.inkSecondary },
});
