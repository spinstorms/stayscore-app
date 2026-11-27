import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBestMonths } from '../lib/insights';
import { InlineVideo } from './video/InlineVideo';
import { useAdaptiveLayout } from '../lib/layout';
import { useStayOdds } from '../lib/store';
import { Colors } from '../lib/theme';
import { matchTrip, parseTripQuery, sortTripResults, TRIP_EXAMPLES } from '../lib/tripQuery';
import type { Hotel } from '../lib/types';

const guest = (h: Hotel) => h.verifiedGuest?.licensed?.normalized100 ?? 0;
const SHOW = 24;

const SLIDES = [
  { src: require('../assets/images/hero-maldives.jpg'), place: 'Maldives' },
  { src: require('../assets/images/hero-bora-bora.jpg'), place: 'Bora Bora' },
  { src: require('../assets/images/hero-seychelles.jpg'), place: 'Seychelles' },
  { src: require('../assets/images/hero-bali.jpg'), place: 'Bali' },
];

/** Full-screen photos that slowly cross-fade, built into the app so they show instantly. */
function Slideshow({ captionInset }: { captionInset: { right: number; bottom: number } }) {
  const fades = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setI((cur) => {
        const next = (cur + 1) % SLIDES.length;
        Animated.parallel([
          Animated.timing(fades[cur], { toValue: 0, duration: 1400, useNativeDriver: true }),
          Animated.timing(fades[next], { toValue: 1, duration: 1400, useNativeDriver: true }),
        ]).start();
        return next;
      });
    }, 5500);
    return () => clearInterval(t);
  }, [fades]);
  return (
    <>
      {SLIDES.map((sl, k) => (
        <Animated.Image key={sl.place} source={sl.src} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: fades[k] }]} />
      ))}
      <View style={styles.heroShade} />
      <Text style={[styles.place, captionInset]}>{SLIDES[i].place}</Text>
    </>
  );
}

/**
 * Home: shows instantly (everything above the results is built into the app, no data needed).
 * Describe a trip in plain English, like stayodds.com's trip finder, or jump to the other parts.
 */
export function TripHome() {
  const router = useRouter();
  const focused = useIsFocused();
  const { hotels, deals, videos } = useStayOdds();
  const { isSplitScreen, horizontalPadding } = useAdaptiveLayout();
  const params = useLocalSearchParams<{ q?: string }>();
  const initial = typeof params.q === 'string' ? params.q : '';
  const [text, setText] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [limit, setLimit] = useState(SHOW);

  const parsed = useMemo(() => parseTripQuery(query), [query]);
  const results = useMemo(
    () => (query ? sortTripResults(matchTrip(hotels, parsed), parsed, guest) : []),
    [hotels, parsed, query]
  );

  const ready = hotels.length > 0;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // the photo screen fills the whole first view, edge to edge: under the status bar, the
  // iPhone Duo rail and the tab bar. Only the text and buttons keep clear of them.
  const heroHeight = Math.max(460, height);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollRef = useRef<any>(null);
  const run = (t: string) => {
    setText(t);
    setQuery(t.trim());
    setLimit(SHOW);
    // bring the results into view under the photo screen
    if (t.trim()) setTimeout(() => scrollRef.current?.scrollTo({ y: heroHeight - 40, animated: true }), 120);
  };
  const open = (h: Hotel) => router.push({ pathname: '/hotel/[id]', params: { id: h.id } });

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
    >
      {/* light status bar icons over the photos; the other screens are light, with dark icons */}
      {focused ? <StatusBar style="light" /> : null}
      {/* Clean first screen: photos, one question, one button */}
      <View style={[styles.hero, { minHeight: heroHeight }]}>
        <Slideshow captionInset={{ right: insets.right + 16, bottom: insets.bottom + 14 }} />
        <View
          style={[
            styles.heroInner,
            {
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + 28,
              paddingLeft: insets.left + horizontalPadding,
              paddingRight: insets.right + horizontalPadding,
              maxWidth: 560 + insets.left + insets.right,
            },
          ]}
        >
          <View style={styles.brandRow}>
            <Image source={require('../assets/images/stayodds-logo.png')} style={styles.logo} />
            <Text style={styles.wordmark}>
              StayOdds<Text style={{ color: Colors.coral }}>.</Text>
            </Text>
          </View>
          <Text style={styles.h1}>Where do you want to go?</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => run(text)}
            placeholder="e.g. sunny Caribbean in January"
            placeholderTextColor="#94A3B8"
            style={styles.askInput}
            returnKeyType="go"
            accessibilityLabel="Describe your trip in plain English"
          />
          <Pressable
            style={styles.genBtn}
            accessibilityRole="button"
            onPress={() => run(text.trim() ? text : TRIP_EXAMPLES[Math.floor(Math.random() * TRIP_EXAMPLES.length)])}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={styles.genBtnText}>{text.trim() ? 'Find my hotels' : 'Surprise me'}</Text>
          </Pressable>
          <Text style={styles.lead}>
            Real guest scores, critics and our own filmed stays for {ready ? hotels.length.toLocaleString('en-GB') : '1,300+'} luxury hotels.
          </Text>
        </View>
      </View>

      <View style={[styles.body, { paddingLeft: insets.left + horizontalPadding, paddingRight: insets.right + horizontalPadding }]}>
        {query ? (
          <View style={styles.section}>
            <View style={styles.understood}>
              <Text style={styles.understoodLabel}>We understood:</Text>
              {parsed.chips.map((c) => (
                <Text key={c} style={styles.chip}>
                  {c}
                </Text>
              ))}
              <Pressable onPress={() => run('')} hitSlop={8}>
                <Text style={styles.clear}>Clear</Text>
              </Pressable>
            </View>
            {!ready ? (
              <Text style={styles.sub}>Getting the latest hotels…</Text>
            ) : results.length ? (
              <>
                <Text style={styles.h2}>
                  {results.length} hotel{results.length === 1 ? '' : 's'} match, best first
                </Text>
                <View style={isSplitScreen ? styles.grid : undefined}>
                  {results.slice(0, limit).map((h) => {
                    const g = guest(h);
                    const best = getBestMonths(h);
                    return (
                      <Pressable key={h.id} style={[styles.card, isSplitScreen && styles.cardHalf]} onPress={() => open(h)}>
                        {h.thumbnail ? <Image source={{ uri: h.thumbnail }} style={styles.cardImg} /> : <View style={styles.cardImg} />}
                        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                          <Text style={styles.cardName} numberOfLines={2}>
                            {h.name}
                          </Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>
                            {h.location}, {h.country}
                          </Text>
                          <Text style={styles.cardMeta} numberOfLines={1}>
                            Best: {best.shortLabel}
                            {h.priceRange ? ` · from ${h.priceRange}` : ''}
                          </Text>
                          {h.visitedByUs ? <Text style={styles.filmed}>▶ We stayed and filmed it</Text> : null}
                        </View>
                        <View style={styles.score}>
                          <Text style={styles.scoreNum}>{g || '—'}</Text>
                          <Text style={styles.scoreLbl}>guests</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                {results.length > limit ? (
                  <Pressable style={styles.more} onPress={() => setLimit(limit + SHOW)}>
                    <Text style={styles.moreText}>Show more ({results.length - limit})</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={styles.sub}>No hotels match all of that. Try fewer details, e.g. just the place and month.</Text>
            )}
          </View>
        ) : null}

        {videos.length ? (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.eyebrow}>Watch our latest stay</Text>
              <Pressable onPress={() => router.push('/watch')} hitSlop={8}>
                <Text style={styles.clear}>All videos →</Text>
              </Pressable>
            </View>
            <View style={isSplitScreen ? styles.grid : undefined}>
              {videos.slice(0, 1).map((v) => (
                <View key={v.id} style={{ gap: 6, maxWidth: 640 }}>
                  <InlineVideo url={v.url} thumbnail={v.thumbnail || v.fallbackThumbnail} badge="The Uncharted Itinerary" />
                  <Text style={styles.cardName} numberOfLines={2}>
                    {v.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable style={styles.deals} onPress={() => router.push('/deals')}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.dealsEyebrow}>Book through us</Text>
            <Text style={styles.dealsTitle}>Same price to you, and it keeps our reviews free.</Text>
            <Text style={styles.dealsBody}>
              Every "Check prices" button uses our partner links. Plus {deals.length ? `${deals.length} ` : ''}travel perks and codes we use
              ourselves: cards, eSIMs and gear.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </Pressable>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  hero: { justifyContent: 'center', overflow: 'hidden', backgroundColor: Colors.navy },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7, 19, 35, 0.38)' },
  heroInner: { paddingVertical: 28, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  place: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 17,
  },
  genBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 4 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  wordmark: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.6 },
  byline: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '600' },
  h1: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', lineHeight: 38, letterSpacing: -0.8, textAlign: 'center' },
  lead: { color: 'rgba(255,255,255,0.9)', fontSize: 13.5, lineHeight: 19, textAlign: 'center' },
  askBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 5,
    marginTop: 8,
  },
  askInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    fontSize: 17,
    color: Colors.inkPrimary,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  askBtn: { backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  askBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  example: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  exampleText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '600' },
  body: { maxWidth: 900, width: '100%', alignSelf: 'center' },
  section: { marginTop: 18, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  understood: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  understoodLabel: { fontSize: 13, fontWeight: '700', color: Colors.inkSecondary },
  chip: { fontSize: 12.5, fontWeight: '700', color: Colors.inkPrimary, backgroundColor: '#FFE8DD', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  clear: { fontSize: 13, fontWeight: '700', color: Colors.accentDark, textDecorationLine: 'underline' },
  h2: { fontSize: 18, fontWeight: '800', color: Colors.inkPrimary },
  sub: { fontSize: 13.5, color: Colors.inkSecondary, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginBottom: 10,
  },
  cardHalf: { width: '48.5%', marginBottom: 0 },
  cardThird: { flexBasis: 220, flexGrow: 1 },
  cardImg: { width: 76, height: 76, borderRadius: 10, backgroundColor: '#E5E7EB' },
  cardName: { fontSize: 15, fontWeight: '800', color: Colors.inkPrimary },
  cardMeta: { fontSize: 12.5, color: Colors.inkSecondary },
  filmed: { fontSize: 11.5, fontWeight: '700', color: '#C2410C' },
  score: { alignItems: 'center', minWidth: 48 },
  scoreNum: { fontSize: 20, fontWeight: '900', color: Colors.accent },
  scoreLbl: { fontSize: 10.5, color: Colors.inkMuted },
  more: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  moreText: { fontWeight: '700', color: Colors.inkPrimary },
  eyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase', color: Colors.accent },
  step: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 4, marginBottom: 10 },
  stepTitle: { fontSize: 15.5, fontWeight: '800', color: Colors.inkPrimary },
  deals: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.navy,
    borderRadius: 16,
    padding: 16,
  },
  dealsEyebrow: { color: '#FDBA74', fontSize: 11.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  dealsTitle: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '800' },
  dealsBody: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 18 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quick: {
    flexGrow: 1,
    flexBasis: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickText: { fontSize: 13.5, fontWeight: '700', color: Colors.inkPrimary },
});
