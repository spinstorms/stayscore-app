import { useRailInsets } from '../lib/layout';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBestMonths } from '../lib/insights';
import { InlineVideo } from './video/InlineVideo';
import { useAdaptiveLayout } from '../lib/layout';
import { useStayOdds } from '../lib/store';
import { Colors } from '../lib/theme';
import { matchTrip, nextSurprise, parseTripQuery, sortTripResults } from '../lib/tripQuery';
import type { Hotel } from '../lib/types';
import { routes } from '../lib/nav';
import { openExternalUrl } from '../lib/api';
import { BRAND } from '../lib/brand';
import { getLanguage, LANGUAGES, setLanguage, t, type Lang } from '../lib/i18n';

const guest = (h: Hotel) => h.verifiedGuest?.licensed?.normalized100 ?? 0;
const SHOW = 24;

// Sharp on any screen: a wide photo for landscape (2560px) and a tall crop for portrait phones,
// foldables and iPads (1440 x 2560). Photos from Wikimedia Commons, credited on screen as their
// licences ask.
const SLIDES = [
  {
    wide: require('../assets/images/hero/maldives.jpg'),
    tall: require('../assets/images/hero/maldives-tall.jpg'),
    place: 'Maldives',
    credit: 'Photo: dronepicr, CC BY 2.0',
  },
  {
    wide: require('../assets/images/hero/bora-bora.jpg'),
    tall: require('../assets/images/hero/bora-bora-tall.jpg'),
    place: 'Bora Bora',
    credit: 'Photo: The TerraMar Project, CC BY 2.0',
  },
  {
    wide: require('../assets/images/hero/seychelles.jpg'),
    tall: require('../assets/images/hero/seychelles-tall.jpg'),
    place: 'Seychelles',
    credit: 'Photo: Norbert Nagel, CC BY-SA 4.0',
  },
  {
    wide: require('../assets/images/hero/bali.jpg'),
    tall: require('../assets/images/hero/bali-tall.jpg'),
    place: 'Bali',
    credit: 'Photo: Vyacheslav Argenberg, CC BY 4.0',
  },
];

/** Full-screen photos that slowly cross-fade, built into the app so they show instantly. */
function Slideshow({ captionInset, height }: { captionInset: { right: number; bottom: number }; height: number }) {
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
  const { width } = useWindowDimensions();
  const tall = height > width * 1.05;
  // sized from the measured photo screen: on Android a full-size picture inside a box that
  // only has a minimum height stopped short and left a dark gap under it
  return (
    <View style={[styles.slides, { height }]} pointerEvents="none">
      {SLIDES.map((sl, k) => (
        <Animated.Image
          key={sl.place}
          source={tall ? sl.tall : sl.wide}
          resizeMode="cover"
          style={[styles.slideImg, { height, opacity: fades[k] }]}
        />
      ))}
      <View style={styles.heroShade} />
      <View style={[styles.placeBox, captionInset]}>
        <Text style={styles.place}>{SLIDES[i].place}</Text>
        <Text style={styles.credit}>{SLIDES[i].credit}</Text>
      </View>
    </View>
  );
}

/**
 * Home: shows instantly (everything above the results is built into the app, no data needed).
 * Describe a trip in plain English, like stayodds.com's trip finder, or jump to the other parts.
 */
export function TripHome() {
  const router = useRouter();
  const focused = useIsFocused();
  const [langOpen, setLangOpen] = useState(false);
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
  const { height, width } = useWindowDimensions();
  // iPad and big tablets: a shorter photo screen, so there's something to see below it straight away
  const isTablet = isSplitScreen && Math.min(width, height) >= 700;
  const safe = useSafeAreaInsets();
  // on unfolded Android the rail floats over the photo, so text keeps clear of it
  const rail = useRailInsets();
  const insets = { ...safe, left: rail.left, right: rail.right };
  const sideInset = Math.max(insets.left, insets.right);
  // the photo screen fills the whole first view, edge to edge: under the status bar, the
  // iPhone Duo rail and the tab bar. Only the text and buttons keep clear of them.
  // the real height of the screen area (measured: window sizes differ from the visible area on
  // Android, tall iPhones and iPad), so the photo screen is exactly one screen tall
  const [viewH, setViewH] = useState(height);
  const heroHeight = isTablet ? Math.max(460, Math.round(viewH * 0.62)) : Math.max(460, viewH);
  const [heroH, setHeroH] = useState(heroHeight);
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
  const renderCard = (h: Hotel, cols: 2 | 3 = 2) => {
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
          {h.visitedByUs ? <Text style={styles.filmed}>▶ {t('We stayed and filmed it')}</Text> : null}
        </View>
        <View style={styles.score}>
          <Text style={styles.scoreNum}>{g || '—'}</Text>
          <Text style={styles.scoreLbl}>{t('guests')}</Text>
        </View>
      </Pressable>
    );
  };
  // more to look at below the photo: our filmed stays, and what's best this month
  const filmedStays = useMemo(
    () =>
      hotels
        .filter((h) => h.visitedByUs && h.coverageType !== 'Global Directory')
        .sort((a, b) => guest(b) - guest(a))
        .slice(0, 4),
    [hotels]
  );
  const monthName = new Date().toLocaleString('en-GB', { month: 'long' });
  const monthPicks = useMemo(() => {
    const q = parseTripQuery(monthName);
    const filmedIds = new Set(filmedStays.map((h) => h.id));
    return sortTripResults(matchTrip(hotels, q), q, guest)
      .filter((h) => !filmedIds.has(h.id))
      .slice(0, 4);
  }, [hotels, monthName, filmedStays]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && Math.abs(h - viewH) > 1) setViewH(h);
      }}
    >
      <Modal visible={langOpen} transparent animationType="slide" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setLangOpen(false)} accessibilityLabel={t('Close')} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.sheetTitle}>{t('Language')}</Text>
          {LANGUAGES.map((l) => {
            const on = l.code === getLanguage();
            return (
              <Pressable
                key={l.code}
                style={[styles.langRow, on && styles.langRowOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setLangOpen(false);
                  setLanguage(l.code as Lang);
                }}
              >
                <Text style={[styles.langName, on && { fontWeight: '800' }]}>{l.name}</Text>
                {on ? <Ionicons name="checkmark" size={18} color={Colors.accent} /> : null}
              </Pressable>
            );
          })}
        </View>
      </Modal>
      {/* light status bar icons over the photos; the other screens are light, with dark icons */}
      {focused ? <StatusBar style="light" /> : null}
      {/* Clean first screen: photos, one question, one button */}
      <View
        style={[styles.hero, { minHeight: heroHeight }]}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && Math.abs(h - heroH) > 1) setHeroH(h);
        }}
      >
        {/* language: follows the phone, or pick one here */}
        <Pressable
          style={[styles.langBtn, { top: insets.top + 10, right: insets.right + 14 }]}
          onPress={() => setLangOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('Language')}
        >
          <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
          <Text style={styles.langBtnText}>{getLanguage().split('-')[0].toUpperCase()}</Text>
        </Pressable>
        <Slideshow height={Math.max(heroH, heroHeight)} captionInset={{ right: insets.right + 16, bottom: insets.bottom + 14 }} />
        <View
          style={[
            styles.heroInner,
            {
              paddingTop: insets.top + 28,
              paddingBottom: insets.bottom + 28,
              // same space both sides, so the text sits in the true middle of the screen
              paddingLeft: sideInset + horizontalPadding,
              paddingRight: sideInset + horizontalPadding,
              maxWidth: 560 + sideInset * 2,
            },
          ]}
        >
          <View style={styles.brandRow}>
            <Image source={require('../assets/images/stayodds-logo.png')} style={styles.logo} />
            <Text style={styles.wordmark}>
              StayOdds<Text style={{ color: Colors.coral }}>.</Text>
            </Text>
          </View>
          <Text style={styles.h1}>{t("Where do you want to go?")}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => run(text)}
            placeholder={t("e.g. sunny Caribbean in January")}
            placeholderTextColor="#94A3B8"
            style={styles.askInput}
            returnKeyType="go"
            accessibilityLabel="Describe your trip in plain English"
          />
          <Pressable
            style={styles.genBtn}
            accessibilityRole="button"
            onPress={() => (text.trim() && text.trim() !== query ? run(text) : run(nextSurprise(query)))}
          >
            <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            <Text style={styles.genBtnText}>{text.trim() && text.trim() !== query ? t('Find my hotels') : t('Surprise me')}</Text>
          </Pressable>
          <Text style={styles.tagline}>
            {t("Find the hotel that's right for your trip, not the one with the best advert.")}
          </Text>
          <Text style={styles.lead}>
            {t('Real guest scores, critics and our own filmed stays for {n} luxury hotels.', {
              n: ready ? hotels.length.toLocaleString(getLanguage()) : '1,300+',
            })}
          </Text>
          <View style={styles.watchRow}>
            <Pressable
              style={styles.watchBtn}
              accessibilityRole="button"
              onPress={() => router.push(routes.watch() as never)}
            >
              <Ionicons name="play-circle" size={18} color="#FFFFFF" />
              <Text style={styles.watchBtnText}>{t("Watch our stays")}</Text>
            </Pressable>
            <Pressable
              style={[styles.watchBtn, styles.subBtn]}
              accessibilityRole="button"
              accessibilityLabel="Subscribe on YouTube"
              onPress={() => openExternalUrl(`${BRAND.youtubeChannelUrl}?sub_confirmation=1`)}
            >
              <Ionicons name="logo-youtube" size={18} color="#FFFFFF" />
              <Text style={styles.watchBtnText}>{t("Subscribe")}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={[styles.body, { paddingLeft: insets.left + horizontalPadding, paddingRight: insets.right + horizontalPadding }]}>
        {query ? (
          <View style={styles.section}>
            <View style={styles.understood}>
              <Text style={styles.understoodLabel}>{t("We understood:")}</Text>
              {parsed.chips.map((c) => (
                <Text key={c} style={styles.chip}>
                  {c}
                </Text>
              ))}
              <Pressable onPress={() => run('')} hitSlop={8}>
                <Text style={styles.clear}>{t("Clear")}</Text>
              </Pressable>
            </View>
            {!ready ? (
              <Text style={styles.sub}>{t("Getting the latest hotels…")}</Text>
            ) : results.length ? (
              <>
                <Text style={styles.h2}>
                  {results.length} hotel{results.length === 1 ? '' : 's'} match, best first
                </Text>
                <View style={isSplitScreen ? styles.grid : undefined}>
                  {results.slice(0, limit).map((h) => renderCard(h))}
                </View>
                {results.length > limit ? (
                  <Pressable style={styles.more} onPress={() => setLimit(limit + SHOW)}>
                    <Text style={styles.moreText}>Show more ({results.length - limit})</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <Text style={styles.sub}>{t("No hotels match all of that. Try fewer details, e.g. just the place and month.")}</Text>
            )}
          </View>
        ) : null}

        {videos.length ? (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.eyebrow}>{t("Watch our latest stay")}</Text>
              <Pressable onPress={() => router.push(routes.watch() as never)} hitSlop={8}>
                <Text style={styles.clear}>{t("All videos →")}</Text>
              </Pressable>
            </View>
            <View style={isSplitScreen ? styles.grid : undefined}>
              {videos.slice(0, isSplitScreen ? 2 : 1).map((v) => (
                <View key={v.id} style={isSplitScreen ? [styles.cardHalf, { gap: 6 }] : { gap: 6, maxWidth: 640 }}>
                  <InlineVideo url={v.url} thumbnail={v.thumbnail || v.fallbackThumbnail} badge="The Uncharted Itinerary" />
                  <Text style={styles.cardName} numberOfLines={2}>
                    {v.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {filmedStays.length ? (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.eyebrow}>{t('Hotels we stayed at and filmed')}</Text>
              <Pressable onPress={() => router.push(routes.watch() as never)} hitSlop={8}>
                <Text style={styles.clear}>{t('All videos →')}</Text>
              </Pressable>
            </View>
            <View style={isSplitScreen ? styles.grid : undefined}>{filmedStays.map((h) => renderCard(h, isTablet ? 3 : 2))}</View>
          </View>
        ) : null}

        {monthPicks.length ? (
          <View style={styles.section}>
            <Text style={styles.eyebrow}>{t('Best for {m}', { m: monthName })}</Text>
            <View style={isSplitScreen ? styles.grid : undefined}>{monthPicks.map((h) => renderCard(h, isTablet ? 3 : 2))}</View>
          </View>
        ) : null}

        <Pressable style={styles.deals} onPress={() => router.push(routes.deals() as never)}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.dealsEyebrow}>{t("Book through us")}</Text>
            <Text style={styles.dealsTitle}>{t("Same price to you, and it keeps our reviews free.")}</Text>
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
  // the lower half sits on sand, under the rail too (seamless)
  screen: { flex: 1, backgroundColor: Colors.sand },
  hero: { justifyContent: 'center', overflow: 'hidden', backgroundColor: Colors.navy },
  langBtn: {
    position: 'absolute',
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(15,43,51,0.45)',
  },
  langBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: Colors.bgWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 14,
    gap: 2,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  sheetTitle: { fontSize: 15, fontWeight: '800', color: Colors.inkPrimary, marginLeft: 12, marginBottom: 6 },
  langRow: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langRowOn: { backgroundColor: Colors.accentSoft },
  langName: { fontSize: 16, color: Colors.inkPrimary },
  slides: { position: 'absolute', top: 0, left: 0, right: 0 },
  slideImg: { position: 'absolute', top: 0, left: 0, right: 0, width: '100%' },
  tagline: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  watchRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 4 },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  subBtn: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  watchBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(7, 19, 35, 0.38)' },
  heroInner: { paddingVertical: 28, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  placeBox: { position: 'absolute', alignItems: 'flex-end' },
  credit: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5, marginTop: 2 },
  place: {
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
  body: { maxWidth: 1200, width: '100%', alignSelf: 'center' },
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
    backgroundColor: Colors.sandCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.sandBorder,
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
  more: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: Colors.sandBorder, marginTop: 4 },
  moreText: { fontWeight: '700', color: Colors.inkPrimary },
  eyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.3, textTransform: 'uppercase', color: Colors.accent },
  step: { backgroundColor: Colors.sandCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.sandBorder, padding: 14, gap: 4, marginBottom: 10 },
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
    backgroundColor: Colors.sandCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.sandBorder,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  quickText: { fontSize: 13.5, fontWeight: '700', color: Colors.inkPrimary },
});
