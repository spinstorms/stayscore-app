import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getHotelVideoUrl, openExternalUrl } from '../../lib/api';
import { formatPersonalScore, isRatedHotel, isVisitedHotel, useAdaptiveLayout } from '../../lib/layout';
import { useStayScore } from '../../lib/store';
import { Colors, getVerdictPalette } from '../../lib/theme';
import type { Hotel } from '../../lib/types';

type PickerTarget = 'A' | 'B' | null;

export default function CompareScreen() {
  const router = useRouter();
  const { hotels, compareA, compareB, setCompareA, setCompareB, refreshing, refresh } = useStayScore();
  const { isSplitScreen, horizontalPadding } = useAdaptiveLayout();

  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerScope, setPickerScope] = useState<'all' | 'visited' | 'global'>('all');

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

  const pickerList = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return hotels
      .filter((h) => {
        if (pickerScope === 'visited' && !isVisitedHotel(h)) return false;
        if (pickerScope === 'global' && isVisitedHotel(h)) return false;
        if (!q) return true;
        return (
          h.name.toLowerCase().includes(q) ||
          h.location.toLowerCase().includes(q) ||
          h.country.toLowerCase().includes(q) ||
          h.region.toLowerCase().includes(q) ||
          (h.brand || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const av = isVisitedHotel(a) ? 0 : 1;
        const bv = isVisitedHotel(b) ? 0 : 1;
        if (av !== bv) return av - bv;
        return (b.consensus?.overallIndex || 0) - (a.consensus?.overallIndex || 0);
      });
  }, [hotels, pickerQuery, pickerScope]);

  const handleSwap = () => {
    if (!hotelA || !hotelB) return;
    const prevA = hotelA.id;
    setCompareA(hotelB.id);
    setCompareB(prevA);
  };

  const handleSelectHotel = (id: string) => {
    if (pickerTarget === 'A') {
      setCompareA(id);
    } else if (pickerTarget === 'B') {
      setCompareB(id);
    }
    setPickerTarget(null);
    setPickerQuery('');
  };

  const renderMetricRow = (
    label: string,
    valA: number | null | undefined,
    valB: number | null | undefined,
    displayA: string,
    displayB: string,
    side: 'A' | 'B'
  ) => {
    const numA = valA != null && !Number.isNaN(valA) ? valA : -1;
    const numB = valB != null && !Number.isNaN(valB) ? valB : -1;
    const wins =
      side === 'A' ? numA >= 0 && numB >= 0 && numA > numB : numA >= 0 && numB >= 0 && numB > numA;
    const display = side === 'A' ? displayA : displayB;

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

  const renderHotelCard = (hotel: Hotel, other: Hotel | null, side: 'A' | 'B') => {
    const rated = isRatedHotel(hotel);
    const visited = isVisitedHotel(hotel);
    const palette = getVerdictPalette(hotel.consensus?.agreement, rated);
    const videoUrl = getHotelVideoUrl(hotel);

    return (
      <View style={[styles.vsCard, isSplitScreen && styles.vsCardHalf]}>
        <View style={styles.cardHeroWrap}>
          <Image source={{ uri: hotel.thumbnail }} style={styles.cardHeroImg} resizeMode="cover" />
          <View style={styles.cardHeroTopBadges}>
            <View style={[styles.sidePill, side === 'A' ? styles.sidePillA : styles.sidePillB]}>
              <Text style={styles.sidePillText}>HOTEL {side}</Text>
            </View>
            <View style={[styles.scopeBadge, visited ? styles.scopeVisited : styles.scopeGlobal]}>
              <Text style={styles.scopeBadgeText}>
                {visited ? hotel.coverageType : 'Global Directory'}
              </Text>
            </View>
          </View>
          <View style={[styles.scoreBadge, { borderColor: palette.ring }]}>
            <Text style={[styles.scoreBadgeNum, { color: palette.color }]}>
              {hotel.consensus?.overallIndex ?? '—'}
            </Text>
            <Text style={styles.scoreBadgeSub}>STAYSCORE</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.hotelName} numberOfLines={2}>
            {hotel.name}
          </Text>
          <Text style={styles.hotelLoc}>
            {hotel.location} · {hotel.priceRange || '$$$$'}
          </Text>
          {hotel.consensus?.award ? (
            <View style={styles.awardPill}>
              <Ionicons name="ribbon" size={12} color={Colors.amber} />
              <Text style={styles.awardText} numberOfLines={1}>
                {hotel.consensus.award}
              </Text>
            </View>
          ) : null}

          <View style={styles.metricsBox}>
            {renderMetricRow(
              'StayScore Index',
              hotelA?.consensus?.overallIndex,
              hotelB?.consensus?.overallIndex,
              `${hotelA?.consensus?.overallIndex ?? '—'} / 100`,
              `${hotelB?.consensus?.overallIndex ?? '—'} / 100`,
              side
            )}
            {renderMetricRow(
              'Great Stay Probability',
              hotelA?.consensus?.greatStayChance,
              hotelB?.consensus?.greatStayChance,
              `${hotelA?.consensus?.greatStayChance ?? '—'}%`,
              `${hotelB?.consensus?.greatStayChance ?? '—'}%`,
              side
            )}
            {renderMetricRow(
              'Booking.com Score',
              hotelA?.consensus?.bookingOverall,
              hotelB?.consensus?.bookingOverall,
              hotelA?.consensus?.bookingOverall ? `${hotelA.consensus.bookingOverall.toFixed(1)} / 10` : '—',
              hotelB?.consensus?.bookingOverall ? `${hotelB.consensus.bookingOverall.toFixed(1)} / 10` : '—',
              side
            )}
            {renderMetricRow(
              'Google Rating',
              hotelA?.consensus?.googleRating,
              hotelB?.consensus?.googleRating,
              hotelA?.consensus?.googleRating ? `${hotelA.consensus.googleRating.toFixed(1)} ★` : '—',
              hotelB?.consensus?.googleRating ? `${hotelB.consensus.googleRating.toFixed(1)} ★` : '—',
              side
            )}
            {renderMetricRow(
              'Critic & YouTube',
              hotelA?.consensus?.criticScore,
              hotelB?.consensus?.criticScore,
              hotelA?.consensus?.criticScore ? `${hotelA.consensus.criticScore.toFixed(1)} / 5` : '—',
              hotelB?.consensus?.criticScore ? `${hotelB.consensus.criticScore.toFixed(1)} / 5` : '—',
              side
            )}
            {renderMetricRow(
              'Our Personal Score',
              hotelA && isRatedHotel(hotelA) ? hotelA.overall : null,
              hotelB && isRatedHotel(hotelB) ? hotelB.overall : null,
              hotelA && isRatedHotel(hotelA) ? `${formatPersonalScore(hotelA.overall)} / 5` : 'External Only',
              hotelB && isRatedHotel(hotelB) ? `${formatPersonalScore(hotelB.overall)} / 5` : 'External Only',
              side
            )}
          </View>

          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Standout</Text>
            <Text style={styles.noteBody}>{hotel.standout}</Text>
            <Text style={[styles.noteTitle, { marginTop: 8, color: Colors.amber }]}>Watch-Out</Text>
            <Text style={styles.noteBody}>{hotel.watchOut}</Text>
          </View>

          <View style={styles.ctaRow}>
            {hotel.bookingUrl ? (
              <Pressable
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={() => openExternalUrl(hotel.bookingUrl)}
              >
                <Ionicons name="bed-outline" size={15} color="#FFFFFF" />
                <Text style={styles.btnPrimaryText}>Check Rates</Text>
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
        </View>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {/* Deep Charcoal VS Arena Header */}
        <View style={[styles.arenaHeader, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.arenaTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.arenaEyebrow}>HEAD-TO-HEAD STAYSCORE ARENA</Text>
              <Text style={styles.arenaTitle}>Compare Any 2 Luxury Stays</Text>
              <Text style={styles.arenaSub}>
                Pit our visited reviews against {hotels.length} iconic resorts worldwide. Green ★ marks the winner.
              </Text>
            </View>
            <Pressable style={styles.swapBtn} onPress={handleSwap} accessibilityLabel="Swap hotels">
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={[styles.selectorRow, !isSplitScreen && styles.selectorCol]}>
            <Pressable style={styles.selectorBtn} onPress={() => setPickerTarget('A')}>
              <Text style={styles.selectorTag}>HOTEL A</Text>
              <Text style={styles.selectorName} numberOfLines={1}>
                {hotelA ? hotelA.name : 'Select first hotel...'}
              </Text>
              <Text style={styles.selectorMeta} numberOfLines={1}>
                {hotelA ? `${hotelA.location} · StayScore ${hotelA.consensus?.overallIndex}` : ''}
              </Text>
            </Pressable>

            <Pressable style={styles.selectorBtn} onPress={() => setPickerTarget('B')}>
              <Text style={[styles.selectorTag, { color: '#38BDF8' }]}>HOTEL B</Text>
              <Text style={styles.selectorName} numberOfLines={1}>
                {hotelB ? hotelB.name : 'Select second hotel...'}
              </Text>
              <Text style={styles.selectorMeta} numberOfLines={1}>
                {hotelB ? `${hotelB.location} · StayScore ${hotelB.consensus?.overallIndex}` : ''}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Adaptive VS Cards: 2-Column on Foldables/iPhone Duo/Tablet, Stacked on Phone */}
        {hotelA && hotelB ? (
          <View
            style={[
              styles.vsGrid,
              isSplitScreen ? styles.vsGridRow : styles.vsGridCol,
              { paddingHorizontal: horizontalPadding },
            ]}
          >
            {renderHotelCard(hotelA, hotelB, 'A')}
            {renderHotelCard(hotelB, hotelA, 'B')}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Loading global luxury stays...</Text>
          </View>
        )}
      </ScrollView>

      {/* Searchable Hotel Picker Modal */}
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
                ['all', 'All Global'],
                ['visited', 'Visited by Us'],
                ['global', 'Global Directory'],
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
            renderItem={({ item }) => {
              const visited = isVisitedHotel(item);
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
                      {item.location} · {visited ? 'Visited by Us' : 'Global Directory'}
                    </Text>
                  </View>
                  <View style={styles.pickerScorePill}>
                    <Text style={styles.pickerScoreText}>{item.consensus?.overallIndex ?? '—'}</Text>
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
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  arenaHeader: {
    backgroundColor: Colors.charcoal,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2E323A',
  },
  arenaTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  arenaEyebrow: { fontSize: 10.5, fontWeight: '800', color: Colors.accent, letterSpacing: 0.9 },
  arenaTitle: { fontSize: 21, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  arenaSub: { fontSize: 12.5, color: '#C5C9D1', marginTop: 4, lineHeight: 18 },
  swapBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorRow: { flexDirection: 'row', gap: 10 },
  selectorCol: { flexDirection: 'column' },
  selectorBtn: {
    flex: 1,
    backgroundColor: Colors.charcoalCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#373B44',
  },
  selectorTag: { fontSize: 10, fontWeight: '800', color: Colors.accent, letterSpacing: 0.7 },
  selectorName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginTop: 3 },
  selectorMeta: { fontSize: 11.5, color: '#A5AAB4', marginTop: 2 },

  vsGrid: { paddingTop: 16, gap: 16 },
  vsGridRow: { flexDirection: 'row', alignItems: 'flex-start' },
  vsGridCol: { flexDirection: 'column' },

  vsCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  vsCardHalf: { flex: 1 },
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
  sidePillB: { backgroundColor: '#0284C7' },
  sidePillText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
  scopeBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  scopeVisited: { backgroundColor: 'rgba(15, 118, 110, 0.92)' },
  scopeGlobal: { backgroundColor: 'rgba(25, 27, 31, 0.85)' },
  scopeBadgeText: { fontSize: 10.5, fontWeight: '700', color: '#FFFFFF' },
  scoreBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  scoreBadgeNum: { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  scoreBadgeSub: { fontSize: 8.5, fontWeight: '800', color: Colors.inkMuted, letterSpacing: 0.5 },

  cardBody: { padding: 14 },
  hotelName: { fontSize: 18, fontWeight: '800', color: Colors.inkPrimary },
  hotelLoc: { fontSize: 12.5, color: Colors.inkSecondary, marginTop: 2 },
  awardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    backgroundColor: Colors.amberSoft,
    borderColor: Colors.amberBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  awardText: { fontSize: 11, fontWeight: '700', color: Colors.amber },

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
    borderColor: Colors.accentBorder,
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
    borderRadius: 10,
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  btnDark: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: Colors.charcoal,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
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
    borderRadius: 10,
  },
  btnOutlineText: { color: Colors.accentDark, fontSize: 13, fontWeight: '700' },

  emptyBox: { padding: 36, alignItems: 'center' },
  emptyText: { color: Colors.inkMuted, fontSize: 14 },

  modalWrap: { flex: 1, backgroundColor: Colors.bgWhite, paddingTop: 14 },
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
    backgroundColor: Colors.bgCanvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },
  modalScopeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  scopeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  scopeChipText: { fontSize: 12, fontWeight: '700', color: Colors.inkSecondary },
  scopeChipTextActive: { color: '#FFFFFF' },
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
