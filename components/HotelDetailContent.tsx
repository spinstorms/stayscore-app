import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getHotelVideoUrl, openExternalUrl } from '../lib/api';
import { formatPersonalScore, isRatedHotel, isVisitedHotel } from '../lib/layout';
import { useStayScore } from '../lib/store';
import { Colors, getVerdictPalette } from '../lib/theme';
import type { Hotel } from '../lib/types';

interface Props {
  hotel: Hotel;
  isSidePane?: boolean;
}

function ScoreBar({
  label,
  value,
  max,
  suffix,
  color,
  whole,
}: {
  label: string;
  value: number;
  max: number;
  suffix: string;
  color: string;
  whole?: boolean;
}) {
  const pct = Math.max(4, Math.min(100, Math.round((value / max) * 100)));
  return (
    <View style={styles.barRow}>
      <View style={styles.barTop}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barVal}>
          {whole ? formatPersonalScore(value) : value.toFixed(1)}
          {suffix}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function HotelDetailContent({ hotel, isSidePane = false }: Props) {
  const router = useRouter();
  const { pushToCompare } = useStayScore();

  const c = hotel.consensus;
  const rated = isRatedHotel(hotel);
  const visited = isVisitedHotel(hotel);
  const palette = getVerdictPalette(c.agreement, rated);
  const videoUrl = getHotelVideoUrl(hotel);
  const b = c.bookingSubscores;
  const s = hotel.scores;

  const ours100 = rated && hotel.overall != null ? Math.round(hotel.overall * 20) : null;
  const critic100 = Math.round((c.criticScore || 4.5) * 20);
  const google100 = Math.round((c.googleRating || 4.5) * 20);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isSidePane && styles.contentSidePane]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Media */}
      <View style={styles.heroCard}>
        <Image source={{ uri: hotel.thumbnail }} style={styles.heroImage} />
        <View style={styles.heroBody}>
          <View style={styles.badgeRow}>
            <View style={[styles.pill, { backgroundColor: palette.soft, borderColor: palette.border }]}>
              <Text style={[styles.pillText, { color: palette.color }]}>{c.agreement}</Text>
            </View>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: visited ? Colors.accentSoft : Colors.slateSoft,
                  borderColor: visited ? Colors.accentBorder : Colors.slateBorder,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: visited ? Colors.accent : Colors.slate }]}>
                {visited ? 'Visited by Uncharted' : 'Global Directory'}
              </Text>
            </View>
            {c.award ? (
              <View style={[styles.pill, { backgroundColor: Colors.bgCanvas, borderColor: Colors.border }]}>
                <Text style={[styles.pillText, { color: Colors.inkSecondary }]} numberOfLines={1}>
                  {c.award}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{hotel.name}</Text>
          <Text style={styles.subtitle}>
            {hotel.location}, {hotel.country} • {hotel.brand}
            {hotel.priceRange ? ` • ${hotel.priceRange}` : ''}
          </Text>
          <Text style={styles.verdict}>{hotel.verdict}</Text>

          {/* 4 KPI Tiles */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiTile, { backgroundColor: palette.soft, borderColor: palette.border }]}>
              <Text style={[styles.kpiBig, { color: palette.color }]}>{c.greatStayChance}%</Text>
              <Text style={styles.kpiLabel}>{rated ? 'Great-Stay Odds' : 'Global Odds'}</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiBig}>
                {c.overallIndex}
                <Text style={styles.kpiSub}>/100</Text>
              </Text>
              <Text style={styles.kpiLabel}>StayScore</Text>
            </View>
            <View style={[styles.kpiTile, { backgroundColor: Colors.accentSoft, borderColor: Colors.accentBorder }]}>
              <Text style={[styles.kpiBig, { color: Colors.accent }]}>
                {rated ? `${formatPersonalScore(hotel.overall)}/5` : visited ? 'Short' : '—'}
              </Text>
              <Text style={styles.kpiLabel}>{rated ? 'Our Score' : visited ? 'Unrated Yet' : 'Not Visited'}</Text>
            </View>
            <View style={[styles.kpiTile, { backgroundColor: Colors.bookingSoft, borderColor: '#BFDBFE' }]}>
              <Text style={[styles.kpiBig, { color: Colors.bookingBlue }]}>
                {(c.bookingOverall || c.googleRating * 2).toFixed(1)}
                <Text style={styles.kpiSub}>/10</Text>
              </Text>
              <Text style={styles.kpiLabel}>Booking.com</Text>
            </View>
          </View>

          {/* Primary Actions */}
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => openExternalUrl(hotel.bookingUrl)}
            >
              <Ionicons name="bed-outline" size={16} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Check Live Rates</Text>
            </Pressable>

            <Pressable
              style={[styles.btn, styles.btnDark]}
              onPress={() => {
                pushToCompare(hotel.id);
                router.push('/(tabs)/compare');
              }}
            >
              <Ionicons name="git-compare-outline" size={16} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Compare VS</Text>
            </Pressable>

            {videoUrl ? (
              <Pressable
                style={[styles.btn, styles.btnOutline]}
                onPress={() => openExternalUrl(videoUrl)}
              >
                <Ionicons name="logo-youtube" size={16} color={Colors.accent} />
                <Text style={styles.btnOutlineText}>
                  {hotel.coverageType === 'Short Tour' ? 'Watch Short' : 'Watch Review'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {/* Formula Transparency Strip */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>How StayScore Is Calculated</Text>
        <Text style={styles.sectionSub}>
          {rated
            ? 'Weighted blend: 40% Our First-Hand Stay + 30% Critics & YouTubers + 30% Verified Guests.'
            : 'No personal score added yet — 50% Top Critics & YouTubers + 50% Verified Booking.com & Google Guests.'}
        </Text>
        <View style={styles.formulaRow}>
          <View style={[styles.formulaBox, { borderTopColor: Colors.accent, backgroundColor: Colors.accentSoft }]}>
            <Text style={[styles.formulaWeight, { color: Colors.accent }]}>{rated ? '40%' : '0%'}</Text>
            <Text style={styles.formulaScore}>{ours100 != null ? `${ours100}/100` : 'Pending'}</Text>
            <Text style={styles.formulaCaption}>Our Stay</Text>
          </View>
          <View style={[styles.formulaBox, { borderTopColor: Colors.slate, backgroundColor: Colors.slateSoft }]}>
            <Text style={[styles.formulaWeight, { color: Colors.slate }]}>{rated ? '30%' : '50%'}</Text>
            <Text style={styles.formulaScore}>{critic100}/100</Text>
            <Text style={styles.formulaCaption}>Critics & YT</Text>
          </View>
          <View style={[styles.formulaBox, { borderTopColor: Colors.googleGreen, backgroundColor: Colors.googleSoft }]}>
            <Text style={[styles.formulaWeight, { color: Colors.googleGreen }]}>{rated ? '30%' : '50%'}</Text>
            <Text style={styles.formulaScore}>{google100}/100</Text>
            <Text style={styles.formulaCaption}>
              {c.googleRating.toFixed(1)}★ ({c.googleReviews.toLocaleString()})
            </Text>
          </View>
        </View>
      </View>

      {/* Our 5-Axis Scorecard */}
      <View style={[styles.sectionCard, { borderTopWidth: 4, borderTopColor: Colors.accent }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionHeading}>Uncharted 5-Axis Scorecard</Text>
          <Text style={[styles.scoreTag, { color: Colors.accent }]}>
            {rated ? `${formatPersonalScore(hotel.overall)} / 5` : 'Pending'}
          </Text>
        </View>
        {rated && s ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            <ScoreBar label="Rooms & Villas" value={s.rooms} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Grounds, Pools & Beach" value={s.grounds} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Food & Breakfast" value={s.food} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Service & Hospitality" value={s.service} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Value for Money" value={s.value} max={5} suffix=" / 5" color={Colors.accent} whole />
          </View>
        ) : (
          <View style={styles.unratedNotice}>
            <Text style={styles.unratedTitle}>
              {visited ? 'Featured in a YouTube Short (Not Ranked Yet)' : 'Global Luxury Directory (Not Visited Yet)'}
            </Text>
            <Text style={styles.unratedText}>
              {visited
                ? 'We haven’t published a full scored video review for this stay yet. Until then, StayScore relies strictly on verified guests & critics.'
                : 'When we stay and film at this property, our whole-number 5-axis Uncharted Scorecard automatically unlocks and merges into the StayScore!'}
            </Text>
          </View>
        )}
      </View>

      {/* Booking.com 6-Axis Verified Sub-Scores */}
      {b ? (
        <View style={[styles.sectionCard, { borderTopWidth: 4, borderTopColor: Colors.bookingBlue }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionHeading}>Booking.com Guest Sub-Scores</Text>
            <Text style={[styles.scoreTag, { color: Colors.bookingBlue }]}>
              {c.bookingOverall.toFixed(1)} / 10
            </Text>
          </View>
          <View style={{ marginTop: 10, gap: 10 }}>
            <ScoreBar label="Staff & Service" value={b.staff} max={10} suffix=" / 10" color={Colors.bookingBlue} />
            <ScoreBar label="Cleanliness" value={b.cleanliness} max={10} suffix=" / 10" color={Colors.bookingBlue} />
            <ScoreBar label="Comfort" value={b.comfort} max={10} suffix=" / 10" color={Colors.bookingBlue} />
            <ScoreBar label="Facilities" value={b.facilities} max={10} suffix=" / 10" color={Colors.bookingBlue} />
            <ScoreBar label="Location" value={b.location} max={10} suffix=" / 10" color={Colors.bookingBlue} />
            <ScoreBar label="Value for Money" value={b.value} max={10} suffix=" / 10" color={Colors.bookingBlue} />
          </View>
        </View>
      ) : null}

      {/* Standout & Watch Out */}
      <View style={styles.trioWrap}>
        <View style={[styles.calloutCard, { borderLeftColor: Colors.accent, backgroundColor: Colors.accentSoft }]}>
          <Text style={[styles.calloutKicker, { color: Colors.accent }]}>STANDOUT HIGHLIGHT</Text>
          <Text style={styles.calloutText}>{hotel.standout}</Text>
        </View>
        <View style={[styles.calloutCard, { borderLeftColor: Colors.amberRing, backgroundColor: Colors.amberSoft }]}>
          <Text style={[styles.calloutKicker, { color: Colors.amber }]}>HONEST WATCH-OUT</Text>
          <Text style={styles.calloutText}>{hotel.watchOut}</Text>
        </View>
      </View>

      {/* Channel Benchmarks */}
      {c.channelBenchmarks && c.channelBenchmarks.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Reviewers & Platforms Compared</Text>
          <View style={{ marginTop: 12, gap: 12 }}>
            {c.channelBenchmarks.map((row, idx) => (
              <View key={`${row.source}-${idx}`} style={styles.benchRow}>
                <View style={styles.benchHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.benchCat}>{row.category}</Text>
                    <Text style={styles.benchSource}>{row.source}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.benchScore}>{row.score}</Text>
                    <Text style={styles.benchNorm}>
                      {row.normalized100 != null ? `${row.normalized100}/100` : 'Pending'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.benchTakeaway}>{row.takeaway}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Matching Resort Shorts */}
      {hotel.shorts && hotel.shorts.length > 0 ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Quick Shorts From This Resort</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            {hotel.shorts.map((sh) => (
              <Pressable
                key={sh.id}
                style={styles.shortCard}
                onPress={() => openExternalUrl(`https://www.youtube.com/shorts/${sh.id}`)}
              >
                <Image
                  source={{ uri: `https://i.ytimg.com/vi/${sh.id}/hqdefault.jpg` }}
                  style={styles.shortImg}
                />
                <Text style={styles.shortTitle} numberOfLines={2}>
                  {sh.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgCanvas },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  contentSidePane: { padding: 20 },
  heroCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroImage: { width: '100%', height: 210, backgroundColor: Colors.charcoal },
  heroBody: { padding: 16, gap: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.inkPrimary, lineHeight: 28 },
  subtitle: { fontSize: 13, color: Colors.inkSecondary },
  verdict: { fontSize: 14, color: Colors.inkSecondary, lineHeight: 21 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  kpiTile: {
    flexGrow: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCanvas,
  },
  kpiBig: { fontSize: 21, fontWeight: '800', color: Colors.inkPrimary },
  kpiSub: { fontSize: 12, fontWeight: '600', color: Colors.inkMuted },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: Colors.inkSecondary, marginTop: 2 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    flexGrow: 1,
  },
  btnPrimary: { backgroundColor: Colors.accent },
  btnDark: { backgroundColor: Colors.charcoal },
  btnOutline: {
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  btnOutlineText: { color: Colors.inkPrimary, fontSize: 13, fontWeight: '700' },
  sectionCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontSize: 16, fontWeight: '700', color: Colors.inkPrimary },
  sectionSub: { fontSize: 13, color: Colors.inkSecondary, marginTop: 4, lineHeight: 19 },
  scoreTag: { fontSize: 14, fontWeight: '800' },
  formulaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  formulaBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  formulaWeight: { fontSize: 11, fontWeight: '800' },
  formulaScore: { fontSize: 15, fontWeight: '800', color: Colors.inkPrimary, marginTop: 2 },
  formulaCaption: { fontSize: 10.5, color: Colors.inkSecondary, marginTop: 2, textAlign: 'center' },
  barRow: { gap: 4 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 13, color: Colors.inkSecondary, fontWeight: '500' },
  barVal: { fontSize: 13, fontWeight: '700', color: Colors.inkPrimary },
  barTrack: { height: 7, borderRadius: 99, backgroundColor: Colors.borderSoft, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99 },
  unratedNotice: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.slateBorder,
  },
  unratedTitle: { fontSize: 13.5, fontWeight: '700', color: Colors.inkPrimary, marginBottom: 4 },
  unratedText: { fontSize: 13, color: Colors.inkSecondary, lineHeight: 19 },
  trioWrap: { gap: 10 },
  calloutCard: {
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  calloutKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, marginBottom: 4 },
  calloutText: { fontSize: 13.5, color: Colors.inkPrimary, lineHeight: 20 },
  benchRow: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    gap: 6,
  },
  benchHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  benchCat: { fontSize: 10.5, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase' },
  benchSource: { fontSize: 14, fontWeight: '700', color: Colors.inkPrimary },
  benchScore: { fontSize: 14, fontWeight: '800', color: Colors.inkPrimary },
  benchNorm: { fontSize: 11, color: Colors.inkMuted },
  benchTakeaway: { fontSize: 13, color: Colors.inkSecondary, lineHeight: 19 },
  shortCard: { width: 132, marginRight: 10 },
  shortImg: { width: 132, height: 180, borderRadius: 12, backgroundColor: Colors.charcoal },
  shortTitle: { fontSize: 12, fontWeight: '600', color: Colors.inkPrimary, marginTop: 6 },
});
