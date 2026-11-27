import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { openExternalUrl } from '../lib/api';
import {
  AWARD_LISTS,
  MICHELIN_EXPLAINER,
  W50_EXPLAINER,
  awardList,
  guestScore,
  w50Rank,
  type AwardListId,
} from '../lib/awards';
import { useStayOdds } from '../lib/store';
import { Colors } from '../lib/theme';
import type { Hotel } from '../lib/types';
import { routes } from '../lib/nav';

export default function AwardListsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ list?: string }>();
  const { hotels } = useStayOdds();
  const initial = (AWARD_LISTS.find((l) => l.id === params.list)?.id || 'w50') as AwardListId;
  const [active, setActive] = useState<AwardListId>(initial);
  const def = AWARD_LISTS.find((l) => l.id === active)!;
  const rows = useMemo(() => awardList(hotels, active), [hotels, active]);
  const isRank = active === 'w50';
  const explainer = isRank ? W50_EXPLAINER : MICHELIN_EXPLAINER;

  const renderItem = ({ item, index }: { item: Hotel; index: number }) => {
    const g = guestScore(item);
    return (
      <Pressable style={styles.row} onPress={() => router.push({ pathname: '/hotel/[id]', params: { id: item.id } })}>
        <Text style={styles.rank}>{isRank ? w50Rank(item) : index + 1}</Text>
        <Image source={{ uri: item.thumbnail }} style={styles.thumb} />
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.location}, {item.country}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.score}>{g ?? '—'}</Text>
          <Text style={styles.scoreLbl}>{g != null ? 'guests' : 'no score'}</Text>
        </View>
      </Pressable>
    );
  };

  const header = (
    <View>
      <View style={styles.tabs}>
        {AWARD_LISTS.map((l) => (
          <Pressable key={l.id} onPress={() => setActive(l.id)} style={[styles.tab, active === l.id && styles.tabOn]}>
            <Text style={[styles.tabText, active === l.id && styles.tabTextOn]}>{l.short}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.h1}>{def.title}</Text>
      <Text style={styles.note}>{def.note(rows.length)}</Text>
      <Pressable
        style={styles.mapBtn}
        onPress={() => router.push(routes.map(active) as never)}
      >
        <Ionicons name="map-outline" size={16} color="#FFFFFF" />
        <Text style={styles.mapBtnText}>Show these hotels on the map</Text>
      </Pressable>
    </View>
  );

  const footer = (
    <View style={styles.about}>
      <Text style={styles.aboutTitle}>{explainer.title}</Text>
      <Text style={styles.aboutBody}>{explainer.body}</Text>
      {'levels' in explainer
        ? (explainer as typeof MICHELIN_EXPLAINER).levels.map((l) => (
            <Text key={l} style={styles.aboutBullet}>
              • {l}
            </Text>
          ))
        : null}
      {'footer' in explainer ? <Text style={styles.aboutBody}>{(explainer as typeof MICHELIN_EXPLAINER).footer}</Text> : null}
      <Pressable onPress={() => openExternalUrl(explainer.sourceUrl)}>
        <Text style={styles.source}>Source ↗</Text>
      </Pressable>
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(h) => h.id}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      initialNumToRender={20}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  content: { padding: 16, paddingBottom: 40 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: Colors.slateBorder, backgroundColor: '#FFFFFF' },
  tabOn: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.inkSecondary },
  tabTextOn: { color: '#FFFFFF' },
  h1: { fontSize: 22, fontWeight: '900', color: Colors.inkPrimary, letterSpacing: -0.4 },
  note: { fontSize: 13, color: Colors.inkMuted, marginTop: 4, marginBottom: 12 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, marginBottom: 14 },
  mapBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  rank: { width: 30, textAlign: 'center', fontSize: 16, fontWeight: '900', color: Colors.accent },
  thumb: { width: 54, height: 54, borderRadius: 10, backgroundColor: Colors.slateSoft },
  rowBody: { flex: 1 },
  name: { fontSize: 14.5, fontWeight: '800', color: Colors.inkPrimary },
  meta: { fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  scoreBox: { alignItems: 'flex-end', minWidth: 48 },
  score: { fontSize: 18, fontWeight: '900', color: Colors.inkPrimary },
  scoreLbl: { fontSize: 10.5, color: Colors.inkMuted },
  about: { marginTop: 18, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  aboutTitle: { fontSize: 16, fontWeight: '900', color: Colors.inkPrimary, marginBottom: 6 },
  aboutBody: { fontSize: 13.5, lineHeight: 20, color: Colors.inkSecondary, marginBottom: 6 },
  aboutBullet: { fontSize: 13.5, color: Colors.inkPrimary, marginBottom: 2 },
  source: { color: Colors.accent, fontWeight: '700', marginTop: 4 },
});
