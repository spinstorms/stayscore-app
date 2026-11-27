import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchLiveGoogleRating, getHotelVideoUrl, LiveGoogleRating, openExternalUrl } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  getBestMonths,
  getBrandCategories,
  getGuestProfile,
  getPartnerPrograms,
  getRoomTipInfo,
} from '../lib/insights';
import { formatPersonalScore } from '../lib/layout';
import { Alternative, HotelExtras, HotelRanks, NearbyHotel, loadGuestRanks, ordinal, RankEntry } from '../lib/ranks';
import { getPropertyStatusMeta } from '../lib/propertyStatus';
import { computeStayOdds, getTonePalette, getTripAdvisorUrl, isScoreUnverified } from '../lib/scoring';
import { useStayOdds } from '../lib/store';
import { Colors } from '../lib/theme';
import type { Hotel } from '../lib/types';
import { ShareCardModal } from './ShareCardModal';
import { InlineVideo } from './video/InlineVideo';
import { WhenBox } from './WhenBox';
import { t } from '../lib/i18n';
import { getTripadvisor } from '../lib/tripadvisor';

const formatTaDate = (d: string) => {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? d : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

interface Props {
  hotel: Hotel;
  isSidePane?: boolean;
  /** quick-date key to preselect, e.g. 'christmas' (from the Holidays screen) */
  when?: string;
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

function RankScale({ title, r }: { title: string; r: RankEntry }) {
  const pos = r.of <= 1 ? 0 : Math.round(((r.rank - 1) / (r.of - 1)) * 100);
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.rankTitle}>
        {title} <Text style={{ color: Colors.accent }}>{ordinal(r.rank)} of {r.of}</Text>
      </Text>
      <View style={styles.rankTrack}>
        <View style={[styles.rankDot, { left: `${pos}%` }]} />
      </View>
      <View style={styles.rankFoot}>
        <Text style={styles.rankFootText} numberOfLines={1}>
          Top: {r.top} ({r.topScore})
        </Text>
        <Text style={styles.rankFootText}>Lowest: {r.low}</Text>
      </View>
    </View>
  );
}

export function HotelDetailContent({ hotel, isSidePane = false, when }: Props) {
  const router = useRouter();
  const { hotels, setCompareA, setCompareB, setCompareC, pushToCompare, toggleShortlist, isShortlisted } = useStayOdds();
  const [liveGoogle, setLiveGoogle] = useState<LiveGoogleRating | null>(null);
  const ta = getTripadvisor(hotel.id);
  // "Full details below": jumps past the booking buttons to the StayOdds breakdown
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [detailsY, setDetailsY] = useState(0);
  const jumpToDetails = () => scrollRef.current?.scrollTo({ y: Math.max(0, detailsY - 8), animated: true });
  const [showExplainer, setShowExplainer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const saved = isShortlisted(hotel.id);
  const [ranks, setRanks] = useState<HotelRanks | null>(null);
  const [alts, setAlts] = useState<Alternative[]>([]);
  const [extras, setExtras] = useState<HotelExtras | null>(null);
  const [nearby, setNearby] = useState<NearbyHotel[]>([]);

  useEffect(() => {
    let active = true;
    setRanks(null);
    setExtras(null);
    setNearby([]);
    setAlts([]);
    loadGuestRanks().then((d) => {
      if (!active || !d) return;
      setRanks(d.ranks[hotel.id] || null);
      setAlts((d.alternatives[hotel.id] || []).filter((a) => hotels.some((h) => h.id === a.id)));
      setExtras((d.extras || {})[hotel.id] || null);
      setNearby(((d.nearby || {})[hotel.id] || []).filter((a) => hotels.some((h) => h.id === a.id)));
    });
    return () => {
      active = false;
    };
  }, [hotel.id, hotels]);

  useEffect(() => {
    let active = true;
    setLiveGoogle(null);
    // Saved guest scores already include Google; only ask Google live when we have nothing saved
    if (hotel.googlePlaceId && !hotel.verifiedGuest?.licensed) {
      fetchLiveGoogleRating(hotel.googlePlaceId).then((res) => {
        if (active && res) setLiveGoogle(res);
      });
    }
    return () => {
      active = false;
    };
  }, [hotel.id, hotel.googlePlaceId, hotel.verifiedGuest]);

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
  const gap = o.opinionGap;
  const odds = o.greatStayOdds;
  const band = odds == null ? 'Guest scores still coming in' : odds >= 90 ? 'A great stay' : odds >= 82 ? 'A very good stay' : odds >= 74 ? 'A good stay, with caveats' : 'Mixed reviews';
  const who = o.firstHand ? 'we did' : 'critics do';
  const verdict =
    gap.delta100 == null
      ? `${band}.`
      : Math.abs(gap.delta100) <= 3
      ? `${band}, and guests agree with ${o.firstHand ? 'us' : 'the critics'}.`
      : gap.delta100 < 0
      ? `${band}, and guests like it even more than ${who}.`
      : `${band}, though guests rate it lower than ${who}.`;
  const videoUrl = getHotelVideoUrl(hotel);
  const s = hotel.scores;
  const propStatus = getPropertyStatusMeta(hotel);
  const brandInfo = getBrandCategories(hotel);
  const partnerInfo = getPartnerPrograms(hotel);
  const bestMonths = getBestMonths(hotel);
  const guestProfile = getGuestProfile(hotel);
  const roomTip = getRoomTipInfo(hotel);

  return (
    <>
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={[styles.content, isSidePane && styles.contentSidePane]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Media & Summary */}
      <View style={styles.heroCard}>
        <Image source={{ uri: hotel.thumbnail }} style={styles.heroImage} />
        {/* photo-first: a strip of the hotel's own photos under the hero */}
        {hotel.gallery && hotel.gallery.filter((u) => u !== hotel.thumbnail).length >= 2 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
            {hotel.gallery
              .filter((u) => u !== hotel.thumbnail)
              .slice(0, 6)
              .map((u) => (
                <Image key={u} source={{ uri: u }} style={styles.photoStripImg} accessibilityLabel={hotel.name} />
              ))}
          </ScrollView>
        ) : null}
        {hotel.photoCredit ? (
          <Pressable onPress={() => openExternalUrl(hotel.photoCredit!.url)}>
            <Text style={{ fontSize: 11, color: Colors.inkMuted, paddingHorizontal: 14, paddingTop: 6 }}>
              {hotel.photoCredit.text}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.heroBody}>
          <Text style={styles.title}>{hotel.name}</Text>
          <Text style={styles.subtitle}>
            {hotel.location}, {hotel.country}
            {brandInfo.primaryBrand !== 'Independent & Boutique'
              ? ` • ${brandInfo.primaryBrand}${brandInfo.parentGroup ? ` (${brandInfo.parentGroup})` : ''}`
              : ''}
            {hotel.priceRange ? ` • ${hotel.priceRange}` : ''}
          </Text>

          {/* Score story first (Nov 2026 redesign): StayOdds %, verdict, us-vs-guests gap, Check prices */}
          <View style={styles.scoreCard}>
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <View style={[styles.ring, { borderColor: (o.greatStayOdds ?? 0) >= 82 ? Colors.accent : '#F59E0B' }]}>
                <Text style={styles.ringBig}>{o.greatStayOdds != null ? `${o.greatStayOdds}%` : '—'}</Text>
                <Text style={styles.ringSmall}>StayOdds</Text>
              </View>
              <Text style={styles.soVerdict}>{verdict}</Text>
            </View>
            {/* the score comes first: point people to how it's worked out, before any prices */}
            <Pressable
              onPress={jumpToDetails}
              style={({ pressed }) => [styles.detailsJump, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={t('Score explained below')}
            >
              <Ionicons name="arrow-down-circle" size={22} color={Colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsJumpTitle}>{t('Score explained below')}</Text>
                <Text style={styles.detailsJumpSub}>{t('What guests and critics say, best months, room tips and rivals')}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={Colors.inkMuted} />
            </Pressable>
            {gap.left100 != null && gap.right100 != null ? (
              <View style={styles.gapRow}>
                <View style={[styles.gapTile, { backgroundColor: '#FFF7F2' }]}>
                  <Text style={styles.gapBig}>{gap.left100}</Text>
                  <Text style={styles.gapLbl}>{o.firstHand ? 'Our stay' : 'Critics'}</Text>
                </View>
                <View style={[styles.gapTile, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={styles.gapBig}>{gap.right100}</Text>
                  <Text style={styles.gapLbl}>{t("Guests")}</Text>
                </View>
                <View style={[styles.gapTile, { backgroundColor: '#FFF1E8' }]}>
                  <Text style={[styles.gapBig, { color: '#C2410C' }]}>
                    {gap.delta100 != null ? (gap.delta100 > 0 ? `+${gap.delta100}` : `${gap.delta100}`.replace('-', '−')) : '—'}
                  </Text>
                  <Text style={styles.gapLbl}>Gap</Text>
                </View>
              </View>
            ) : null}
            {o.verifiedGuest?.reviewCount ? (
              <Text style={styles.gapNote}>
                {o.verifiedGuest.reviewCount.toLocaleString()} guest reviews rate it {o.verifiedGuest.rating.toFixed(1)}/{o.verifiedGuest.scale}
                {o.personalScoreLabel ? ` · our filmed stay ${o.personalScoreLabel}` : ''}.
              </Text>
            ) : null}
            <WhenBox
              bookingUrl={hotel.bookingUrl}
              priceFrom={hotel.priceRange ? hotel.priceRange.replace(/\s*\/\s*night/i, '') : undefined}
              when={when}
            />
          </View>

          {/* Even 2x2 facts: no empty gaps */}
          <View style={styles.factGrid}>
            {hotel.priceRange ? (
              <View style={styles.soFactTile}>
                <Text style={styles.factKicker}>{t("PRICE")}</Text>
                <Text style={styles.soFactValue}>From {hotel.priceRange}</Text>
              </View>
            ) : null}
            <View style={styles.soFactTile}>
              <Text style={styles.factKicker}>{t("BEST MONTHS")}</Text>
              <Text style={styles.soFactValue}>{bestMonths.shortLabel}</Text>
              <Text style={styles.factNote} numberOfLines={2}>{bestMonths.note}</Text>
            </View>
            {roomTip ? (
              <View style={styles.soFactTile}>
                <Text style={styles.factKicker}>{roomTip.label.toUpperCase()}</Text>
                <Text style={[styles.soFactValue, { fontSize: 13 }]} numberOfLines={3}>{roomTip.text}</Text>
              </View>
            ) : null}
            {extras?.waterPolicy ? (
              <Pressable style={styles.soFactTile} onPress={() => openExternalUrl(extras.waterPolicy!.url)}>
                <Text style={styles.factKicker}>DRINKING WATER</Text>
                <Text style={[styles.soFactValue, { fontSize: 13 }]}>{extras.waterPolicy.status}</Text>
                <Text style={styles.factNote} numberOfLines={3}>
                  {extras.waterPolicy.summary} Source: isthewaterfree.com
                </Text>
              </Pressable>
            ) : extras?.water ? (
              <View style={styles.soFactTile}>
                <Text style={styles.factKicker}>DRINKING WATER</Text>
                <Text style={[styles.soFactValue, { fontSize: 13 }]}>
                  {extras.water.paid && !extras.water.free
                    ? "Guests say it isn't free"
                    : extras.water.free && !extras.water.paid
                    ? 'Guests report it free'
                    : 'Mixed reports'}
                </Text>
                <Text style={styles.factNote} numberOfLines={3}>
                  &ldquo;{extras.water.text}&rdquo; ({extras.water.source}, {extras.water.latest.slice(0, 7)})
                </Text>
              </View>
            ) : null}
            {extras?.dining?.length ? (
              <Pressable style={styles.soFactTile} onPress={() => openExternalUrl(extras.dining![0].url)}>
                <Text style={styles.factKicker}>DINE AT THE HOTEL</Text>
                <Text style={[styles.soFactValue, { fontSize: 13 }]}>{extras.dining[0].name}</Text>
                <Text style={styles.factNote}>{extras.dining[0].distinction} · MICHELIN Guide</Text>
              </Pressable>
            ) : null}
            <View style={styles.soFactTile}>
              <Text style={styles.factKicker}>STATUS</Text>
              <Text style={[styles.soFactValue, { fontSize: 13 }]}>{propStatus.badge}</Text>
            </View>
          </View>

          {hotel.standout ? (
            <View style={[styles.loveCard, { borderTopColor: '#16A34A' }]}>
              <Text style={styles.loveTitle}>{t("Why guests love it")}</Text>
              <Text style={styles.loveText}>{hotel.standout}</Text>
            </View>
          ) : null}
          {hotel.watchOut ? (
            <View style={[styles.loveCard, { borderTopColor: '#F59E0B' }]}>
              <Text style={styles.loveTitle}>{t("Know before you book")}</Text>
              <Text style={styles.loveText}>{hotel.watchOut}</Text>
            </View>
          ) : null}

          <View style={[styles.badgeRow, { marginTop: 12 }]}>
            {partnerInfo.preferredProgram ? (
              <View style={[styles.pill, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <Text style={[styles.pillText, { color: '#C2410C' }]}>✨ {partnerInfo.preferredProgram}</Text>
              </View>
            ) : null}
            {partnerInfo.pointsProgram ? (
              <View style={[styles.pill, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <Text style={[styles.pillText, { color: '#3730A3' }]}>★ {partnerInfo.pointsProgram}</Text>
              </View>
            ) : null}
            {guestProfile.badgeLabel ? (
              <View style={[styles.pill, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Text style={[styles.pillText, { color: '#0369A1' }]}>{guestProfile.badgeLabel}</Text>
              </View>
            ) : null}
          </View>

          {(hotel.verifiedGuest?.licensed?.sources?.length || 0) > 1 ? (
            <Text style={styles.guestBreakdown}>
              Guest score from{' '}
              {hotel.verifiedGuest!.licensed!.sources!
                .map(
                  (p) =>
                    `${p.name} ${p.rating}/${p.scale}${p.reviewCount ? ` (${p.reviewCount.toLocaleString()})` : ''}`,
                )
                .join(' · ')}
              , combined by number of reviews
            </Text>
          ) : null}

          {ranks?.area ? (
            <View style={styles.rankBox}>
              <Text style={styles.rankHeading}>{t("How guests rank it")}</Text>
              <Text style={styles.rankSub}>
                Against other StayOdds hotels nearby, and against hotels at a similar price. Left is the best-rated.
              </Text>
              <RankScale title={`In ${ranks.area.group}:`} r={ranks.area} />
              {ranks.price ? (
                <RankScale
                  title={`At a similar price (${ranks.price.group} a night${ranks.price.where ? ` in ${ranks.price.where}` : ', worldwide'}):`}
                  r={ranks.price}
                />
              ) : null}
              {nearby.length && o.guest100 != null ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.rankTitle}>How guests compare nearby</Text>
                  {[{ id: hotel.id, name: hotel.name, g: o.guest100, rc: 0, km: 0, me: true }, ...nearby.map((n) => ({ ...n, me: false }))]
                    .sort((a, b) => b.g - a.g)
                    .map((a) => (
                      <Pressable
                        key={a.id}
                        disabled={a.me}
                        style={[styles.altRow, a.me && { backgroundColor: '#FFF7F2', borderRadius: 8, paddingHorizontal: 6 }]}
                        onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: a.id } })}
                      >
                        <Text style={[styles.altName, a.me && { fontWeight: '800' }]} numberOfLines={1}>
                          {a.name}{a.me ? ' (this hotel)' : ''}
                        </Text>
                        <Text style={styles.altMeta}>
                          <Text style={{ color: Colors.accent, fontWeight: '700' }}>{a.g}</Text>/100{a.me ? '' : ` · ${a.km} km`}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              ) : alts.length ? (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.rankTitle}>Guests rate these higher nearby</Text>
                  {alts.map((a) => (
                    <Pressable
                      key={a.id}
                      style={styles.altRow}
                      onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: a.id } })}
                    >
                      <Text style={styles.altName} numberOfLines={1}>
                        {a.name}
                      </Text>
                      <Text style={styles.altMeta}>
                        <Text style={{ color: Colors.accent, fontWeight: '700' }}>{a.g}</Text>/100 · {a.rc.toLocaleString()}
                        {a.band ? ` · ${a.band}` : ''}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : ranks.area.rank === 1 ? (
                <Text style={[styles.rankTitle, { marginTop: 12 }]}>Guests' top-rated hotel in {ranks.area.group}.</Text>
              ) : null}
            </View>
          ) : null}

          {/* Collapsible How StayOdds % Is Calculated Explainer */}
          <View style={styles.explainerBox}>
            <Pressable
              style={styles.explainerHead}
              onPress={() => setShowExplainer((prev) => !prev)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <Ionicons name="help-circle-outline" size={15} color={Colors.accent} />
                <Text style={styles.explainerHeadText}>How is this StayOdds % calculated?</Text>
              </View>
              <Ionicons
                name={showExplainer ? 'chevron-up' : 'chevron-down'}
                size={15}
                color={Colors.inkMuted}
              />
            </Pressable>
            {showExplainer ? (
              <View style={styles.explainerBody}>
                <View style={styles.explainerEq}>
                  <Text style={styles.explainerEqText}>{o.equationSummary}</Text>
                </View>
                <Text style={styles.explainerBullet}>
                  • <Text style={styles.explainerStrong}>Zero double-counting:</Text> StayOdds % is purely the weighted average of the independent numeric scores above — never inflated or adjusted by hidden bonuses.
                </Text>
                <Text style={styles.explainerBullet}>
                  • <Text style={styles.explainerStrong}>My Stay (/25):</Text> Our 5-category stay score (Value, Rooms, Vibe, Food, Service — each out of 5, × 4 for 100%).
                </Text>
                <Text style={styles.explainerBullet}>
                  • <Text style={styles.explainerStrong}>Published Critics (/100):</Text> Only critics with a real numeric score. Comments-only reviews (like The Points Guy) and official awards are linked separately without invented numbers.
                </Text>
                <Text style={styles.explainerBullet}>
                  • <Text style={styles.explainerStrong}>Google Guests (/5★):</Text> Live Google guest rating (stars × 20 = 100%).
                </Text>
                <Text style={styles.explainerBullet}>
                  • <Text style={styles.explainerStrong}>Fixed weights:</Text> 40/30/30 (all three) • 55/45 (two with our stay) • 35/65 (Critics + Guests) • 100% (one numeric source).
                </Text>
              </View>
            ) : null}
          </View>


          {/* Primary Actions (Mobile-Compliant Booking Routing) */}
          {videoUrl ? (
            // Our video review plays right here
            <InlineVideo
              url={videoUrl}
              aspect={hotel.coverageType === 'Short Tour' ? 9 / 16 : 16 / 9}
              badge={hotel.coverageType === 'Short Tour' ? 'Our short' : 'Our video review'}
              style={hotel.coverageType === 'Short Tour' ? { maxWidth: 300, alignSelf: 'center' } : undefined}
            />
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={[styles.btnCompare, { flex: 1 }]}
              onPress={() => {
                pushToCompare(hotel.id);
                router.push('/compare');
              }}
            >
              <Ionicons name="git-compare-outline" size={15} color={Colors.accentDark} />
              <Text style={styles.btnCompareText}>{t("Compare VS")}</Text>
            </Pressable>

            <Pressable
              style={[
                styles.btnCompare,
                {
                  flex: 1,
                  backgroundColor: saved ? '#FFF1F2' : Colors.bgWhite,
                  borderColor: saved ? '#F43F5E' : Colors.border,
                },
              ]}
              onPress={() => toggleShortlist(hotel.id)}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={15}
                color={saved ? '#E11D48' : Colors.inkSecondary}
              />
              <Text
                style={[
                  styles.btnCompareText,
                  { color: saved ? '#BE123C' : Colors.inkPrimary },
                ]}
              >
                {saved ? 'Saved' : 'Shortlist'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.btnCompare,
              { backgroundColor: Colors.navy, borderColor: Colors.navy },
            ]}
            onPress={() => setShowShareModal(true)}
          >
            <Ionicons name="share-outline" size={15} color="#FFFFFF" />
            <Text style={[styles.btnCompareText, { color: '#FFFFFF' }]}>
              Share StayOdds Card (1:1 &amp; 9:16 + QR)
            </Text>
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
      <View
        onLayout={(e) => setDetailsY(e.nativeEvent.layout.y)}
        style={[styles.sectionCard, styles.gapCard, { borderLeftColor: palette.ring }]}
      >
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

        {/* Tripadvisor, saved from stayodds.com with the date it was checked (no live Tripadvisor calls) */}
        {ta ? (
          <Pressable style={styles.googleStrip} onPress={() => ta.u && openExternalUrl(ta.u)} disabled={!ta.u}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.googleStripText}>
                Tripadvisor: {ta.r.toFixed(1)} / 5{ta.n ? ` from ${ta.n.toLocaleString()} reviews` : ''}
              </Text>
              {ta.k || ta.a?.length ? (
                <Text style={[styles.googleAttr, { marginTop: 2, fontWeight: '600' }]}>{[ta.k, ...(ta.a || [])].filter(Boolean).join(' · ')}</Text>
              ) : null}
              <Text style={[styles.googleAttr, { marginTop: 2, fontWeight: '500' }]}>
                Source: Tripadvisor{ta.d ? ` · last checked ${formatTaDate(ta.d)}` : ''}
              </Text>
            </View>
            {ta.u ? <Text style={styles.googleAttr}>Read reviews ↗</Text> : null}
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

        {/* Property Status & Works (Strictly Verified Only) */}
        <View
          style={[
            styles.statusPanel,
            propStatus.tone === 'danger'
              ? styles.statusPanelDanger
              : propStatus.tone === 'warn'
              ? styles.statusPanelWarn
              : propStatus.tone === 'open'
              ? styles.statusPanelOpen
              : null,
          ]}
        >
          <View style={styles.statusPanelHead}>
            <Text style={styles.statusPanelTitle}>Property Status &amp; Works</Text>
            <View
              style={[
                styles.statusBadgeChip,
                propStatus.tone === 'danger'
                  ? { backgroundColor: '#FEE2E2' }
                  : propStatus.tone === 'warn'
                  ? { backgroundColor: '#FEF3C7' }
                  : propStatus.tone === 'open'
                  ? { backgroundColor: '#CCFBF1' }
                  : { backgroundColor: '#E2E8F0' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeTxt,
                  propStatus.tone === 'danger'
                    ? { color: '#991B1B' }
                    : propStatus.tone === 'warn'
                    ? { color: '#92400E' }
                    : propStatus.tone === 'open'
                    ? { color: '#115E59' }
                    : { color: '#334155' },
                ]}
              >
                {propStatus.badge}
              </Text>
            </View>
          </View>

          {propStatus.hasDetails ? (
            <View style={{ gap: 6, marginTop: 6 }}>
              {propStatus.operatingStatus ? (
                <Text style={styles.statusDetailLine}>
                  <Text style={styles.statusDetailKey}>Operating / Closure Status: </Text>
                  {propStatus.operatingStatus}
                </Text>
              ) : null}
              {propStatus.renovationsExtensions ? (
                <Text style={styles.statusDetailLine}>
                  <Text style={styles.statusDetailKey}>Renovations &amp; Extensions: </Text>
                  {propStatus.renovationsExtensions}
                </Text>
              ) : null}
              <Text style={styles.statusDetailLine}>
                <Text style={styles.statusDetailKey}>Nearby Construction: </Text>
                {propStatus.nearbyConstruction || 'No confirmed nearby construction listed.'}
              </Text>
              {propStatus.sourceNote || propStatus.sourceUrl ? (
                <View style={styles.statusSourceRow}>
                  {propStatus.sourceNote ? (
                    <Text style={styles.statusSourceTxt}>
                      Source: {propStatus.sourceNote}
                      {propStatus.verifiedAt ? ` • Checked ${propStatus.verifiedAt.slice(0, 10)}` : ''}
                    </Text>
                  ) : null}
                  {propStatus.sourceUrl ? (
                    <Pressable onPress={() => openExternalUrl(propStatus.sourceUrl)}>
                      <Text style={styles.statusSourceLink}>View verified report ↗</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : (
            <Text style={styles.statusNeutralTxt}>
              No confirmed renovations, closures, or nearby works listed. StayOdds never invents renovation dates or construction notices.
            </Text>
          )}
        </View>

        {hotel.standout ? (
          <>
            <Text style={[styles.noteHead, { color: Colors.teal, marginTop: 12 }]}>{t("Standout Strengths")}</Text>
            <Text style={styles.noteText}>{hotel.standout}</Text>
          </>
        ) : null}
        {hotel.watchOut ? (
          <>
            <Text style={[styles.noteHead, { color: Colors.amber, marginTop: 10 }]}>{t("Watch-Outs Before Booking")}</Text>
            <Text style={styles.noteText}>{hotel.watchOut}</Text>
          </>
        ) : null}
      </View>

      {/* Weighting Card */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>TRANSPARENT WEIGHTING</Text>
        <Text style={styles.sectionTitle}>How This {BRAND.name} % Is Weighted</Text>
        <Text style={styles.sectionSub}>{o.equationSummary}</Text>

        <View style={styles.weightGrid}>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.firstHand}%</Text>
            <Text style={styles.weightLbl}>{t("My Stay")}</Text>
            <Text style={styles.weightVal}>
              {o.ours100 != null
                ? o.personalScoreLabel
                  ? `${o.personalScoreLabel.replace(/ /g, '')} → ${o.ours100}%`
                  : `${o.ours100}%`
                : 'Unscored'}
            </Text>
          </View>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.critics}%</Text>
            <Text style={styles.weightLbl}>{t("Published Critics")}</Text>
            <Text style={styles.weightVal}>
              {o.critic100 != null
                ? `${o.critic100}%`
                : o.unverifiedEditorial && o.unverifiedEditorial.length > 0
                ? 'Unverified'
                : '—'}
            </Text>
          </View>
          <View style={styles.weightBox}>
            <Text style={styles.weightPct}>{o.weights.guests}%</Text>
            <Text style={styles.weightLbl}>Google Guests</Text>
            <Text style={styles.weightVal}>
              {o.guest100 != null
                ? o.verifiedGuest
                  ? `${o.verifiedGuest.rating.toFixed(1)}${o.verifiedGuest.scale === 5 ? '★' : `/${o.verifiedGuest.scale}`} → ${o.guest100}%`
                  : `${o.guest100}%`
                : 'Live…'}
            </Text>
          </View>
        </View>
        {o.unverifiedEditorial && o.unverifiedEditorial.length > 0 ? (
          <View style={[styles.noticeBox, { marginTop: 10, backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
            <Text style={[styles.noticeTitle, { color: '#92400E' }]}>Score Verification Transparency</Text>
            <Text style={[styles.noticeText, { color: '#92400E' }]}>
              {o.unverifiedEditorial.map((u) => u.sourceName).join(', ')} awards a points/rating score in their linked review, but the exact figure could not be verified from published text or captions — marked “Score/points awarded — unable to verify exact figure” and excluded from numeric StayOdds calculations.
            </Text>
          </View>
        ) : null}
      </View>

      {/* First-Hand Uncharted Scorecard */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionEyebrow}>TIER 1 • MY STAY SCORECARD</Text>
        <Text style={styles.sectionTitle}>
          My Uncharted Scorecard{o.personalScoreLabel ? ` (${o.personalScoreLabel})` : ''}
        </Text>
        {o.firstHand && s ? (
          <View style={{ marginTop: 10, gap: 10 }}>
            {s.value != null ? (
              <ScoreBar label="Value" value={s.value} max={5} suffix=" / 5" color={Colors.accent} whole />
            ) : null}
            {s.rooms != null ? (
              <ScoreBar label="Room Quality" value={s.rooms} max={5} suffix=" / 5" color={Colors.accent} whole />
            ) : null}
            {s.grounds != null ? (
              <ScoreBar label="Vibe / Layout" value={s.grounds} max={5} suffix=" / 5" color={Colors.accent} whole />
            ) : null}
            {s.food != null ? (
              <ScoreBar label="Food" value={s.food} max={5} suffix=" / 5" color={Colors.accent} whole />
            ) : null}
            {s.service != null ? (
              <ScoreBar label="Service" value={s.service} max={5} suffix=" / 5" color={Colors.accent} whole />
            ) : null}
          </View>
        ) : (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>
              {o.visited
                ? hotel.coverageType === 'Short Tour'
                  ? 'Short Tour Preview (Unscored)'
                  : 'Filmed Stay Review (Qualitative Only)'
                : 'Global Directory — Not Stayed Yet'}
            </Text>
            <Text style={styles.noticeText}>
              {o.visited
                ? `${BRAND.foundingContributor} filmed this property qualitatively without assigning a numeric scorecard — we never invent scores after the fact.`
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
            {o.editorialRatings.map((item, idx) => {
              const unverified = isScoreUnverified(item);
              return (
                <Pressable
                  key={`${item.sourceName}-${idx}`}
                  style={styles.sourceRow}
                  onPress={() => openExternalUrl(item.sourceUrl)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sourceTitle}>{item.sourceName} ↗</Text>
                    {item.takeaway ? <Text style={styles.sourceBody}>{item.takeaway}</Text> : null}
                  </View>
                  <View style={[styles.sourceScorePill, unverified && { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.sourceScoreText, unverified && { color: '#92400E' }]}>
                      {unverified
                        ? 'Score awarded — unverified'
                        : item.normalized100 != null
                        ? item.rawScore || `${item.normalized100}/100`
                        : 'Review ↗'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
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
          {o.youtubeReviews.map((yt, idx) => {
            const unverified = isScoreUnverified(yt);
            return (
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
                {unverified ? (
                  <View style={[styles.sourceScorePill, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.sourceScoreText, { color: '#92400E' }]}>Unverified Score</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
          {!videoUrl && o.youtubeReviews.length === 0 ? (
            <Text style={styles.emptyNotice}>
              No YouTube video reviews linked yet. Creators are never attributed without a direct YouTube link.
            </Text>
          ) : null}
        </View>
      </View>

      {/* Pre-Loaded Head-to-Head Rival Matchups */}
      {(() => {
        const stop = new Set(['the', 'of', 'and', 'at', 'in', 'by', 'bay', 'beach', 'island', 'resort', 'city', 'north', 'south', 'east', 'west', 'new']);
        const locTokens = (x: Hotel) =>
          new Set(
            String(x.location || '')
              .split(/[,/&–—\-]+/)
              .flatMap((p) => {
                const trimmed = p.trim().toLowerCase();
                return [trimmed, ...trimmed.split(/\s+/)];
              })
              .filter((t) => t.length >= 4 && !stop.has(t))
          );
        const classifySetting = (x: Hotel) => {
          const hay = `${x.name} ${x.location} ${x.standout || ''} ${x.keyFacts?.beachOrReef || ''}`;
          if (/\b(safari|serengeti|masai mara|okavango|kruger|sabi|singita|tented camp|game reserve|bush|wilderness|gorilla|uluru|kangaroo island)\b/i.test(hay)) return 'safari';
          if (/\b(ski|courchevel|st\.?\s*moritz|gstaad|zermatt|verbier|alps|dolomites|aspen|vail|jackson hole|niseko|chamonix)\b/i.test(hay)) return 'alpine';
          const ln = `${x.name} ${x.location}`;
          if (/\b(tokyo|kyoto|osaka|london|paris|rome|milan|venice|florence|new york|manhattan|bangkok|singapore|hong kong|seoul|sydney|melbourne|dubai|doha|cairo|istanbul|barcelona|madrid|lisbon|zurich|vienna|amsterdam|cape town|auckland)\b/i.test(ln) && !/\b(beach resort|overwater|island resort|atoll)\b/i.test(ln)) return 'city';
          if (/\b(maldives|atoll|island|beach|overwater|lagoon|reef|bali|lombok|samui|phuket|krabi|bora bora|fiji|seychelles|mauritius|santorini|mykonos|amalfi|capri|sardinia|mallorca|bodrum|riviera maya|cabo|punta mita|anguilla|barth|turks|antigua|barbados|jamaica|bahamas|hawaii|maui)\b/i.test(hay)) return 'beach';
          if (/\b(cotswolds|somerset|wiltshire|countryside|estate|manor|tuscany|provence|winelands|napa|ryokan|hakone|yakushima|naoshima|scotland)\b/i.test(hay)) return 'countryside';
          return 'resort';
        };
        const parseGbp = (x: Hotel) => {
          const m = String(x.priceRange || '').match(/([\d,]{3,6})/);
          return m ? Number(m[1].replace(/,/g, '')) || null : null;
        };

        const baseLoc = locTokens(hotel);
        const baseSet = classifySetting(hotel);
        const baseGbp = parseGbp(hotel);
        const baseAi = /\ball[- ]inclusive\b/i.test(`${hotel.priceRange || ''} ${hotel.name}`);

        const pool = hotels.filter((r) => r.id !== hotel.id && r.country === hotel.country);
        const candidates =
          pool.length >= 3
            ? pool
            : [...pool, ...hotels.filter((r) => r.id !== hotel.id && r.region === hotel.region && r.country !== hotel.country)];

        const rivals = candidates
          .map((cand) => {
            let score = 0;
            const cLoc = locTokens(cand);
            const sameCountry = cand.country === hotel.country;
            let sharedLoc = false;
            cLoc.forEach((t) => { if (baseLoc.has(t)) sharedLoc = true; });
            if (sameCountry && sharedLoc) score += 48;
            else if (sameCountry) score += 18;
            else score += 5;

            const cSet = classifySetting(cand);
            if (cSet === baseSet) score += 24;
            else if ((baseSet === 'city' && cSet !== 'resort') || (cSet === 'city' && baseSet !== 'resort')) score -= 22;
            else if ((baseSet === 'safari' && cSet === 'beach') || (cSet === 'safari' && baseSet === 'beach')) score -= 16;

            const cAi = /\ball[- ]inclusive\b/i.test(`${cand.priceRange || ''} ${cand.name}`);
            if (cAi !== baseAi) score -= 12;

            const cGbp = parseGbp(cand);
            if (baseGbp && cGbp) {
              const ratio = Math.max(baseGbp, cGbp) / Math.min(baseGbp, cGbp);
              if (ratio <= 1.45) score += 22;
              else if (ratio <= 1.95) score += 12;
              else if (ratio <= 2.6) score += 2;
              else score -= 20;
            }

            const co = computeStayOdds(cand);
            if (o.greatStayOdds != null && co.greatStayOdds != null) {
              const diff = Math.abs(o.greatStayOdds - co.greatStayOdds);
              if (diff <= 6) score += 8;
              else if (diff <= 12) score += 4;
              score += 4;
            }
            if (co.firstHand) score += 7;
            else if (co.visited) score += 3;
            score += (co.greatStayOdds ?? 80) / 1000;
            return { cand, score };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map((x) => x.cand);
        if (!rivals.length) return null;
        return (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionEyebrow}>HEAD-TO-HEAD MATCHUPS</Text>
            <Text style={styles.sectionTitle}>Compare {hotel.name} vs. Top Rivals</Text>
            <View style={{ marginTop: 10, gap: 8 }}>
              {rivals.map((rv) => {
                const rvo = computeStayOdds(rv);
                return (
                  <Pressable
                    key={rv.id}
                    style={styles.sourceRow}
                    onPress={() => {
                      setCompareA(hotel.id);
                      setCompareB(rv.id);
                      setCompareC(null);
                      router.push('/compare');
                    }}
                  >
                    <Ionicons name="git-compare-outline" size={18} color={Colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sourceTitle} numberOfLines={1}>
                        vs {rv.name}
                      </Text>
                      <Text style={styles.sourceBody} numberOfLines={1}>
                        {rv.location}, {rv.country}
                        {rv.priceRange ? ` • ${rv.priceRange}` : ''}
                      </Text>
                    </View>
                    <View style={styles.sourceScorePill}>
                      <Text style={styles.sourceScoreText}>
                        {rvo.greatStayOdds != null ? `${rvo.greatStayOdds}%` : rvo.tierLabel} →
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {rivals.length >= 2 ? (
                <Pressable
                  style={[
                    styles.sourceRow,
                    { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', justifyContent: 'center' },
                  ]}
                  onPress={() => {
                    setCompareA(hotel.id);
                    setCompareB(rivals[0].id);
                    setCompareC(rivals[1].id);
                    router.push('/compare');
                  }}
                >
                  <Ionicons name="layers-outline" size={16} color={Colors.accent} />
                  <Text style={[styles.sourceTitle, { color: Colors.accent }]}>
                    Compare All 3 Side-by-Side →
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })()}
    </ScrollView>
    <ShareCardModal
      visible={showShareModal}
      onClose={() => setShowShareModal(false)}
      mode="single"
      hotel={hotel}
      odds={o}
    />
    </>
  );
}

const styles = StyleSheet.create({
  scoreCard: { marginTop: 14, padding: 16, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E7E2DA', gap: 12 },
  ring: { width: 84, height: 84, borderRadius: 42, borderWidth: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  ringBig: { fontSize: 21, fontWeight: '800', color: '#0F172A' },
  ringSmall: { fontSize: 9.5, color: '#64748B', marginTop: 1 },
  soVerdict: { flex: 1, fontSize: 15.5, fontWeight: '700', lineHeight: 21, color: '#0F172A' },
  gapRow: { flexDirection: 'row', gap: 8 },
  gapTile: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  gapBig: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  gapLbl: { fontSize: 11, color: '#64748B', marginTop: 2 },
  gapNote: { fontSize: 12.5, color: '#475569', lineHeight: 18 },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  soFactTile: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E7E2DA', padding: 12 },
  factKicker: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, color: '#64748B' },
  soFactValue: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  factNote: { fontSize: 11.5, color: '#64748B', marginTop: 2 },
  loveCard: { marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E7E2DA', borderTopWidth: 4, padding: 14 },
  loveTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  loveText: { fontSize: 13, lineHeight: 19, color: '#334155', marginTop: 4 },
  rankBox: { marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E3E8EF', backgroundColor: '#FFFBF8' },
  rankHeading: { fontSize: 16, fontWeight: '800', color: Colors.accent },
  rankSub: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 17 },
  rankTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  rankTrack: { height: 8, borderRadius: 99, backgroundColor: 'rgba(100,110,130,0.18)', marginTop: 10, marginBottom: 4 },
  rankDot: {
    position: 'absolute', top: -3, width: 14, height: 14, marginLeft: -7, borderRadius: 7,
    backgroundColor: Colors.accent, borderWidth: 2, borderColor: '#FFFFFF',
  },
  rankFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rankFootText: { fontSize: 11, color: '#64748B', flexShrink: 1 },
  altRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  altName: { fontSize: 13, fontWeight: '600', color: '#0F172A', flex: 1 },
  altMeta: { fontSize: 12, color: '#475569' },
  guestBreakdown: { fontSize: 11.5, color: '#64748B', marginTop: 6, marginBottom: 4, lineHeight: 16 },
  // the StayOdds breakdown sits on sand (the hero card stays white)
  scroll: { flex: 1, backgroundColor: Colors.sand },
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
  photoStrip: { gap: 6, paddingHorizontal: 8, paddingTop: 8 },
  photoStripImg: { width: 132, height: 88, borderRadius: 10, backgroundColor: Colors.sandBorder },
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
    backgroundColor: Colors.sandCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.sandBorder,
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
  detailsJump: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.sand,
    borderColor: Colors.sandBorder,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 2,
  },
  detailsJumpTitle: { fontSize: 14.5, fontWeight: '800', color: Colors.inkPrimary },
  detailsJumpSub: { fontSize: 12, color: Colors.inkSecondary, marginTop: 1 },
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

  explainerBox: {
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    backgroundColor: Colors.bgCanvas,
    overflow: 'hidden',
  },
  explainerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  explainerHeadText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.inkSecondary,
  },
  explainerBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    gap: 6,
  },
  explainerEq: {
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  explainerEqText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.inkPrimary,
    lineHeight: 17,
  },
  explainerBullet: {
    fontSize: 11.5,
    color: Colors.inkSecondary,
    lineHeight: 17,
  },
  explainerStrong: {
    fontWeight: '700',
    color: Colors.inkPrimary,
  },
  statusPanel: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgWhite,
    padding: 11,
  },
  statusPanelDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  statusPanelWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  statusPanelOpen: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  statusPanelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusPanelTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.inkPrimary,
  },
  statusBadgeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeTxt: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  statusDetailLine: {
    fontSize: 12.5,
    color: Colors.inkPrimary,
    lineHeight: 18,
  },
  statusDetailKey: {
    fontWeight: '800',
    color: Colors.inkSecondary,
  },
  statusNeutralTxt: {
    marginTop: 6,
    fontSize: 12.5,
    color: Colors.inkSecondary,
    lineHeight: 18,
  },
  statusSourceRow: {
    marginTop: 4,
    gap: 4,
  },
  statusSourceTxt: {
    fontSize: 11,
    color: Colors.inkMuted,
  },
  statusSourceLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    textDecorationLine: 'underline',
  },
});
