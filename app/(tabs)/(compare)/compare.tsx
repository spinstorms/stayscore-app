import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { buildCompareInsights, type CompareInsight } from '../../../lib/compareInsights';
import { loadGuestRanks } from '../../../lib/ranks';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ShareCardModal } from '../../../components/ShareCardModal';
import { getHotelVideoUrl, openExternalUrl } from '../../../lib/api';
import { BRAND } from '../../../lib/brand';
import {
  getBestMonths,
  getBrandCategories,
  getGuestProfile,
  getPartnerPrograms,
  getVerifiedRoomTip,
} from '../../../lib/insights';
import { formatPersonalScore, useAdaptiveLayout } from '../../../lib/layout';
import { formatCriticSlot, getPropertyStatusMeta } from '../../../lib/propertyStatus';
import { computeStayOdds, getTonePalette, getTripAdvisorUrl, isVisitedProperty } from '../../../lib/scoring';
import { buildStayOddsPick } from '../../../lib/pick';
import { useStayOdds } from '../../../lib/store';
import { Colors } from '../../../lib/theme';
import type { Hotel } from '../../../lib/types';

type PickerTarget = 'A' | 'B' | 'C' | null;

function matchesHotelQuery(h: Hotel, rawQuery: string): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const brands = getBrandCategories(h).allBrands.join(' ');
  const hay = `${h.name} ${h.location} ${h.country} ${h.brand || ''} ${brands} ${h.region || ''}`.toLowerCase();
  return q.split(/\s+/).every((tok) => hay.includes(tok));
}

export default function CompareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ a?: string; b?: string; c?: string }>();
  const {
    hotels,
    compareA,
    compareB,
    compareC,
    setCompareA,
    setCompareB,
    setCompareC,
    shortlist,
    refreshing,
    refresh,
  } = useStayOdds();
  const { isSplitScreen, horizontalPadding } = useAdaptiveLayout();
  // Measured width of the cards row. Cards get an explicit width when side by side, because on
  // Android a long unbroken line inside a card could stop flex from shrinking it and push the
  // second hotel off screen.
  const [gridWidth, setGridWidth] = useState(0);
  const [genInsights, setGenInsights] = useState<CompareInsight[] | null>(null);

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerScope, setPickerScope] = useState<'all' | 'visited' | 'global' | 'saved'>('all');
  const [inlineSearchA, setInlineSearchA] = useState('');
  const [inlineSearchB, setInlineSearchB] = useState('');
  const [inlineSearchC, setInlineSearchC] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Support shareable deep-links (?a=slug1&b=slug2&c=slug3)
  useEffect(() => {
    if (!hotels.length) return;
    const paramA = typeof params.a === 'string' ? params.a.trim() : '';
    const paramB = typeof params.b === 'string' ? params.b.trim() : '';
    const paramC = typeof params.c === 'string' ? params.c.trim() : '';
    if (paramA && hotels.some((h) => h.id === paramA) && paramA !== compareA) {
      setCompareA(paramA);
    }
    if (paramB && hotels.some((h) => h.id === paramB) && paramB !== compareB) {
      setCompareB(paramB);
    }
    if (paramC && hotels.some((h) => h.id === paramC) && paramC !== compareC) {
      setCompareC(paramC);
    }
  }, [params.a, params.b, params.c, hotels]);

  const hotelA = useMemo(
    () => hotels.find((h) => h.id === compareA) || hotels[0] || null,
    [hotels, compareA]
  );
  const hotelB = useMemo(
    () =>
      hotels.find((h) => h.id === compareB) ||
      hotels.find((h) => h.id !== hotelA?.id) ||
      hotels[1] ||
      null,
    [hotels, compareB, hotelA]
  );
  const hotelC = useMemo(
    () => (compareC ? hotels.find((h) => h.id === compareC) || null : null),
    [hotels, compareC]
  );
  const isThreeWay = Boolean(hotelC);
  // new hotels picked: clear the old insights
  useEffect(() => setGenInsights(null), [hotelA?.id, hotelB?.id, hotelC?.id]);

  const oddsA = useMemo(() => (hotelA ? computeStayOdds(hotelA) : null), [hotelA]);
  const oddsB = useMemo(() => (hotelB ? computeStayOdds(hotelB) : null), [hotelB]);
  const oddsC = useMemo(() => (hotelC ? computeStayOdds(hotelC) : null), [hotelC]);
  const pick = useMemo(() => {
    if (!hotelA || !hotelB || !oddsA || !oddsB) return null;
    const entries = [
      { hotel: hotelA, odds: oddsA },
      { hotel: hotelB, odds: oddsB },
    ];
    if (hotelC && oddsC) entries.push({ hotel: hotelC, odds: oddsC });
    return buildStayOddsPick(entries);
  }, [hotelA, hotelB, hotelC, oddsA, oddsB, oddsC]);

  const inlineMatchesA = useMemo(() => {
    if (!inlineSearchA.trim()) return [];
    return hotels.filter((h) => matchesHotelQuery(h, inlineSearchA)).slice(0, 6);
  }, [hotels, inlineSearchA]);

  const inlineMatchesB = useMemo(() => {
    if (!inlineSearchB.trim()) return [];
    return hotels.filter((h) => matchesHotelQuery(h, inlineSearchB)).slice(0, 6);
  }, [hotels, inlineSearchB]);

  const inlineMatchesC = useMemo(() => {
    if (!inlineSearchC.trim()) return [];
    return hotels.filter((h) => matchesHotelQuery(h, inlineSearchC)).slice(0, 6);
  }, [hotels, inlineSearchC]);

  const pickerList = useMemo(() => {
    // only build the full list when the picker is open
    if (!pickerTarget) return [];
    const savedSet = new Set(shortlist);
    return hotels
      .filter((h) => {
        if (pickerScope === 'visited' && !isVisitedProperty(h)) return false;
        if (pickerScope === 'global' && isVisitedProperty(h)) return false;
        if (pickerScope === 'saved' && !savedSet.has(h.id)) return false;
        return matchesHotelQuery(h, pickerQuery);
      })
      .sort((a, b) => {
        const oa = computeStayOdds(a);
        const ob = computeStayOdds(b);
        const av = oa.firstHand ? 2 : oa.visited ? 1 : 0;
        const bv = ob.firstHand ? 2 : ob.visited ? 1 : 0;
        if (bv !== av) return bv - av;
        return (ob.greatStayOdds ?? -1) - (oa.greatStayOdds ?? -1) || a.name.localeCompare(b.name);
      });
  }, [hotels, pickerQuery, pickerScope, shortlist, pickerTarget]);

  const handleToggleThreeWay = () => {
    if (compareC) {
      setCompareC(null);
      setInlineSearchC('');
      return;
    }
    const candidate =
      hotels.find((h) => h.id !== hotelA?.id && h.id !== hotelB?.id && isVisitedProperty(h)) ||
      hotels.find((h) => h.id !== hotelA?.id && h.id !== hotelB?.id);
    if (candidate) setCompareC(candidate.id);
  };

  const handleSwap = () => {
    if (!hotelA || !hotelB) return;
    const prevA = hotelA.id;
    setCompareA(hotelB.id);
    setCompareB(prevA);
  };

  const handleShareVsLink = async () => {
    if (!hotelA || !hotelB) return;
    const base = `https://stayodds.com/?a=${encodeURIComponent(
      hotelA.id
    )}&b=${encodeURIComponent(hotelB.id)}`;
    const shareUrl = hotelC ? `${base}&c=${encodeURIComponent(hotelC.id)}` : base;
    const vsTitle = hotelC
      ? `${hotelA.name} vs ${hotelB.name} vs ${hotelC.name}`
      : `${hotelA.name} vs ${hotelB.name}`;
    await Clipboard.setStringAsync(shareUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
    if (Platform.OS !== 'web') {
      try {
        await Share.share({
          title: `${vsTitle} — StayOdds`,
          message: `Compare ${vsTitle} on StayOdds: ${shareUrl}`,
          url: shareUrl,
        });
      } catch (_) {}
    }
  };

  const handleSelectHotel = (id: string) => {
    if (pickerTarget === 'A') setCompareA(id);
    else if (pickerTarget === 'B') setCompareB(id);
    else if (pickerTarget === 'C') setCompareC(id);
    setPickerTarget(null);
    setPickerQuery('');
  };

  const renderMetricRow = (
    label: string,
    valA: number | null | undefined,
    valB: number | null | undefined,
    displayA: string,
    displayB: string,
    side: 'A' | 'B' | 'C',
    valC?: number | null | undefined,
    displayC?: string
  ) => {
    const entries: { s: 'A' | 'B' | 'C'; v: number }[] = [
      { s: 'A', v: valA != null && !Number.isNaN(valA) ? valA : -1 },
      { s: 'B', v: valB != null && !Number.isNaN(valB) ? valB : -1 },
    ];
    if (isThreeWay) {
      entries.push({ s: 'C', v: valC != null && !Number.isNaN(valC) ? valC : -1 });
    }
    const valid = entries.filter((e) => e.v >= 0);
    const maxV = valid.length >= 2 ? Math.max(...valid.map((e) => e.v)) : -1;
    const topCount = valid.filter((e) => e.v === maxV).length;
    const curVal = entries.find((e) => e.s === side)?.v ?? -1;
    const wins = valid.length >= 2 && topCount === 1 && curVal === maxV;
    const display = side === 'A' ? displayA : side === 'B' ? displayB : displayC || '—';

    return (
      <View style={[styles.metricRow, wins && styles.metricRowWin]}>
        <Text style={styles.metricLabel}>{label}</Text>
        <View style={styles.metricValWrap}>
          {wins && <Ionicons name="star" size={12} color={Colors.emerald} />}
          <Text style={[styles.metricVal, wins && styles.metricValWin]}>{display}</Text>
        </View>
      </View>
    );
  };

  const renderSelectorBlock = (
    side: 'A' | 'B' | 'C',
    selected: Hotel | null,
    selectedOdds: ReturnType<typeof computeStayOdds> | null,
    query: string,
    setQuery: (v: string) => void,
    matches: Hotel[]
  ) => {
    const hasQuery = query.trim().length > 0;
    return (
      <View style={styles.selectorCard}>
        <Pressable style={styles.selectorTop} onPress={() => setPickerTarget(side)}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={[
                  styles.selectorTag,
                  side === 'B' && { color: '#38BDF8' },
                  side === 'C' && { color: '#C084FC' },
                ]}
              >
                HOTEL {side}
              </Text>
              {side === 'C' ? (
                <Pressable onPress={() => setCompareC(null)} hitSlop={8}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#FDA4AF' }}>✕ Remove</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.selectorName} numberOfLines={1}>
              {selected ? selected.name : `Select Hotel ${side}...`}
            </Text>
            <Text style={styles.selectorMeta} numberOfLines={1}>
              {selected && selectedOdds
                ? `${selected.location}, ${selected.country} · ${selectedOdds.tierLabel}`
                : 'Tap to browse all hotels'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#94A3B8" />
        </Pressable>

        {/* Fast Inline Search Input inside Selector */}
        <View style={styles.inlineSearchWrap}>
          <Ionicons name="search" size={14} color="#94A3B8" />
          <TextInput
            style={styles.inlineSearchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search Hotel ${side} (name, city, country, brand)...`}
            placeholderTextColor="#7C8594"
            returnKeyType="search"
          />
          {hasQuery ? (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityLabel={`Clear Hotel ${side} search`}
            >
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {hasQuery ? (
          matches.length > 0 ? (
            <View style={styles.inlineResultsList}>
              {matches.map((item) => {
                const isActive = item.id === selected?.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.inlineResultRow, isActive && styles.inlineResultRowActive]}
                    onPress={() => {
                      if (side === 'A') setCompareA(item.id);
                      else if (side === 'B') setCompareB(item.id);
                      else setCompareC(item.id);
                      setQuery('');
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inlineResultName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.inlineResultSub} numberOfLines={1}>
                        {item.location}, {item.country}
                        {item.brand ? ` · ${item.brand}` : ''}
                      </Text>
                    </View>
                    <Ionicons
                      name={isActive ? 'checkmark-circle' : 'add-circle-outline'}
                      size={17}
                      color={isActive ? Colors.teal : Colors.accent}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.inlineEmptyState}>
              <Text style={styles.inlineEmptyText}>
                No hotels matched &ldquo;{query.trim()}&rdquo;. Clear search or try a city, country, or brand.
              </Text>
            </View>
          )
        ) : null}
      </View>
    );
  };

  const renderHotelCard = (hotel: Hotel, side: 'A' | 'B' | 'C') => {
    const o = side === 'A' ? oddsA! : side === 'B' ? oddsB! : oddsC!;
    const palette = getTonePalette(o.statusTone);
    const videoUrl = getHotelVideoUrl(hotel);
    const st = getPropertyStatusMeta(hotel);
    const brandInfo = getBrandCategories(hotel);
    const partnerInfo = getPartnerPrograms(hotel);
    const bestMonths = getBestMonths(hotel);
    const guestProfile = getGuestProfile(hotel);
    const roomTip = getVerifiedRoomTip(hotel);

    const statusBg =
      st.tone === 'danger'
        ? '#FEF2F2'
        : st.tone === 'warn'
        ? '#FFFBEB'
        : st.tone === 'open'
        ? '#F0FDFA'
        : Colors.bgCanvas;
    const statusBorder =
      st.tone === 'danger'
        ? '#FCA5A5'
        : st.tone === 'warn'
        ? '#FCD34D'
        : st.tone === 'open'
        ? '#99F6E4'
        : Colors.borderSoft;
    const statusInk =
      st.tone === 'danger'
        ? '#991B1B'
        : st.tone === 'warn'
        ? '#92400E'
        : st.tone === 'open'
        ? '#0F766E'
        : Colors.inkSecondary;

    return (
      <View
        style={[
          styles.vsCard,
          isSplitScreen && !isThreeWay && styles.vsCardHalf,
          isSplitScreen && !isThreeWay && gridWidth > 0 ? { width: (gridWidth - 2 * horizontalPadding - 12) / 2 } : null,
        ]}
      >
        <View style={styles.cardHeroWrap}>
          <Image source={{ uri: hotel.thumbnail }} style={styles.cardHeroImg} resizeMode="cover" />
          <View style={styles.cardHeroTopBadges}>
            <View
              style={[
                styles.sidePill,
                side === 'A'
                  ? styles.sidePillA
                  : side === 'B'
                  ? styles.sidePillB
                  : { backgroundColor: '#7C3AED' },
              ]}
            >
              <Text style={styles.sidePillText}>HOTEL {side}</Text>
            </View>
            <View style={[styles.scopeBadge, o.firstHand ? styles.scopeVisited : styles.scopeGlobal]}>
              <Text style={styles.scopeBadgeText}>{o.tierLabel}</Text>
            </View>
          </View>
          <View style={[styles.scoreBadge, { borderColor: palette.ring }]}>
            <Text style={[styles.scoreBadgeNum, { color: palette.color }]}>
              {o.greatStayOdds != null ? `${o.greatStayOdds}%` : '—'}
            </Text>
            <Text style={styles.scoreBadgeSub}>{BRAND.name.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardBadgeRow}>
            <View style={[styles.consensusChip, { backgroundColor: palette.soft, borderColor: palette.border }]}>
              <Text style={[styles.consensusChipTxt, { color: palette.color }]}>{o.statusBadge}</Text>
            </View>
            <View style={styles.deltaChip}>
              <Text style={styles.deltaChipTxt}>Gap: {o.opinionGap.deltaLabel}</Text>
            </View>
            {guestProfile.badgeLabel ? (
              <View style={[styles.deltaChip, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Text style={[styles.deltaChipTxt, { color: '#0369A1' }]}>{guestProfile.badgeLabel}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.hotelName} numberOfLines={2}>
            {hotel.name}
          </Text>
          <Text style={styles.hotelLoc}>
            {hotel.location}, {hotel.country}
            {brandInfo.primaryBrand !== 'Independent & Boutique'
              ? ` · ${brandInfo.primaryBrand}${brandInfo.parentGroup ? ` (${brandInfo.parentGroup})` : ''}`
              : ''}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            <View style={[styles.deltaChip, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }]}>
              <Text style={[styles.deltaChipTxt, { color: '#0F766E' }]}>☀ {bestMonths.shortLabel}</Text>
            </View>
            {o.founderVsMarketLabel ? (
              <View style={[styles.deltaChip, { backgroundColor: '#FFF7ED', borderColor: '#FDBA74' }]}>
                <Text style={[styles.deltaChipTxt, { color: '#9A3412' }]}>{o.founderVsMarketLabel}</Text>
              </View>
            ) : null}
            {partnerInfo.preferredProgram ? (
              <View style={[styles.deltaChip, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                <Text style={[styles.deltaChipTxt, { color: '#C2410C' }]}>✨ {partnerInfo.preferredProgram}</Text>
              </View>
            ) : null}
          </View>

          {/* Property Status & Works Strip */}
          <View style={[styles.statusBox, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <View style={styles.statusBoxHead}>
              <Text style={[styles.statusBoxTitle, { color: statusInk }]}>PROPERTY STATUS &amp; WORKS</Text>
              <Text style={[styles.statusBoxBadge, { color: statusInk }]}>{st.badge}</Text>
            </View>
            <Text style={styles.statusBoxText}>{st.shortSummary}</Text>
            {st.sourceUrl ? (
              <Pressable onPress={() => openExternalUrl(st.sourceUrl)} style={{ marginTop: 4 }}>
                <Text style={styles.statusSourceLink}>Verified source ↗</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Opinion Gap Callout */}
          <View style={styles.opinionMiniBox}>
            <Text style={styles.opinionMiniTitle}>{o.opinionGap.title}</Text>
            <Text style={styles.opinionMiniText}>{o.opinionGap.headline}</Text>
          </View>

          <View style={styles.metricsBox}>
            {renderMetricRow(
              o.scoreTrack === 'verified' ? 'StayOdds (Uncharted Verified)' : o.scoreTrackLabel,
              oddsA?.greatStayOdds,
              oddsB?.greatStayOdds,
              oddsA?.greatStayOdds != null ? `${oddsA.greatStayOdds}%` : 'Live',
              oddsB?.greatStayOdds != null ? `${oddsB.greatStayOdds}%` : 'Live',
              side,
              oddsC?.greatStayOdds,
              oddsC?.greatStayOdds != null ? `${oddsC.greatStayOdds}%` : 'Live'
            )}
            {renderMetricRow(
              'My Stay',
              oddsA?.firstHand ? oddsA.ours100 : null,
              oddsB?.firstHand ? oddsB.ours100 : null,
              oddsA?.personalScoreLabel || (oddsA?.visited ? 'Filmed (Unscored)' : 'Not Visited'),
              oddsB?.personalScoreLabel || (oddsB?.visited ? 'Filmed (Unscored)' : 'Not Visited'),
              side,
              oddsC?.firstHand ? oddsC.ours100 : null,
              oddsC?.personalScoreLabel || (oddsC?.visited ? 'Filmed (Unscored)' : 'Not Visited')
            )}
            {renderMetricRow(
              'Guest & Critic Consensus',
              oddsA?.marketOdds,
              oddsB?.marketOdds,
              oddsA?.marketOdds != null ? `${oddsA.marketOdds}%` : '—',
              oddsB?.marketOdds != null ? `${oddsB.marketOdds}%` : '—',
              side,
              oddsC?.marketOdds,
              oddsC?.marketOdds != null ? `${oddsC.marketOdds}%` : '—'
            )}
            {renderMetricRow(
              'Critics / Other Reviews',
              oddsA?.critic100,
              oddsB?.critic100,
              oddsA ? formatCriticSlot(oddsA).full : 'None listed',
              oddsB ? formatCriticSlot(oddsB).full : 'None listed',
              side,
              oddsC?.critic100,
              oddsC ? formatCriticSlot(oddsC).full : 'None listed'
            )}
            {renderMetricRow(
              'Guest Reviews',
              oddsA?.guest100,
              oddsB?.guest100,
              oddsA?.verifiedGuest
                ? `${oddsA.verifiedGuest.rating.toFixed(1)} / ${oddsA.verifiedGuest.scale}`
                : 'Live Google',
              oddsB?.verifiedGuest
                ? `${oddsB.verifiedGuest.rating.toFixed(1)} / ${oddsB.verifiedGuest.scale}`
                : 'Live Google',
              side,
              oddsC?.guest100,
              oddsC?.verifiedGuest
                ? `${oddsC.verifiedGuest.rating.toFixed(1)} / ${oddsC.verifiedGuest.scale}`
                : 'Live Google'
            )}
            {(oddsA?.firstHand || oddsB?.firstHand || (isThreeWay && oddsC?.firstHand)) ? (
              <>
                {renderMetricRow(
                  'Rooms & Villas',
                  oddsA?.firstHand ? hotelA?.scores?.rooms : null,
                  oddsB?.firstHand ? hotelB?.scores?.rooms : null,
                  oddsA?.firstHand && hotelA?.scores?.rooms != null ? `${formatPersonalScore(hotelA.scores.rooms)} / 5` : '—',
                  oddsB?.firstHand && hotelB?.scores?.rooms != null ? `${formatPersonalScore(hotelB.scores.rooms)} / 5` : '—',
                  side,
                  oddsC?.firstHand ? hotelC?.scores?.rooms : null,
                  oddsC?.firstHand && hotelC?.scores?.rooms != null ? `${formatPersonalScore(hotelC.scores.rooms)} / 5` : '—'
                )}
                {renderMetricRow(
                  'Service',
                  oddsA?.firstHand ? hotelA?.scores?.service : null,
                  oddsB?.firstHand ? hotelB?.scores?.service : null,
                  oddsA?.firstHand && hotelA?.scores?.service != null ? `${formatPersonalScore(hotelA.scores.service)} / 5` : '—',
                  oddsB?.firstHand && hotelB?.scores?.service != null ? `${formatPersonalScore(hotelB.scores.service)} / 5` : '—',
                  side,
                  oddsC?.firstHand ? hotelC?.scores?.service : null,
                  oddsC?.firstHand && hotelC?.scores?.service != null ? `${formatPersonalScore(hotelC.scores.service)} / 5` : '—'
                )}
                {renderMetricRow(
                  'Value for Money',
                  oddsA?.firstHand ? hotelA?.scores?.value : null,
                  oddsB?.firstHand ? hotelB?.scores?.value : null,
                  oddsA?.firstHand && hotelA?.scores?.value != null ? `${formatPersonalScore(hotelA.scores.value)} / 5` : '—',
                  oddsB?.firstHand && hotelB?.scores?.value != null ? `${formatPersonalScore(hotelB.scores.value)} / 5` : '—',
                  side,
                  oddsC?.firstHand ? hotelC?.scores?.value : null,
                  oddsC?.firstHand && hotelC?.scores?.value != null ? `${formatPersonalScore(hotelC.scores.value)} / 5` : '—'
                )}
              </>
            ) : null}
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Best Dry Months</Text>
              <Text style={styles.metricVal}>☀ {bestMonths.shortLabel}</Text>
            </View>
            {hotel.priceRange ? (
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Indicative Price Tier</Text>
                <Text style={styles.metricVal}>{hotel.priceRange}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>How StayOdds % Is Calculated</Text>
            <Text style={styles.noteBody}>{o.equationSummary}</Text>
            {roomTip ? (
              <>
                <Text style={[styles.noteTitle, { marginTop: 8, color: '#C2410C' }]}>🛏️ First-Hand Room Tip</Text>
                <Text style={styles.noteBody}>{roomTip}</Text>
              </>
            ) : null}
            {o.keyFacts.length > 0 ? (
              <View style={{ marginTop: 8, gap: 4 }}>
                <Text style={[styles.noteTitle, { color: Colors.inkSecondary }]}>Verified Key Facts</Text>
                {o.keyFacts.slice(0, 3).map((kf) => (
                  <Text key={kf.label} style={styles.noteBody}>
                    <Text style={{ fontWeight: '700' }}>{kf.label}: </Text>
                    {kf.value}
                  </Text>
                ))}
              </View>
            ) : null}
            {hotel.watchOut ? (
              <>
                <Text style={[styles.noteTitle, { marginTop: 8, color: Colors.amber }]}>Watch-Out</Text>
                <Text style={styles.noteBody}>{hotel.watchOut}</Text>
              </>
            ) : null}
          </View>

          <View style={styles.ctaRow}>
            {hotel.bookingUrl ? (
              <Pressable
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={() => openExternalUrl(hotel.bookingUrl)}
              >
                <Ionicons name="bed-outline" size={15} color={Colors.accentInk} />
                <Text style={styles.btnPrimaryText}>Check Live Rates</Text>
              </Pressable>
            ) : null}
            {videoUrl ? (
              <Pressable style={styles.btnDark} onPress={() => openExternalUrl(videoUrl)}>
                <Ionicons name="logo-youtube" size={15} color="#FFFFFF" />
                <Text style={styles.btnDarkText}>Watch</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            style={styles.btnOutline}
            onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: hotel.id } })}
          >
            <Text style={styles.btnOutlineText}>Open Full Breakdown</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
          </Pressable>

          <Pressable
            onPress={() => openExternalUrl(getTripAdvisorUrl(hotel))}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              marginTop: 8,
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: Colors.border,
              backgroundColor: Colors.bgWhite,
            }}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: Colors.inkMuted }}>TripAdvisor</Text>
            <Ionicons name="open-outline" size={11.5} color={Colors.inkMuted} />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 36 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        <View style={[styles.arenaHeader, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.arenaTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.arenaEyebrow}>HEAD-TO-HEAD {BRAND.name.toUpperCase()} ARENA</Text>
              <Text style={styles.arenaTitle}>
                {isThreeWay ? 'Compare 3 Luxury Stays' : 'Compare Any 2 Luxury Stays'}
              </Text>
              <Text style={styles.arenaSub}>
                Zero guessed numbers — green ★ highlights verified winners across {hotels.length} luxury stays.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                style={styles.shareCardBtn}
                onPress={() => setShowShareModal(true)}
                accessibilityLabel="Open branded VS Scorecard share modal"
              >
                <Ionicons name="image-outline" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={[
                  styles.swapBtn,
                  copiedLink && { backgroundColor: Colors.teal, borderColor: Colors.teal },
                ]}
                onPress={handleShareVsLink}
                accessibilityLabel="Copy shareable Head-to-Head comparison link"
              >
                <Ionicons name={copiedLink ? 'checkmark' : 'link-outline'} size={19} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.swapBtn} onPress={handleSwap} accessibilityLabel="Swap hotels">
                <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <Pressable
              style={[
                styles.shareBannerBtn,
                { flex: 1, marginBottom: 0, justifyContent: 'center' },
                isThreeWay && { backgroundColor: 'rgba(124, 58, 237, 0.25)', borderColor: '#C084FC' },
              ]}
              onPress={handleToggleThreeWay}
            >
              <Ionicons
                name={isThreeWay ? 'remove-circle-outline' : 'add-circle-outline'}
                size={15}
                color={isThreeWay ? '#E9D5FF' : '#38BDF8'}
              />
              <Text style={[styles.shareBannerTxt, { color: isThreeWay ? '#E9D5FF' : '#BAE6FD' }]}>
                {isThreeWay ? 'Back to 2 Hotels' : '+ Compare 3rd Hotel'}
              </Text>
            </Pressable>
          </View>

          {hotelA && hotelB ? (
            <Pressable style={styles.shareBannerBtn} onPress={() => setShowShareModal(true)}>
              <Ionicons name="sparkles-outline" size={15} color="#FF8B5E" />
              <Text style={styles.shareBannerTxt}>
                {isThreeWay
                  ? 'Share 3-Hotel Branded Card (Clean Photos + QR)'
                  : 'Share Branded VS Card (1:1 Feed & 9:16 Story + QR)'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FF8B5E" />
            </Pressable>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7, paddingBottom: 10 }}
          >
            {[
              { label: 'FS Jimbaran vs St. Regis Bali', a: 'four-seasons-jimbaran', b: 'st-regis-bali' },
              { label: 'W Maldives vs Soneva Jani', a: 'w-maldives', b: 'soneva-jani' },
              { label: "The Sira vs TA'AKTANA", a: 'the-sira-lombok', b: 'taaktana-labuan-bajo' },
              { label: 'Capella Bangkok vs Aman Tokyo', a: 'capella-bangkok', b: 'aman-tokyo' },
              { label: 'Amanzoe vs FS Astir Palace', a: 'amanzoe', b: 'four-seasons-astir-palace-athens' },
            ].map((m) => (
              <Pressable
                key={m.label}
                onPress={() => {
                  if (hotels.some((x) => x.id === m.a) && hotels.some((x) => x.id === m.b)) {
                    setCompareA(m.a);
                    setCompareB(m.b);
                    setCompareC(null);
                  }
                }}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <Text style={{ color: '#F8FAFC', fontSize: 11.5, fontWeight: '600' }}>{m.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {copiedLink ? (
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: Colors.teal,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' }}>
                ✓ Shareable VS link copied!
              </Text>
            </View>
          ) : null}

          <View style={[styles.selectorRow, (!isSplitScreen || isThreeWay) && styles.selectorCol]}>
            {renderSelectorBlock('A', hotelA, oddsA, inlineSearchA, setInlineSearchA, inlineMatchesA)}
            {renderSelectorBlock('B', hotelB, oddsB, inlineSearchB, setInlineSearchB, inlineMatchesB)}
            {isThreeWay
              ? renderSelectorBlock('C', hotelC, oddsC, inlineSearchC, setInlineSearchC, inlineMatchesC)
              : null}
          </View>
        </View>

        {pick ? (
          <View style={[styles.pickBox, { marginHorizontal: horizontalPadding }]}>
            <Text style={styles.pickEyebrow}>WHICH SHOULD YOU CHOOSE?</Text>
            <Text style={styles.pickTitle}>{pick.title}</Text>
            {pick.why.map((t) => (
              <Text key={t} style={styles.pickLine}>
                • {t}
              </Text>
            ))}
            {pick.consider.map((t) => (
              <Text key={t} style={[styles.pickLine, styles.pickConsider]}>
                • {t}
              </Text>
            ))}
            <Text style={styles.pickFoot}>Worked out from the scores, review counts and awards below. Nothing is estimated.</Text>
          </View>
        ) : null}

        {hotelA && hotelB ? (
          <View style={[styles.genWrap, { marginHorizontal: horizontalPadding }]}>
            {genInsights ? (
              <View style={styles.genCard}>
                <View style={styles.genHead}>
                  <Text style={styles.pickEyebrow}>INSIGHTS FOR THESE {isThreeWay && hotelC ? '3' : '2'} HOTELS</Text>
                  <Pressable onPress={() => setGenInsights(null)} hitSlop={8}>
                    <Ionicons name="close" size={18} color={Colors.inkMuted} />
                  </Pressable>
                </View>
                {genInsights.map((g) => (
                  <View key={g.title} style={styles.genRow}>
                    <Text style={styles.genIcon}>{g.icon}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.genTitle}>{g.title}</Text>
                      <Text style={styles.genText}>{g.text}</Text>
                    </View>
                  </View>
                ))}
                <Text style={styles.pickFoot}>Worked out from the guest reviews, critics, our stays, awards, prices and seasons on StayOdds. Nothing is estimated.</Text>
              </View>
            ) : (
              <Pressable
                style={styles.genBtn}
                accessibilityRole="button"
                onPress={async () => {
                  const r = await loadGuestRanks();
                  setGenInsights(
                    buildCompareInsights([hotelA, hotelB, ...(isThreeWay && hotelC ? [hotelC] : [])], {
                      ranks: r?.ranks,
                      extras: r?.extras,
                    })
                  );
                }}
              >
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                <Text style={styles.genBtnText}>Generate insights for these hotels</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        {hotelA && hotelB && oddsA && oddsB ? (
          <View
            onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
            style={[
              styles.vsGrid,
              isSplitScreen && !isThreeWay ? styles.vsGridRow : styles.vsGridCol,
              { paddingHorizontal: horizontalPadding },
            ]}
          >
            {renderHotelCard(hotelA, 'A')}
            {renderHotelCard(hotelB, 'B')}
            {isThreeWay && hotelC && oddsC ? renderHotelCard(hotelC, 'C') : null}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Loading luxury stays...</Text>
          </View>
        )}
      </ScrollView>

      {hotelA && hotelB && oddsA && oddsB ? (
        <ShareCardModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          mode="vs"
          hotelA={hotelA}
          hotelB={hotelB}
          oddsA={oddsA}
          oddsB={oddsB}
          hotelC={hotelC}
          oddsC={oddsC}
        />
      ) : null}

      <Modal
        visible={pickerTarget !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerTarget(null)}
      >
        <View style={styles.modalWrap}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Choose Hotel {pickerTarget} ({pickerList.length})
            </Text>
            <Pressable onPress={() => setPickerTarget(null)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={Colors.inkPrimary} />
            </Pressable>
          </View>

          <View style={styles.modalSearchRow}>
            <Ionicons name="search" size={16} color={Colors.inkMuted} />
            <TextInput
              style={styles.modalInput}
              value={pickerQuery}
              onChangeText={setPickerQuery}
              placeholder="Search hotel, city, country, or brand..."
              placeholderTextColor={Colors.inkMuted}
              autoFocus
            />
            {pickerQuery ? (
              <Pressable onPress={() => setPickerQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.inkMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.modalScopeRow}>
            {(
              [
                ['all', 'All'],
                ['visited', 'First-Hand'],
                ['global', 'Global'],
                ['saved', `♥ Saved (${shortlist.length})`],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                style={[styles.scopeChip, pickerScope === key && styles.scopeChipActive]}
                onPress={() => setPickerScope(key)}
              >
                <Text style={[styles.scopeChipText, pickerScope === key && styles.scopeChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <FlatList
            data={pickerList}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No hotels matched &ldquo;{pickerQuery.trim()}&rdquo;. Try clearing your search or switching tabs.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const o = computeStayOdds(item);
              const isSelected =
                (pickerTarget === 'A' && item.id === hotelA?.id) ||
                (pickerTarget === 'B' && item.id === hotelB?.id);
              return (
                <Pressable
                  style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                  onPress={() => handleSelectHotel(item.id)}
                >
                  <Image source={{ uri: item.thumbnail }} style={styles.pickerThumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.pickerLoc} numberOfLines={1}>
                      {item.location}, {item.country} · {o.tierLabel}
                    </Text>
                  </View>
                  <View style={styles.pickerScorePill}>
                    <Text style={styles.pickerScoreText}>
                      {o.greatStayOdds != null ? `${o.greatStayOdds}%` : '—'}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pickBox: { marginTop: 4, marginBottom: 14, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderTopWidth: 4, borderTopColor: '#FF5D22' },
  pickEyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6, color: '#FF5D22', marginBottom: 4 },
  pickTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  pickLine: { fontSize: 13.5, lineHeight: 20, color: '#334155', marginBottom: 4 },
  pickConsider: { color: '#64748B' },
  pickFoot: { fontSize: 11.5, color: '#94A3B8', marginTop: 6 },
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  arenaHeader: {
    backgroundColor: Colors.charcoal,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2E323A',
  },
  arenaTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  arenaEyebrow: { fontSize: 10.5, fontWeight: '800', color: Colors.accent, letterSpacing: 0.9 },
  arenaTitle: { fontSize: 21, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  arenaSub: { fontSize: 12.5, color: '#C5C9D1', marginTop: 4, lineHeight: 18 },
  shareCardBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 93, 34, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 93, 34, 0.45)',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  shareBannerTxt: { color: '#FFD6C4', fontSize: 12.5, fontWeight: '700' },

  selectorRow: { flexDirection: 'row', gap: 10 },
  selectorCol: { flexDirection: 'column' },
  selectorCard: {
    flex: 1,
    backgroundColor: Colors.charcoalCard,
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: '#373B44',
    gap: 8,
  },
  selectorTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorTag: { fontSize: 10, fontWeight: '800', color: Colors.accent, letterSpacing: 0.7 },
  selectorName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  selectorMeta: { fontSize: 11.5, color: '#A5AAB4', marginTop: 2 },

  inlineSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  inlineSearchInput: { flex: 1, color: '#FFFFFF', fontSize: 13, paddingVertical: 0 },
  inlineResultsList: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  inlineResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.14)',
  },
  inlineResultRowActive: { backgroundColor: 'rgba(20,184,166,0.12)' },
  inlineResultName: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  inlineResultSub: { color: '#94A3B8', fontSize: 11, marginTop: 1 },
  inlineEmptyState: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.45)',
    borderRadius: 10,
    padding: 9,
  },
  inlineEmptyText: { color: '#FDE68A', fontSize: 12, lineHeight: 16 },

  vsGrid: { paddingTop: 16, gap: 16 },
  genWrap: { marginTop: 14 },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  genBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14.5 },
  genCard: { backgroundColor: Colors.bgWhite, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, padding: 16, gap: 12 },
  genHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  genRow: { flexDirection: 'row', gap: 10 },
  genIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  genTitle: { fontSize: 14.5, fontWeight: '800', color: Colors.inkPrimary },
  genText: { fontSize: 13.5, color: Colors.inkSecondary, lineHeight: 19, marginTop: 2 },
  vsGridRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  vsGridCol: { flexDirection: 'column' },

  vsCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  vsCardHalf: { flexGrow: 0, flexShrink: 1, minWidth: 0 },
  cardHeroWrap: { position: 'relative', height: 180, backgroundColor: Colors.charcoal },
  cardHeroImg: { width: '100%', height: '100%' },
  cardHeroTopBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sidePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  sidePillA: { backgroundColor: Colors.accent },
  sidePillB: { backgroundColor: Colors.teal },
  sidePillText: { fontSize: 10.5, fontWeight: '800', color: Colors.accentInk, letterSpacing: 0.5 },
  scopeBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  scopeVisited: { backgroundColor: 'rgba(15, 118, 110, 0.92)' },
  scopeGlobal: { backgroundColor: 'rgba(11, 14, 20, 0.84)' },
  scopeBadgeText: { fontSize: 10.5, fontWeight: '700', color: '#FFFFFF' },
  scoreBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 16,
    borderWidth: 3,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignItems: 'center',
  },
  scoreBadgeNum: { fontSize: 19, fontWeight: '900', lineHeight: 21 },
  scoreBadgeSub: { fontSize: 8.5, fontWeight: '800', color: Colors.inkMuted, letterSpacing: 0.5 },

  cardBody: { padding: 14 },
  cardBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  consensusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  consensusChipTxt: { fontSize: 10.5, fontWeight: '800' },
  deltaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.navy,
  },
  deltaChipTxt: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF' },

  hotelName: { fontSize: 18, fontWeight: '800', color: Colors.inkPrimary },
  hotelLoc: { fontSize: 12.5, color: Colors.inkSecondary, marginTop: 2 },

  statusBox: {
    marginTop: 10,
    borderRadius: 11,
    borderWidth: 1,
    padding: 10,
  },
  statusBoxHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusBoxTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusBoxBadge: { fontSize: 10.5, fontWeight: '800' },
  statusBoxText: { fontSize: 12, color: Colors.inkPrimary, lineHeight: 17 },
  statusSourceLink: { fontSize: 11.5, fontWeight: '700', color: Colors.accent, textDecorationLine: 'underline' },

  opinionMiniBox: {
    marginTop: 10,
    backgroundColor: Colors.bgCanvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    padding: 9,
  },
  opinionMiniTitle: { fontSize: 10.5, fontWeight: '800', color: Colors.teal, textTransform: 'uppercase' },
  opinionMiniText: { fontSize: 12, color: Colors.inkPrimary, marginTop: 2, lineHeight: 17 },

  metricsBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    overflow: 'hidden',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
    backgroundColor: Colors.bgWhite,
  },
  metricRowWin: { backgroundColor: Colors.emeraldSoft },
  metricLabel: { fontSize: 12.5, color: Colors.inkSecondary, fontWeight: '600' },
  metricValWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricVal: { fontSize: 13, fontWeight: '800', color: Colors.inkPrimary },
  metricValWin: { color: Colors.emerald },

  noteBox: {
    marginTop: 12,
    backgroundColor: Colors.bgWarm,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteTitle: { fontSize: 11, fontWeight: '800', color: Colors.teal, textTransform: 'uppercase' },
  noteBody: { fontSize: 12.5, color: Colors.inkPrimary, marginTop: 2, lineHeight: 18 },

  ctaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 11,
    borderRadius: 999,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  btnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  btnDarkText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  btnOutline: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    backgroundColor: Colors.accentSoft,
    paddingVertical: 10,
    borderRadius: 999,
  },
  btnOutlineText: { color: Colors.accentDark, fontSize: 13, fontWeight: '700' },

  emptyBox: { padding: 36, alignItems: 'center' },
  emptyText: { color: Colors.inkMuted, fontSize: 14, textAlign: 'center' },

  modalWrap: { flex: 1, backgroundColor: Colors.bgCanvas, paddingTop: 14 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.inkPrimary },
  modalClose: { padding: 4 },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },
  modalScopeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  scopeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  scopeChipText: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary },
  scopeChipTextActive: { color: Colors.accentInk },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSoft,
  },
  pickerItemSelected: { backgroundColor: Colors.accentSoft },
  pickerThumb: { width: 52, height: 42, borderRadius: 8, backgroundColor: Colors.bgCanvas },
  pickerName: { fontSize: 14.5, fontWeight: '700', color: Colors.inkPrimary },
  pickerLoc: { fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  pickerScorePill: {
    backgroundColor: Colors.charcoal,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pickerScoreText: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' },
});
