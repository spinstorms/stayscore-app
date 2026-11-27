import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { michelinKeys, w50Rank, type DiningMap } from '../../../lib/awards';
import { holidayDates, saveDates, shortDate, nightsBetween, type QuickDateKey } from '../../../lib/dates';
import { useAdaptiveLayout } from '../../../lib/layout';
import { loadGuestRanks } from '../../../lib/ranks';
import { useStayOdds } from '../../../lib/store';
import { Colors } from '../../../lib/theme';
import type { Hotel } from '../../../lib/types';
import { lazyTab } from '../../../components/LazyTab';

type Filter = 'top' | 'w50' | 'keys' | 'stars' | '';
const FILTERS: [Filter, string][] = [
  ['top', "★ Guests' top rated"],
  ['w50', "World's 50 Best"],
  ['keys', 'MICHELIN Keys'],
  ['stars', 'Michelin-star dining'],
  ['', 'All'],
];
const TITLES: Record<Filter, string> = {
  top: "Guests' top rated",
  w50: "World's 50 Best hotels",
  keys: 'MICHELIN Key hotels',
  stars: 'Hotels with a Michelin-star restaurant',
  '': 'All hotels',
};
const PAGE = 40;

const guest = (h: Hotel): [number | null, number] => {
  const lic = h.verifiedGuest?.licensed;
  return [typeof lic?.normalized100 === 'number' ? Math.round(lic.normalized100) : null, Number(lic?.reviewCount || 0)];
};
const stars = (h: Hotel, dining: DiningMap) =>
  (dining[h.id] || []).reduce((best, r) => {
    const m = /([123]) MICHELIN Star/.exec(r.distinction || '');
    return m ? Math.max(best, Number(m[1])) : best;
  }, 0);
function tags(h: Hotel, dining: DiningMap): Filter[] {
  const [g, rc] = guest(h);
  const t: Filter[] = [];
  if ((g || 0) >= 93 && rc >= 300) t.push('top');
  if (w50Rank(h)) t.push('w50');
  if (michelinKeys(h)) t.push('keys');
  if (stars(h, dining)) t.push('stars');
  return t;
}
const byGuest = (a: Hotel, b: Hotel) =>
  (guest(b)[0] || 0) - (guest(a)[0] || 0) || guest(b)[1] - guest(a)[1] || a.name.localeCompare(b.name);

/** The website's /holidays/ page: pick a holiday, and every hotel opens with those dates set. */
function HolidaysScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ when?: string }>();
  const { hotels } = useStayOdds();
  const { isSplitScreen, horizontalPadding } = useAdaptiveLayout();
  const dates = useMemo(() => holidayDates(), []);
  const [cur, setCur] = useState<QuickDateKey>(
    dates.some((q) => q.key === params.when) ? (params.when as QuickDateKey) : 'christmas'
  );
  const [filter, setFilter] = useState<Filter>('top');
  const [region, setRegion] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [dining, setDining] = useState<DiningMap>({});

  React.useEffect(() => {
    loadGuestRanks().then((d) => {
      if (!d?.extras) return;
      const m: DiningMap = {};
      for (const [id, x] of Object.entries(d.extras)) if (x.dining?.length) m[id] = x.dining;
      setDining(m);
    });
  }, []);

  const q = dates.find((x) => x.key === cur) || dates[0];
  React.useEffect(() => {
    saveDates({ checkin: q.checkin, checkout: q.checkout, adults: 2 });
  }, [q]);

  const { filmed, fav, regions } = useMemo(() => {
    const live = hotels.filter((h) => !/closed/i.test(h.propertyStatus?.operatingStatus || ''));
    const filmedAll = live.filter((h) => h.visitedByUs).sort(byGuest);
    const favAll = live.filter((h) => !h.visitedByUs && tags(h, dining).length).sort(byGuest);
    const regs = Array.from(new Set([...filmedAll, ...favAll].map((h) => h.region).filter(Boolean))).sort();
    return { filmed: filmedAll, fav: favAll, regions: regs };
  }, [hotels, dining]);

  const ok = (h: Hotel) => (!filter || tags(h, dining).includes(filter)) && (!region || h.region === region);
  const filmedShown = filmed.filter(ok);
  const favMatch = fav.filter(ok);
  const nights = nightsBetween(q.checkin, q.checkout);

  const Row = ({ h }: { h: Hotel }) => {
    const [g] = guest(h);
    const w = w50Rank(h);
    const k = michelinKeys(h);
    const st = stars(h, dining);
    return (
      <View style={[styles.row, isSplitScreen && styles.rowWide]}>
        <Pressable onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: h.id, when: cur } })} style={styles.rowMain}>
          {h.thumbnail ? <Image source={{ uri: h.thumbnail }} style={styles.thumb} /> : <View style={styles.thumb} />}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.name} numberOfLines={2}>
              {h.name}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {h.location}, {h.country}
            </Text>
            <View style={styles.badges}>
              {h.visitedByUs ? <Text style={[styles.badge, styles.badgeFilm]}>▶ We filmed it</Text> : null}
              {w ? <Text style={styles.badge}>No. {w} World's 50 Best</Text> : null}
              {k ? <Text style={styles.badge}>{k} MICHELIN Key{k > 1 ? 's' : ''}</Text> : null}
              {st ? <Text style={styles.badge}>{st}-star restaurant</Text> : null}
            </View>
          </View>
          <View style={styles.score}>
            <Text style={styles.scoreNum}>{g ?? '—'}</Text>
            <Text style={styles.scoreLbl}>{g != null ? 'guest score' : 'no guest score yet'}</Text>
            {h.priceRange ? <Text style={styles.from}>from {h.priceRange}</Text> : null}
          </View>
        </Pressable>
        <Pressable style={styles.cta} onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: h.id, when: cur } })}>
          <Text style={styles.ctaText}>Check {q.label} prices →</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.eyebrow}>Holiday dates</Text>
      <Text style={styles.h1}>Where to stay this Christmas, New Year or Easter</Text>
      <Text style={styles.sub}>Pick your holiday. Every hotel below then opens with those dates already chosen, ready to check prices.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {dates.map((d) => {
          const on = d.key === cur;
          return (
            <Pressable key={d.key} onPress={() => setCur(d.key)} style={[styles.q, on && styles.qOn]} accessibilityState={{ selected: on }}>
              <Text style={[styles.qLabel, on && { color: '#FFFFFF' }]}>{d.label}</Text>
              <Text style={[styles.qDates, on && { color: '#DCFCE7' }]}>
                {shortDate(d.checkin)} – {shortDate(d.checkout)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.picked}>
        {shortDate(q.checkin)} – {shortDate(q.checkout)} · {nights} night{nights === 1 ? '' : 's'}. Every hotel below opens with these dates.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {FILTERS.map(([f, label]) => (
          <Pressable
            key={f || 'all'}
            onPress={() => {
              setFilter(f);
              setLimit(PAGE);
            }}
            style={[styles.filter, filter === f && styles.filterOn]}
          >
            <Text style={[styles.filterText, filter === f && { color: '#FFFFFF' }]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.regions}>
        {['', ...regions].map((r) => (
          <Pressable
            key={r || 'all'}
            onPress={() => {
              setRegion(r);
              setLimit(PAGE);
            }}
            style={[styles.region, region === r && styles.regionOn]}
          >
            <Text style={[styles.regionText, region === r && { color: '#FFFFFF' }]}>{r || 'All'}</Text>
          </Pressable>
        ))}
      </View>

      {filmedShown.length ? (
        <View style={styles.section}>
          <Text style={styles.h2}>Stays we've filmed</Text>
          <Text style={styles.sub}>{filmedShown.length} hotels we checked into ourselves, best guest score first.</Text>
          <View style={isSplitScreen ? styles.grid : undefined}>
            {filmedShown.map((h) => (
              <Row key={h.id} h={h} />
            ))}
          </View>
        </View>
      ) : null}

      {favMatch.length ? (
        <View style={styles.section}>
          <Text style={styles.h2}>{TITLES[filter]}</Text>
          <Text style={styles.sub}>{favMatch.length} hotels, best guest score first.</Text>
          <View style={isSplitScreen ? styles.grid : undefined}>
            {favMatch.slice(0, limit).map((h) => (
              <Row key={h.id} h={h} />
            ))}
          </View>
          {favMatch.length > limit ? (
            <Pressable style={styles.more} onPress={() => setLimit(limit + PAGE)}>
              <Text style={styles.moreText}>Show more ({favMatch.length - limit} more)</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.note}>
        Guest scores are verified licensed guest ratings. “From” prices are indicative (middle of three sample dates); your holiday
        dates usually cost more, so the live price for your dates is the one to go by.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  content: { paddingTop: 16, paddingBottom: 40, gap: 10, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  eyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: Colors.accent },
  h1: { fontSize: 26, fontWeight: '900', color: Colors.inkPrimary, letterSpacing: -0.5, lineHeight: 31 },
  h2: { fontSize: 20, fontWeight: '800', color: Colors.inkPrimary },
  sub: { fontSize: 14, color: Colors.inkSecondary, lineHeight: 20 },
  chipRow: { gap: 8, paddingVertical: 2 },
  q: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, minHeight: 44 },
  qOn: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  qLabel: { fontSize: 14, fontWeight: '800', color: Colors.inkPrimary },
  qDates: { fontSize: 12, color: Colors.inkMuted },
  picked: { fontSize: 14, fontWeight: '700', color: '#15803D' },
  filter: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: '#FDBA74', backgroundColor: '#FFF7ED', minHeight: 40, justifyContent: 'center' },
  filterOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 13.5, fontWeight: '700', color: '#9A3412' },
  regions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  region: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(100,110,130,0.35)' },
  regionOn: { backgroundColor: '#0B2540', borderColor: '#0B2540' },
  regionText: { fontSize: 12.5, fontWeight: '600', color: Colors.inkPrimary },
  section: { gap: 6, marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 10 },
  rowWide: { width: '48%', flexGrow: 1 },
  rowMain: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 84, height: 64, borderRadius: 10, backgroundColor: '#E5E7EB' },
  name: { fontSize: 15, fontWeight: '800', color: Colors.inkPrimary },
  meta: { fontSize: 12.5, color: Colors.inkSecondary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  badge: { fontSize: 10.5, fontWeight: '700', color: Colors.inkPrimary, backgroundColor: '#EEF2F7', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2, overflow: 'hidden' },
  badgeFilm: { backgroundColor: '#FFE4D6', color: '#9A3412' },
  score: { alignItems: 'flex-end', maxWidth: 92 },
  scoreNum: { fontSize: 20, fontWeight: '900', color: Colors.inkPrimary },
  scoreLbl: { fontSize: 10.5, color: Colors.inkMuted, textAlign: 'right' },
  from: { fontSize: 11.5, color: Colors.inkSecondary, marginTop: 2, textAlign: 'right' },
  cta: { backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  more: { alignSelf: 'center', marginTop: 14, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(100,110,130,0.4)' },
  moreText: { fontWeight: '700', color: Colors.inkPrimary },
  note: { fontSize: 12.5, color: Colors.inkMuted, lineHeight: 18, marginTop: 18 },
});

export default lazyTab(HolidaysScreen);
