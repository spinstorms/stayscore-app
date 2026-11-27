import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
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
import { HotelDetailContent } from '../../../components/HotelDetailContent';
import { StayOddsWordmark } from '../../../components/TabStack';
import { RequestResortModal } from '../../../components/SupportModals';
import { openExternalUrl } from '../../../lib/api';
import { BRAND } from '../../../lib/brand';
import { getBrandCategories, getMonthShortName, getPartnerPrograms, isBestInMonth } from '../../../lib/insights';
import { formatPersonalScore, useAdaptiveLayout } from '../../../lib/layout';
import { computeStayOdds, getTonePalette, getTripAdvisorUrl, isVisitedProperty } from '../../../lib/scoring';
import {
  FEATURE_FILTERS,
  getForbesRank,
  getMichelinKeyCount,
  getW50BestRank,
  type VerifiedFeature,
} from '../../../lib/features';
import { useStayOdds } from '../../../lib/store';
import { Colors } from '../../../lib/theme';
import type { Hotel } from '../../../lib/types';
import { lazyTab } from '../../../components/LazyTab';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withRailShortcuts } from '../../../components/RailShortcuts';
import { routes } from '../../../lib/nav';
import { t } from '../../../lib/i18n';

type Scope = 'all' | 'visited' | 'world' | 'saved';
const IOS = process.env.EXPO_OS === 'ios';
const stripEmoji = (s: string) => s.replace(/^[^A-Za-z0-9']+\s*/, '');
export function StayOddsHomeScreen() {
  const router = useRouter();
  const { isSplitScreen, isWideDesktop } = useAdaptiveLayout();
  const {
    hotels,
    visitedCount,
    worldCount,
    shortlist,
    toggleShortlist,
    isShortlisted,
    loading,
    refreshing,
    refresh,
  } = useStayOdds();

  const [scope, setScope] = useState<Scope>('all');
  const [region, setRegion] = useState('All');
  const [feature, setFeature] = useState<VerifiedFeature>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('taaktana-labuan-bajo');
  const [requestOpen, setRequestOpen] = useState(false);
  // Android/web: the less-used filter rows sit behind a "Filters" chip so the front screen stays calm.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const insets = useSafeAreaInsets();
  // Filters go in the rail on iPhone and the open Duo. On the folded Duo the rail already holds
  // the clock, the shortcuts and the tabs, so the filters stay in the page there instead.
  const foldedDuo = IOS && !isSplitScreen && (insets.left > 40 || insets.right > 40);
  const railFilters = IOS && !foldedDuo;

  const savedCount = useMemo(
    () => hotels.filter((h) => shortlist.includes(h.id)).length,
    [hotels, shortlist]
  );

  const scopedHotels = useMemo(() => {
    if (scope === 'visited') return hotels.filter(isVisitedProperty);
    if (scope === 'world') return hotels.filter((h) => !isVisitedProperty(h));
    if (scope === 'saved') {
      const set = new Set(shortlist);
      return hotels.filter((h) => set.has(h.id));
    }
    return hotels;
  }, [hotels, scope, shortlist]);

  const regions = useMemo(() => {
    const MACRO_ORDER = [
      'Europe',
      'Asia',
      'Maldives & Indian Ocean',
      'Australia & Pacific',
      'Americas',
      'Caribbean & Mexico',
      'Middle East',
      'Africa',
    ];
    const set = new Set(scopedHotels.map((h) => h.region).filter(Boolean));
    const ordered = MACRO_ORDER.filter((r) => set.has(r));
    for (const r of set) {
      if (!ordered.includes(r)) ordered.push(r);
    }
    return ['All', ...ordered];
  }, [scopedHotels]);

  // Scores worked out once per hotel, not again inside every sort comparison
  const oddsCache = useMemo(() => new Map<string, ReturnType<typeof computeStayOdds>>(), [hotels]);
  const oddsOf = (h: Hotel) => {
    let o = oddsCache.get(h.id);
    if (!o) {
      o = computeStayOdds(h);
      oddsCache.set(h.id, o);
    }
    return o;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const activeFeat = FEATURE_FILTERS.find((f) => f.id === feature) || FEATURE_FILTERS[0];
    return scopedHotels
      .filter((h) => {
        if (region !== 'All' && h.region !== region) return false;
        if (activeFeat.id !== 'all' && !activeFeat.match(h)) return false;
        if (selectedMonth > 0 && !isBestInMonth(h, selectedMonth)) return false;
        if (!q) return true;
        const brands = getBrandCategories(h).allBrands;
        const partner = getPartnerPrograms(h);
        return [
          h.name,
          h.location,
          h.country,
          h.region,
          h.brand,
          ...brands,
          partner.preferredProgram,
          partner.pointsProgram,
          h.verdict,
          h.standout,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (feature === '50best_50' || feature === '50best_100') {
          const ra = getW50BestRank(a) ?? 9999;
          const rb = getW50BestRank(b) ?? 9999;
          if (ra !== rb) return ra - rb;
        }
        if (feature.startsWith('michelin')) {
          const ka = getMichelinKeyCount(a) ?? -1;
          const kb = getMichelinKeyCount(b) ?? -1;
          if (kb !== ka) return kb - ka;
        }
        if (feature === 'forbes') {
          const fa = getForbesRank(a) ?? -1;
          const fb = getForbesRank(b) ?? -1;
          if (fb !== fa) return fb - fa;
        }
        const oa = oddsOf(a);
        const ob = oddsOf(b);
        const tierRank = (o: ReturnType<typeof computeStayOdds>) =>
          o.firstHand ? 2 : o.visited ? 1 : 0;
        if (tierRank(ob) !== tierRank(oa)) return tierRank(ob) - tierRank(oa);
        return (ob.greatStayOdds ?? -1) - (oa.greatStayOdds ?? -1) || a.name.localeCompare(b.name);
      });
  }, [scopedHotels, region, feature, selectedMonth, search]);

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
    const saved = isShortlisted(h.id);
    const isVerifiedTrack = o.scoreTrack === 'verified';

    return (
      <Pressable
        onPress={() => handleOpenHotel(h)}
        style={[styles.card, active && styles.cardSelected]}
      >
        <View style={styles.cardHeroWrap}>
          <Image source={{ uri: h.thumbnail }} style={styles.cardHeroImg} resizeMode="cover" />

          {/* Top overlay: tier pill + heart shortlist toggle + floating Two-Track ring */}
          <View style={styles.cardHeroTop}>
            <View style={styles.topLeftPills}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{index + 1}</Text>
              </View>
              <View
                style={[
                  styles.heroTag,
                  {
                    backgroundColor: isVerifiedTrack ? Colors.accent : 'rgba(15, 23, 42, 0.78)',
                  },
                ]}
              >
                <Text style={styles.heroTagText}>{o.scoreTrackLabel}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  toggleShortlist(h.id);
                }}
                accessibilityLabel={saved ? 'Remove from shortlist' : 'Save to shortlist'}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: saved ? '#FFF1F2' : 'rgba(15, 23, 42, 0.72)',
                  borderWidth: 1.5,
                  borderColor: saved ? '#F43F5E' : 'rgba(255, 255, 255, 0.25)',
                }}
              >
                <Ionicons
                  name={saved ? 'heart' : 'heart-outline'}
                  size={18}
                  color={saved ? '#E11D48' : '#FFFFFF'}
                />
              </Pressable>

              <View
                style={[
                  styles.ring,
                  isVerifiedTrack
                    ? { backgroundColor: Colors.accent, borderColor: '#FFFFFF', borderWidth: 2.5 }
                    : { backgroundColor: 'rgba(248, 250, 252, 0.94)', borderColor: '#0F766E', borderWidth: 2 },
                ]}
              >
                <Text style={[styles.ringPct, { color: isVerifiedTrack ? '#FFFFFF' : '#0F172A' }]}>
                  {o.greatStayOdds != null ? `${o.greatStayOdds}%` : topAward ? '★' : '—'}
                </Text>
                <Text style={[styles.ringLabel, { color: isVerifiedTrack ? '#FFFFFF' : '#0F766E' }]}>
                  {o.greatStayOdds != null ? (isVerifiedTrack ? 'VERIFIED' : 'MARKET') : topAward ? 'AWARD' : 'OPEN'}
                </Text>
              </View>
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
                    {o.personalScoreLabel
                      ? o.personalScoreLabel.replace(/ /g, '')
                      : o.firstHand
                      ? `${formatPersonalScore(h.overall)}/5`
                      : o.visited
                      ? h.coverageType === 'Short Tour'
                        ? 'Short'
                        : 'Filmed'
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

  const scopeLabels: Record<Scope, string> = {
    all: `All (${hotels.length})`,
    visited: `Verified by us (${visitedCount})`,
    world: `Global directory (${worldCount})`,
    saved: `Shortlist (${savedCount})`,
  };
  const activeFilterLabels = [
    scope !== 'all' ? scopeLabels[scope].replace(/ \(\d+\)$/, '') : '',
    feature !== 'all' ? stripEmoji(FEATURE_FILTERS.find((f) => f.id === feature)?.label || '') : '',
    selectedMonth ? `Best in ${getMonthShortName(selectedMonth)}` : '',
  ].filter(Boolean);
  const clearFilters = () => {
    setScope('all');
    setFeature('all');
    setSelectedMonth(0);
  };

  // iOS: filters and destinations live in the native header. On iPhone Duo the system moves
  // these icon buttons into the side rail, so the folded front screen keeps just search,
  // regions and the hotels.
  const iosToolbar = railFilters ? (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu
        icon={
          activeFilterLabels.length
            ? 'line.3.horizontal.decrease.circle.fill'
            : 'line.3.horizontal.decrease.circle'
        }
        accessibilityLabel={t("Filters")}
      >
        <Stack.Toolbar.Menu title="Show" inline>
          {(['all', 'visited', 'world', 'saved'] as const).map((val) => (
            <Stack.Toolbar.MenuAction
              key={val}
              isOn={scope === val}
              onPress={() => {
                setScope(val);
                setRegion('All');
              }}
            >
              {scopeLabels[val]}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu title="Awards and data" icon="trophy">
          {FEATURE_FILTERS.map((f) => (
            <Stack.Toolbar.MenuAction key={f.id} isOn={feature === f.id} onPress={() => setFeature(f.id)}>
              {stripEmoji(f.label)}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu title="Best month to go" icon="calendar">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <Stack.Toolbar.MenuAction key={m} isOn={selectedMonth === m} onPress={() => setSelectedMonth(m)}>
              {m === 0 ? 'Any month' : getMonthShortName(m)}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu title="More" inline>
          <Stack.Toolbar.MenuAction icon="trophy" onPress={() => router.push('/awards')}>
            {t("Award lists")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="plus.circle" onPress={() => setRequestOpen(true)}>
            Request a resort
          </Stack.Toolbar.MenuAction>
          {activeFilterLabels.length ? (
            <Stack.Toolbar.MenuAction icon="xmark.circle" onPress={clearFilters}>
              Clear filters
            </Stack.Toolbar.MenuAction>
          ) : null}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar.Menu>
      {/* One button only: the Duo rail also holds the tabs, and more buttons ran into them.
          Holidays and Insights are tabs; award lists are in this menu. */}
    </Stack.Toolbar>
  ) : null;

  const listHeader = (
    <View style={styles.navyHeaderPanel}>
      {!IOS && isSplitScreen ? (
        <View style={{ marginTop: 6, marginBottom: 12 }}>
          <StayOddsWordmark />
        </View>
      ) : null}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={17} color={Colors.inkSecondary} />
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
            <Ionicons name="close-circle" size={17} color={Colors.inkSecondary} />
          </Pressable>
        ) : null}
      </View>

      {railFilters ? null : (
      <View style={styles.scopeBar}>
        {(
          [
            ['all', `All (${hotels.length})`],
            ['visited', `Verified (${visitedCount})`],
            ['world', `Global (${worldCount})`],
            ['saved', `♥ ${savedCount}`],
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
            <Text style={[styles.scopeText, scope === val && styles.scopeTextActive]} numberOfLines={1}>
              {lbl}
            </Text>
          </Pressable>
        ))}
      </View>
      )}

      {railFilters ? (
        activeFilterLabels.length ? (
          <View style={styles.activeFilters}>
            <Ionicons name="funnel" size={12} color={Colors.inkSecondary} />
            <Text style={styles.activeFiltersText} numberOfLines={1}>
              {activeFilterLabels.join(' · ')}
            </Text>
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.activeFiltersClear}>{t("Clear")}</Text>
            </Pressable>
          </View>
        ) : null
      ) : (
        <View style={styles.quickLinks}>
          <Pressable
            onPress={() => setFiltersOpen((o) => !o)}
            style={[styles.quickLink, (filtersOpen || activeFilterLabels.length > 0) && styles.quickLinkOn]}
          >
            <Ionicons name="options-outline" size={15} color={Colors.inkPrimary} />
            <Text style={styles.quickLinkText} numberOfLines={1}>
              {t('Filters')}{activeFilterLabels.length ? ` (${activeFilterLabels.length})` : ''}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/awards')} style={styles.quickLink} accessibilityLabel={t("Award lists")}>
            <Ionicons name="trophy-outline" size={15} color={Colors.inkPrimary} />
            <Text style={styles.quickLinkText} numberOfLines={1}>{t("Awards")}</Text>
          </Pressable>
          <Pressable onPress={() => router.push(routes.holidays() as never)} style={styles.quickLink} accessibilityLabel={t("Holidays")}>
            <Ionicons name="gift-outline" size={15} color={Colors.inkPrimary} />
            <Text style={styles.quickLinkText} numberOfLines={1}>{t("Holidays")}</Text>
          </Pressable>
          <Pressable onPress={() => router.push(routes.insights() as never)} style={styles.quickLink} accessibilityLabel="Guest insights">
            <Ionicons name="stats-chart-outline" size={15} color={Colors.inkPrimary} />
            <Text style={styles.quickLinkText} numberOfLines={1}>{t("Insights")}</Text>
          </Pressable>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionRow}>
        {regions.map((r) => {
          const isActive = region === r;
          return (
            <Pressable
              key={r}
              onPress={() => setRegion(r)}
              style={[styles.regionPill, isActive && styles.regionPillActive]}
            >
              <Text style={[styles.regionText, isActive && styles.regionTextActive]}>{r === 'All' ? t('All') : t(r)}</Text>
            </Pressable>
          );
        })}
        {railFilters ? null : (
          <Pressable
            onPress={() => setRequestOpen(true)}
            style={[styles.regionPill, { borderColor: Colors.accent, backgroundColor: 'rgba(11, 122, 122, 0.22)' }]}
          >
            <Text style={[styles.regionText, { color: Colors.inkPrimary, fontWeight: '700' }]}>+ Request Resort</Text>
          </Pressable>
        )}
      </ScrollView>

      {!railFilters && filtersOpen ? (
        <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.regionRow, { paddingTop: 2 }]}
      >
        {FEATURE_FILTERS.map((f) => {
          const isActive = feature === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFeature(f.id)}
              style={[
                styles.regionPill,
                {
                  borderColor: isActive ? '#38BDF8' : Colors.border,
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.22)' : Colors.bgCanvas,
                },
              ]}
            >
              <Text
                style={[
                  styles.regionText,
                  { color: isActive ? '#075985' : Colors.inkSecondary, fontSize: 11.5 },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.regionRow, { paddingTop: 2 }]}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
          const isActive = selectedMonth === m;
          const label = m === 0 ? '☀ Any Month' : getMonthShortName(m);
          return (
            <Pressable
              key={m}
              onPress={() => setSelectedMonth(m)}
              style={[
                styles.regionPill,
                {
                  borderColor: isActive ? '#FBBF24' : Colors.border,
                  backgroundColor: isActive ? 'rgba(251, 191, 36, 0.22)' : Colors.bgCanvas,
                },
              ]}
            >
              <Text
                style={[
                  styles.regionText,
                  { color: isActive ? '#92400E' : Colors.inkSecondary, fontSize: 11 },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
        </>
      ) : null}
    </View>
  );

  const emptyList = (
    <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
      <Ionicons
        name={scope === 'saved' ? 'heart-outline' : 'search-outline'}
        size={34}
        color={Colors.inkMuted}
      />
      <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.inkPrimary, textAlign: 'center' }}>
        {scope === 'saved' && savedCount === 0
          ? 'Your Shortlist is empty'
          : 'No resorts matched these filters'}
      </Text>
      <Text style={{ fontSize: 13, color: Colors.inkSecondary, textAlign: 'center', lineHeight: 19 }}>
        {scope === 'saved' && savedCount === 0
          ? 'Tap the heart icon on any hotel card or breakdown page to save favourites right on your device.'
          : 'Try switching back to All or clearing a filter pill.'}
      </Text>
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
        {iosToolbar}
        <View style={[styles.splitLeft, !isWideDesktop && styles.splitLeftHalf]}>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderCard}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyList}
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
      {iosToolbar}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyList}
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
  splitLeft: { width: '42%', minWidth: 320, borderRightWidth: 1, borderRightColor: Colors.border },
  // Foldables and iPhone Duo fold down the middle: an even split keeps the crease between list and detail.
  splitLeftHalf: { width: '50%', minWidth: 0 },
  splitRight: { flex: 1 },

  listContent: { paddingBottom: 34, gap: 14 },
  quickLinks: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  quickLinkOn: { backgroundColor: 'rgba(11, 122, 122, 0.22)', borderColor: Colors.accent },
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: Colors.bgCanvas,
  },
  activeFiltersText: { flex: 1, color: Colors.inkSecondary, fontSize: 12.5, fontWeight: '600' },
  activeFiltersClear: { color: '#FDBA74', fontSize: 12.5, fontWeight: '700' },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickLinkText: { color: Colors.inkPrimary, fontWeight: '700', fontSize: 12 },

  navyHeaderPanel: {
    backgroundColor: Colors.bgWhite,
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
    backgroundColor: Colors.bgCanvas,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },

  scopeBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCanvas,
    borderRadius: 999,
    padding: 3,
    gap: 4,
  },
  scopeBtn: { flex: 1, paddingVertical: 7, borderRadius: 999, alignItems: 'center' },
  scopeBtnActive: { backgroundColor: Colors.accent },
  scopeText: { fontSize: 11.5, fontWeight: '700', color: Colors.inkSecondary },
  scopeTextActive: { color: '#FFFFFF' },

  regionRow: { gap: 8, paddingVertical: 2 },
  regionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  regionPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  regionText: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary },
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

export default lazyTab(withRailShortcuts(StayOddsHomeScreen));
