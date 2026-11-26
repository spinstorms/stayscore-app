import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getBestMonths } from '../lib/insights';
import { InlineVideo } from './video/InlineVideo';
import { useAdaptiveLayout } from '../lib/layout';
import { useStayOdds } from '../lib/store';
import { Colors } from '../lib/theme';
import { matchTrip, parseTripQuery, sortTripResults, TRIP_EXAMPLES } from '../lib/tripQuery';
import type { Hotel } from '../lib/types';

const guest = (h: Hotel) => h.verifiedGuest?.licensed?.normalized100 ?? 0;
const SHOW = 24;

/**
 * Home: shows instantly (everything above the results is built into the app, no data needed).
 * Describe a trip in plain English, like stayodds.com's trip finder, or jump to the other parts.
 */
export function TripHome() {
  const router = useRouter();
  const { hotels, deals, videos, shorts } = useStayOdds();
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

  const run = (t: string) => {
    setText(t);
    setQuery(t.trim());
    setLimit(SHOW);
  };
  const open = (h: Hotel) => router.push({ pathname: '/hotel/[id]', params: { id: h.id } });
  const ready = hotels.length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      <ImageBackground source={require('../assets/images/welcome-hero.jpg')} style={styles.hero} resizeMode="cover">
        <View style={styles.heroShade} />
        <View style={[styles.heroInner, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.brandRow}>
            <Image source={require('../assets/images/stayodds-logo.png')} style={styles.logo} />
            <View>
              <Text style={styles.wordmark}>
                StayOdds<Text style={{ color: Colors.accent }}>.</Text>
              </Text>
              <Text style={styles.byline}>by The Uncharted Itinerary</Text>
            </View>
          </View>
          <Text style={styles.h1}>Find the luxury hotel guests actually love.</Text>
          <Text style={styles.lead}>
            Real guest scores, critics and our own filmed stays for {ready ? hotels.length.toLocaleString('en-GB') : '1,300+'} hotels,
            in one simple score.
          </Text>

          <View style={styles.askBox}>
            <Ionicons name="sparkles" size={18} color={Colors.accent} />
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => run(text)}
              placeholder="Describe your trip, e.g. sunny Caribbean in January"
              placeholderTextColor="#94A3B8"
              style={styles.askInput}
              returnKeyType="search"
              accessibilityLabel="Describe your trip in plain English"
            />
            <Pressable style={styles.askBtn} onPress={() => run(text)} accessibilityRole="button">
              <Text style={styles.askBtnText}>Find</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
            {TRIP_EXAMPLES.map((ex) => (
              <Pressable key={ex} onPress={() => run(ex)} style={styles.example}>
                <Text style={styles.exampleText}>{ex}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ImageBackground>

      <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
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
              {videos.slice(0, isSplitScreen ? 2 : 1).map((v) => (
                <View key={v.id} style={[{ gap: 6 }, isSplitScreen && styles.cardHalf]}>
                  <InlineVideo url={v.url} thumbnail={v.thumbnail || v.fallbackThumbnail} badge="The Uncharted Itinerary" />
                  <Text style={styles.cardName} numberOfLines={2}>
                    {v.title}
                  </Text>
                </View>
              ))}
            </View>
            {shorts.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 4 }}>
                {shorts.slice(0, 10).map((v) => (
                  <View key={v.id} style={{ width: 130 }}>
                    <InlineVideo url={v.url} thumbnail={v.thumbnail || v.fallbackThumbnail} aspect={9 / 16} />
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.eyebrow}>How StayOdds works</Text>
          <View style={isSplitScreen ? styles.grid : undefined}>
            {[
              ['chatbubble-ellipses-outline', 'Describe your trip', 'Type it in plain English, or browse by place, award or month.'],
              ['analytics-outline', 'See one honest score', 'Thousands of real guest reviews, the critics and our own filmed stays, side by side.'],
              ['bed-outline', 'Book the right room', 'Best months to go, the rooms we would book, and prices for your dates.'],
            ].map(([icon, title, body]) => (
              <View key={title} style={[styles.step, isSplitScreen && styles.cardThird]}>
                <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={Colors.accent} />
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.sub}>{body}</Text>
              </View>
            ))}
          </View>
        </View>

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

        <View style={[styles.section, styles.quickRow]}>
          {(
            [
              ['gift-outline', 'Holiday dates', '/holidays'],
              ['stats-chart-outline', 'Guest insights', '/insights'],
              ['map-outline', 'World map', '/map'],
              ['play-circle-outline', 'Our stays', '/watch'],
            ] as const
          ).map(([icon, label, href]) => (
            <Pressable key={href} style={styles.quick} onPress={() => router.push(href)}>
              <Ionicons name={icon} size={20} color={Colors.navy} />
              <Text style={styles.quickText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  hero: { minHeight: 360, justifyContent: 'flex-end' },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7, 19, 35, 0.58)' },
  heroInner: { paddingTop: 22, paddingBottom: 20, gap: 8, maxWidth: 900, width: '100%', alignSelf: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  logo: { width: 40, height: 40, borderRadius: 10 },
  wordmark: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.6 },
  byline: { color: 'rgba(255,255,255,0.8)', fontSize: 11.5, fontWeight: '600' },
  h1: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', lineHeight: 32, letterSpacing: -0.5 },
  lead: { color: 'rgba(255,255,255,0.9)', fontSize: 14.5, lineHeight: 20 },
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
  askInput: { flex: 1, fontSize: 15, color: Colors.inkPrimary, paddingVertical: 8, minHeight: 40 },
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
