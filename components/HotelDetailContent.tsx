import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getHotelVideoUrl, openExternalUrl } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatPersonalScore } from '../lib/layout';
import { computeStayOdds, getTonePalette } from '../lib/scoring';
import { useStayOdds } from '../lib/store';
import { Colors } from '../lib/theme';
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
  const { pushToCompare } = useStayOdds();

  const o = computeStayOdds(hotel);
  const palette = getTonePalette(o.statusTone);
  const videoUrl = getHotelVideoUrl(hotel);
  const s = hotel.scores;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isSidePane && styles.contentSidePane]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Media & Summary */}
      <View style={styles.heroCard}>
        <Image source={{ uri: hotel.thumbnail }} style={styles.heroImage} />
        <View style={styles.heroBody}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.pill,
                {
                  backgroundColor: o.firstHand ? Colors.accentSoft : Colors.slateSoft,
                  borderColor: o.firstHand ? Colors.accentBorder : Colors.slateBorder,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: o.firstHand ? Colors.accent : Colors.slate }]}>
                {o.tierLabel}
              </Text>
            </View>
            <View style={[styles.pill, { backgroundColor: palette.soft, borderColor: palette.border }]}>
              <Text style={[styles.pillText, { color: palette.color }]}>{o.statusBadge}</Text>
            </View>
          </View>

          <Text style={styles.title}>{hotel.name}</Text>
          <Text style={styles.subtitle}>
            {hotel.location}, {hotel.country}
            {hotel.brand ? ` • ${hotel.brand}` : ''}
            {hotel.priceRange ? ` • ${hotel.priceRange}` : ''}
          </Text>
          {hotel.verdict ? <Text style={styles.verdict}>{hotel.verdict}</Text> : null}

          {/* 4 Transparent KPI Tiles */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiTile, { backgroundColor: palette.soft, borderColor: palette.border }]}>
              <Text style={[styles.kpiBig, { color: palette.color }]}>
                {o.greatStayOdds != null ? `${o.greatStayOdds}%` : 'Pending'}
              </Text>
              <Text style={styles.kpiLabel}>{o.statusBadge}</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiBig}>
                {o.overallIndex != null ? `${o.overallIndex}/100` : '—'}
              </Text>
              <Text style={styles.kpiLabel}>{BRAND.name} Index</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiBig}>
                {o.firstHand ? `${formatPersonalScore(hotel.overall)}/5` : o.visited ? 'Short' : '—'}
              </Text>
              <Text style={styles.kpiLabel}>First-Hand</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiBig}>
                {o.verifiedGuest ? `${o.verifiedGuest.rating.toFixed(1)}/${o.verifiedGuest.scale}` : 'API'}
              </Text>
              <Text style={styles.kpiLabel}>
                {o.verifiedGuest ? o.verifiedGuest.sourceName : 'Phase 1B Live'}
              </Text>
            </View>
          </View>

          {/* Primary Actions */}
          <View style={styles.actionRow}>
            {hotel.bookingUrl ? (
              <Pressable
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={() => openExternalUrl(hotel.bookingUrl)}
              >
                <Ionicons name="bed-outline" size={16} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>Check Live Rates</Text>
              </Pressable>
            ) : null}
            {videoUrl ? (
              <Pressable style={styles.btnDark} onPress={() => openExternalUrl(videoUrl)}>
                <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
                <Text style={styles.btnDarkText}>
                  {hotel.coverageType === 'Short Tour' ? 'Watch Short' : 'Watch Review'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            style={styles.btnCompare}
            onPress={() => {
              pushToCompare(hotel.id);
              router.push('/(tabs)/compare');
            }}
          >
            <Ionicons name="git-compare-outline" size={15} color={Colors.accentDark} />
            <Text style={styles.btnCompareText}>Compare Head-to-Head</Text>
          </Pressable>
        </View>
      </View>

      {/* Dynamic Confidence-Weighted Formula Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>TRANSPARENT FORMULA</Text>
        <Text style={styles.sectionTitle}>How This {BRAND.name} Score Is Weighted</Text>
        <Text style={styles.sectionSub}>{o.formulaSummary}</Text>

        <View style={styles.weightGrid}>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.firstHand}%</Text>
            <Text style={styles.weightLbl}>First-Hand</Text>
            <Text style={styles.weightVal}>
              {o.ours100 != null ? `${o.ours100}/100` : 'Unrated'}
            </Text>
          </View>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.critics}%</Text>
            <Text style={styles.weightLbl}>Sourced Critics</Text>
            <Text style={styles.weightVal}>
              {o.critic100 != null ? `${o.critic100}/100` : '0 linked'}
            </Text>
          </View>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.guests}%</Text>
            <Text style={styles.weightLbl}>Live Guests</Text>
            <Text style={styles.weightVal}>
              {o.guest100 != null ? `${o.guest100}/100` : 'Phase 1B'}
            </Text>
          </View>
        </View>
      </View>

      {/* First-Hand 5-Axis Scorecard */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>TIER 1 • FOUNDING CONTRIBUTOR</Text>
        <Text style={styles.sectionTitle}>First-Hand 5-Axis Scorecard</Text>
        {o.firstHand && s ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            <ScoreBar label="Rooms & Villas" value={s.rooms} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Grounds, Pools & Beach" value={s.grounds} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Food & Breakfast" value={s.food} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Service & Hospitality" value={s.service} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Value for Money" value={s.value} max={5} suffix=" / 5" color={Colors.accent} whole />
          </View>
        ) : (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>
              {o.visited ? 'Short Preview — Full Scorecard Pending' : 'Global Directory — Not Stayed Yet'}
            </Text>
            <Text style={styles.noticeText}>
              {o.visited
                ? `${BRAND.foundingContributor} filmed quick Shorts at ${hotel.name} without assigning a full 5-axis stay scorecard yet.`
                : `${BRAND.foundingContributor} has not filmed a first-hand stay at ${hotel.name} yet. Live Google Places & licensed guest feeds connect in Phase 1B.`}
            </Text>
          </View>
        )}
      </View>

      {/* Separated Layer 1: Structured Editorial Ratings & Official Awards (sourceUrl enforced) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>SOURCE-URL ENFORCED</Text>
        <Text style={styles.sectionTitle}>
          Structured Editorial Ratings & Awards ({o.editorialRatings.length + o.officialAwards.length})
        </Text>
        {o.editorialRatings.length > 0 || o.officialAwards.length > 0 ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            {o.editorialRatings.map((item, idx) => (
              <Pressable
                key={`${item.sourceName}-${idx}`}
                style={styles.sourceRow}
                onPress={() => openExternalUrl(item.sourceUrl)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceTitle}>{item.sourceName} ↗</Text>
                  {item.takeaway ? <Text style={styles.sourceBody}>{item.takeaway}</Text> : null}
                </View>
                <View style={styles.sourceScorePill}>
                  <Text style={styles.sourceScoreText}>
                    {item.rawScore || `${item.normalized100}/100`}
                  </Text>
                </View>
              </Pressable>
            ))}
            {o.officialAwards.map((aw, idx) => (
              <Pressable
                key={`${aw.label}-${idx}`}
                style={styles.sourceRow}
                onPress={() => openExternalUrl(aw.sourceUrl)}
              >
                <Ionicons name="ribbon" size={16} color={Colors.amber} />
                <Text style={[styles.sourceTitle, { flex: 1 }]}>
                  {aw.label} {aw.year ? `(${aw.year})` : ''} ↗
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyNotice}>
            Zero unlinked editorial scores shown. Every editorial rating or official award added in Phase 1B requires a verified source URL.
          </Text>
        )}
      </View>

      {/* Separated Layer 2: Linked YouTube Video Reviews (sourceUrl enforced) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>DIRECT VIDEO LINKS</Text>
        <Text style={styles.sectionTitle}>
          Linked YouTube Video Reviews ({(videoUrl ? 1 : 0) + o.youtubeReviews.length})
        </Text>
        <View style={{ marginTop: 10, gap: 10 }}>
          {videoUrl ? (
            <Pressable style={styles.sourceRow} onPress={() => openExternalUrl(videoUrl)}>
              <Ionicons name="logo-youtube" size={18} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceTitle}>
                  {BRAND.foundingContributor} ({hotel.coverageType}) ↗
                </Text>
                <Text style={styles.sourceBody} numberOfLines={2}>
                  {hotel.verdict}
                </Text>
              </View>
            </Pressable>
          ) : null}
          {o.youtubeReviews.map((yt, idx) => (
            <Pressable
              key={`${yt.creatorName}-${idx}`}
              style={styles.sourceRow}
              onPress={() => openExternalUrl(yt.sourceUrl)}
            >
              <Ionicons name="logo-youtube" size={18} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.sourceTitle}>
                  {yt.creatorName} {yt.sentiment ? `• ${yt.sentiment}` : ''} ↗
                </Text>
                {yt.takeaway ? <Text style={styles.sourceBody}>{yt.takeaway}</Text> : null}
              </View>
            </Pressable>
          ))}
          {!videoUrl && o.youtubeReviews.length === 0 ? (
            <Text style={styles.emptyNotice}>
              No third-party YouTube video reviews linked yet. Creators are never attributed without a direct verified YouTube link.
            </Text>
          ) : null}
        </View>
      </View>

      {/* Standout & Watch-Out */}
      {(hotel.standout || hotel.watchOut) ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>BEFORE YOU BOOK</Text>
          {hotel.standout ? (
            <>
              <Text style={[styles.noteHead, { color: Colors.teal }]}>Standout Highlight</Text>
              <Text style={styles.noteText}>{hotel.standout}</Text>
            </>
          ) : null}
          {hotel.watchOut ? (
            <>
              <Text style={[styles.noteHead, { color: Colors.amber, marginTop: 12 }]}>Honest Caveat</Text>
              <Text style={styles.noteText}>{hotel.watchOut}</Text>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bgCanvas },
  content: { padding: 14, gap: 14, paddingBottom: 40 },
  contentSidePane: { paddingTop: 14 },

  heroCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: 205, backgroundColor: Colors.charcoal },
  heroBody: { padding: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '800' },

  title: { fontSize: 21, fontWeight: '800', color: Colors.inkPrimary },
  subtitle: { fontSize: 12.5, color: Colors.inkSecondary, marginTop: 3 },
  verdict: { fontSize: 13.5, color: Colors.inkPrimary, marginTop: 10, lineHeight: 20 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  kpiTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.bgCanvas,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    padding: 10,
    alignItems: 'center',
  },
  kpiBig: { fontSize: 18, fontWeight: '900', color: Colors.inkPrimary },
  kpiLabel: { fontSize: 11, fontWeight: '700', color: Colors.inkMuted, marginTop: 2, textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  btnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.charcoal,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnDarkText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  btnCompare: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnCompareText: { color: Colors.accentDark, fontSize: 13, fontWeight: '800' },

  sectionCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  sectionEyebrow: { fontSize: 10, fontWeight: '800', color: Colors.accent, letterSpacing: 0.8 },
  sectionTitle: { fontSize: 16.5, fontWeight: '800', color: Colors.inkPrimary, marginTop: 2 },
  sectionSub: { fontSize: 12.5, color: Colors.inkSecondary, marginTop: 4, lineHeight: 18 },

  weightGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  weightBox: {
    flex: 1,
    backgroundColor: Colors.bgCanvas,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  weightPct: { fontSize: 18, fontWeight: '900', color: Colors.accent },
  weightLbl: { fontSize: 10.5, fontWeight: '700', color: Colors.inkMuted, marginTop: 2, textAlign: 'center' },
  weightVal: { fontSize: 12, fontWeight: '800', color: Colors.inkPrimary, marginTop: 4 },

  barRow: { gap: 4 },
  barTop: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { fontSize: 13, fontWeight: '600', color: Colors.inkSecondary },
  barVal: { fontSize: 13, fontWeight: '800', color: Colors.inkPrimary },
  barTrack: { height: 8, borderRadius: 999, backgroundColor: Colors.bgCanvas, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },

  noticeBox: {
    marginTop: 10,
    backgroundColor: Colors.bgWarm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    padding: 12,
  },
  noticeTitle: { fontSize: 13.5, fontWeight: '800', color: Colors.inkPrimary },
  noticeText: { fontSize: 12.5, color: Colors.inkSecondary, marginTop: 4, lineHeight: 18 },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgCanvas,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  sourceTitle: { fontSize: 13.5, fontWeight: '800', color: Colors.inkPrimary },
  sourceBody: { fontSize: 12, color: Colors.inkSecondary, marginTop: 2, lineHeight: 17 },
  sourceScorePill: {
    backgroundColor: Colors.charcoal,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sourceScoreText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  emptyNotice: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 8, lineHeight: 18 },
  noteHead: { fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase', marginTop: 6 },
  noteText: { fontSize: 13, color: Colors.inkPrimary, marginTop: 3, lineHeight: 19 },
});
