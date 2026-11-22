import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchLiveGoogleRating, getHotelVideoUrl, LiveGoogleRating, openExternalUrl } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatPersonalScore } from '../lib/layout';
import { computeStayOdds, getTonePalette, getTripAdvisorUrl } from '../lib/scoring';
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
  const [liveGoogle, setLiveGoogle] = useState<LiveGoogleRating | null>(null);

  useEffect(() => {
    let active = true;
    setLiveGoogle(null);
    if (hotel.googlePlaceId) {
      fetchLiveGoogleRating(hotel.googlePlaceId).then((res) => {
        if (active && res) setLiveGoogle(res);
      });
    }
    return () => {
      active = false;
    };
  }, [hotel.id, hotel.googlePlaceId]);

  // Only feed live Google into scoring when status === 'ok' and rating is a real number
  const validLiveGoogle =
    liveGoogle && liveGoogle.status === 'ok' && typeof liveGoogle.rating === 'number'
      ? {
          rating: liveGoogle.rating,
          reviewCount: liveGoogle.reviewCount,
          googleMapsUri: liveGoogle.googleMapsUri,
          fetchedAt: liveGoogle.fetchedAt,
        }
      : null;

  // If Nuitée licensed guest score exists, keep it in main calculation or merge live Google cleanly
  const o = computeStayOdds(hotel, !hotel.verifiedGuest?.licensed ? validLiveGoogle : null);
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
                {o.greatStayOdds != null ? `${o.greatStayOdds}%` : 'Live'}
              </Text>
              <Text style={styles.kpiLabel}>{o.statusBadge}</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiBig}>{o.opinionGap.deltaLabel}</Text>
              <Text style={styles.kpiLabel}>Opinion Gap</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiBig}>
                {o.personalScore25 != null
                  ? `${o.personalScore25}/25`
                  : o.firstHand
                  ? `${formatPersonalScore(hotel.overall)}/5`
                  : o.visited
                  ? 'Short'
                  : 'Global'}
              </Text>
              <Text style={styles.kpiLabel}>My Stay</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiBig}>
                {o.verifiedGuest
                  ? `${o.verifiedGuest.rating.toFixed(1)}/${o.verifiedGuest.scale}`
                  : validLiveGoogle
                  ? `${validLiveGoogle.rating.toFixed(1)}★`
                  : '—'}
              </Text>
              <Text style={styles.kpiLabel}>
                {o.verifiedGuest ? o.verifiedGuest.sourceName : validLiveGoogle ? 'Google Live' : 'Guest Score'}
              </Text>
            </View>
          </View>

          {/* Primary Actions (Mobile-Compliant Booking Routing) */}
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

          <Pressable
            onPress={() => openExternalUrl(getTripAdvisorUrl(hotel))}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: Colors.border,
              backgroundColor: Colors.bgWhite,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.inkMuted }}>TripAdvisor</Text>
            <Ionicons name="open-outline" size={12} color={Colors.inkMuted} />
          </Pressable>

          <View style={styles.vipBox}>
            <Ionicons name="sparkles-outline" size={14} color={Colors.inkSecondary} />
            <Text style={styles.vipText}>
              VIP Luxury Advisor Perks slot ready — complimentary breakfast, resort credit &amp; upgrades coming soon.
            </Text>
          </View>
        </View>
      </View>

      {/* RESTORED: Dual-Mode Consensus & Opinion Gap Card */}
      <View style={[styles.sectionCard, styles.gapCard, { borderLeftColor: palette.ring }]}>
        <View style={styles.gapHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionEyebrow}>OPINION GAP • HYPE VS. REALITY</Text>
            <Text style={styles.sectionTitle}>{o.opinionGap.title}</Text>
            <Text style={styles.gapHeadline}>{o.opinionGap.headline}</Text>
          </View>
          <View style={styles.deltaBadge}>
            <Text style={styles.deltaBig}>{o.opinionGap.deltaLabel}</Text>
            <Text style={styles.deltaSub}>DELTA</Text>
          </View>
        </View>

        <View style={{ marginTop: 12, gap: 10 }}>
          <ScoreBar
            label={`${o.opinionGap.leftLabel} (${o.opinionGap.leftDisplay})`}
            value={o.opinionGap.left100 || 0}
            max={100}
            suffix="/100"
            color={Colors.accent}
          />
          {o.firstHand && o.critic100 != null ? (
            <ScoreBar
              label={`Published Critics (${o.editorialRatings.filter((e) => e.normalized100 != null).map((e) => e.sourceName).join(', ')})`}
              value={o.critic100}
              max={100}
              suffix="/100"
              color={Colors.amber}
            />
          ) : null}
          <ScoreBar
            label={`${o.opinionGap.rightLabel} (${o.opinionGap.rightDisplay})`}
            value={o.opinionGap.right100 || 0}
            max={100}
            suffix="/100"
            color={Colors.teal}
          />
        </View>

        {validLiveGoogle ? (
          <Pressable
            style={styles.googleStrip}
            onPress={() => validLiveGoogle.googleMapsUri && openExternalUrl(validLiveGoogle.googleMapsUri)}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.googleStripText}>
                Live Google Rating: {validLiveGoogle.rating.toFixed(1)} ★
                {validLiveGoogle.reviewCount ? ` (${validLiveGoogle.reviewCount.toLocaleString()} reviews)` : ''}
              </Text>
              <Text style={[styles.googleAttr, { marginTop: 2, fontWeight: '500' }]}>
                {liveGoogle?.policyNotice || 'Reviews are not verified by Google.'}
              </Text>
            </View>
            <Text style={styles.googleAttr}>Powered by Google</Text>
          </Pressable>
        ) : liveGoogle && liveGoogle.googleMapsUri ? (
          <Pressable
            style={styles.googleStrip}
            onPress={() => liveGoogle.googleMapsUri && openExternalUrl(liveGoogle.googleMapsUri)}
          >
            <Text style={styles.googleStripText}>Check live reviews on Google Maps ↗</Text>
            <Text style={styles.googleAttr}>Google Maps</Text>
          </Pressable>
        ) : null}

        {o.firstHand && o.opinionGap.narrative ? (
          <Text style={styles.gapNarrative}>
            <Text style={{ fontWeight: '800' }}>What I Liked &amp; Where My Take Differs: </Text>
            {o.opinionGap.narrative}
          </Text>
        ) : null}
      </View>

      {/* Structured Middle Key Facts Panel (Verified Specs Only) */}
      <View style={[styles.sectionCard, styles.keyFactsCard]}>
        <Text style={styles.sectionEyebrow}>KEY HOTEL FACTS</Text>
        <Text style={styles.sectionTitle}>Verified Specs &amp; Decision Details</Text>
        {o.keyFacts.length > 0 ? (
          <View style={styles.factsGrid}>
            {o.keyFacts.map((kf) => (
              <View key={kf.label} style={styles.factTile}>
                <Text style={styles.factLabel}>{kf.label}</Text>
                <Text style={styles.factValue}>{kf.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {o.redFlags.length > 0 ? (
          <View style={styles.flagsRow}>
            {o.redFlags.map((flag) => (
              <View key={flag} style={styles.flagChip}>
                <Ionicons name="warning-outline" size={12} color={Colors.amber} />
                <Text style={styles.flagText}>{flag}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {hotel.standout ? (
          <>
            <Text style={[styles.noteHead, { color: Colors.teal, marginTop: 12 }]}>Standout Strengths</Text>
            <Text style={styles.noteText}>{hotel.standout}</Text>
          </>
        ) : null}
        {hotel.watchOut ? (
          <>
            <Text style={[styles.noteHead, { color: Colors.amber, marginTop: 10 }]}>Watch-Outs Before Booking</Text>
            <Text style={styles.noteText}>{hotel.watchOut}</Text>
          </>
        ) : null}
      </View>

      {/* Weighting Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>TRANSPARENT WEIGHTING</Text>
        <Text style={styles.sectionTitle}>How This {BRAND.name} Score Is Weighted</Text>
        <Text style={styles.sectionSub}>{o.formulaSummary}</Text>

        <View style={styles.weightGrid}>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.firstHand}%</Text>
            <Text style={styles.weightLbl}>My Stay</Text>
            <Text style={styles.weightVal}>
              {o.ours100 != null ? `${o.ours100}/100` : 'Unrated'}
            </Text>
          </View>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.critics}%</Text>
            <Text style={styles.weightLbl}>Published Critics</Text>
            <Text style={styles.weightVal}>
              {o.critic100 != null ? `${o.critic100}/100` : '—'}
            </Text>
          </View>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.guests}%</Text>
            <Text style={styles.weightLbl}>Verified Guests</Text>
            <Text style={styles.weightVal}>
              {o.guest100 != null ? `${o.guest100}/100` : 'Live'}
            </Text>
          </View>
        </View>
      </View>

      {/* First-Hand 5-Category Scorecard (/25) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>TIER 1 • MY STAY SCORECARD</Text>
        <Text style={styles.sectionTitle}>My 5-Category Scorecard ({o.opinionGap.leftDisplay})</Text>
        {o.firstHand && s ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            <ScoreBar label="Value" value={s.value} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Room Quality" value={s.rooms} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Vibe" value={s.grounds} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Food" value={s.food} max={5} suffix=" / 5" color={Colors.accent} whole />
            <ScoreBar label="Service" value={s.service} max={5} suffix=" / 5" color={Colors.accent} whole />
          </View>
        ) : (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>
              {o.visited ? 'Short Preview — Full Scorecard Pending' : 'Global Directory — Not Stayed Yet'}
            </Text>
            <Text style={styles.noticeText}>
              {o.visited
                ? `${BRAND.foundingContributor} filmed quick Shorts here without assigning a full /25 stay scorecard yet.`
                : `${BRAND.foundingContributor} has not filmed a first-hand stay at ${hotel.name} yet.`}
            </Text>
          </View>
        )}
      </View>

      {/* Separated Layer 1: Official Awards & Editorial Reviews */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>DIRECTLY SOURCED</Text>
        <Text style={styles.sectionTitle}>
          Official Awards &amp; Editorial Reviews ({o.editorialRatings.length + o.officialAwards.length})
        </Text>
        {o.editorialRatings.length > 0 || o.officialAwards.length > 0 ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            {o.officialAwards.map((aw, idx) => (
              <Pressable
                key={`${aw.label}-${idx}`}
                style={styles.sourceRow}
                onPress={() => openExternalUrl(aw.sourceUrl)}
              >
                <Ionicons name="ribbon" size={16} color={Colors.amber} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sourceTitle}>
                    {aw.label} {aw.year ? `(${aw.year})` : ''} ↗
                  </Text>
                  {aw.awardBody ? <Text style={styles.sourceBody}>{aw.awardBody}</Text> : null}
                </View>
                <View style={styles.sourceScorePill}>
                  <Text style={styles.sourceScoreText}>Official Award</Text>
                </View>
              </Pressable>
            ))}
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
                    {item.normalized100 != null ? (item.rawScore || `${item.normalized100}/100`) : 'Review ↗'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyNotice}>
            Zero unlinked critic scores shown. Every editorial rating or official award requires a verified source URL.
          </Text>
        )}
      </View>

      {/* Separated Layer 2: Linked YouTube Video Reviews */}
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
              No YouTube video reviews linked yet. Creators are never attributed without a direct YouTube link.
            </Text>
          ) : null}
        </View>
      </View>
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
    borderRadius: 999,
  },
  btnPrimaryText: { color: Colors.accentInk, fontSize: 13.5, fontWeight: '800' },
  btnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.navy,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
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
    borderRadius: 999,
  },
  btnCompareText: { color: Colors.accentDark, fontSize: 13, fontWeight: '800' },
  vipBox: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.bgCanvas,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    padding: 10,
  },
  vipText: { flex: 1, fontSize: 11.5, color: Colors.inkSecondary, lineHeight: 16 },

  sectionCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 15,
  },
  gapCard: { borderLeftWidth: 4 },
  gapHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  gapHeadline: { fontSize: 13, fontWeight: '700', color: Colors.inkSecondary, marginTop: 4, lineHeight: 18 },
  deltaBadge: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignItems: 'center',
    minWidth: 74,
  },
  deltaBig: { color: Colors.accent, fontSize: 15, fontWeight: '900' },
  deltaSub: { color: '#CBD5E1', fontSize: 8.5, fontWeight: '800', letterSpacing: 0.6 },
  googleStrip: {
    marginTop: 12,
    backgroundColor: Colors.googleSoft,
    borderWidth: 1,
    borderColor: Colors.tealBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  googleStripText: { fontSize: 12, fontWeight: '700', color: Colors.navy, flex: 1 },
  googleAttr: { fontSize: 10, fontWeight: '800', color: Colors.inkSecondary },
  gapNarrative: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    fontSize: 13,
    color: Colors.inkPrimary,
    lineHeight: 19,
  },

  keyFactsCard: { backgroundColor: Colors.bgWarm, borderColor: Colors.accentBorder },
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  factTile: {
    minWidth: '47%',
    flex: 1,
    backgroundColor: Colors.bgWhite,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    padding: 10,
  },
  factLabel: { fontSize: 9.5, fontWeight: '800', color: Colors.inkMuted, textTransform: 'uppercase' },
  factValue: { fontSize: 12.5, fontWeight: '700', color: Colors.inkPrimary, marginTop: 3 },
  flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  flagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.amberSoft,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  flagText: { fontSize: 11, fontWeight: '800', color: Colors.amber },

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
  barLabel: { fontSize: 12.5, fontWeight: '600', color: Colors.inkSecondary, flex: 1, paddingRight: 8 },
  barVal: { fontSize: 12.5, fontWeight: '800', color: Colors.inkPrimary },
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
  noteHead: { fontSize: 11.5, fontWeight: '800', textTransform: 'uppercase' },
  noteText: { fontSize: 13, color: Colors.inkPrimary, marginTop: 3, lineHeight: 19 },
});
