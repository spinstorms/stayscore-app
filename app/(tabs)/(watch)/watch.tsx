import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { InlineVideo } from '../../../components/video/InlineVideo';
import { openExternalUrl } from '../../../lib/api';
import { useAdaptiveLayout } from '../../../lib/layout';
import { useStayOdds } from '../../../lib/store';
import { Colors } from '../../../lib/theme';
import type { VideoItem } from '../../../lib/types';
import { lazyTab } from '../../../components/LazyTab';

export function WatchScreen() {
  const { videos, shorts, refreshing, refresh } = useStayOdds();
  const { isSplitScreen, gridColumns, horizontalPadding } = useAdaptiveLayout();

  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    videos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return Array.from(set);
  }, [videos]);

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter((v) => {
      if (category !== 'All' && v.category !== category) return false;
      if (!q) return true;
      return (
        v.title.toLowerCase().includes(q) ||
        (v.location || '').toLowerCase().includes(q) ||
        (v.summary?.tldr || '').toLowerCase().includes(q)
      );
    });
  }, [videos, category, query]);

  const featuredVideo = filteredVideos[0] || null;
  const remainingVideos = featuredVideo ? filteredVideos.slice(1) : [];

  const renderVideoCard = (video: VideoItem, isFeatured = false) => (
    <View
      key={video.id}
      style={[
        styles.videoCard,
        isFeatured && styles.featuredCard,
        !isFeatured && isSplitScreen && { flex: 1, minWidth: '47%' },
      ]}
    >
      {/* Tap to play right here, like the play buttons on stayodds.com */}
      <InlineVideo
        url={video.url}
        thumbnail={video.thumbnail || video.fallbackThumbnail}
        badge={video.category || undefined}
        style={{ borderRadius: 0 }}
      />

      <View style={styles.videoBody}>
        <Text style={[styles.videoTitle, isFeatured && styles.featuredTitle]} numberOfLines={2}>
          {video.title}
        </Text>
        <Text style={[styles.videoMeta, isFeatured && styles.featuredMeta]}>
          {[video.location, video.viewsText, video.publishedDate].filter(Boolean).join(' · ')}
        </Text>

        {video.summary?.tldr ? (
          <Text
            style={[styles.videoSummary, isFeatured && styles.featuredSummary]}
            numberOfLines={isFeatured ? 4 : 3}
          >
            {video.summary.tldr}
          </Text>
        ) : null}

        {video.summary?.bestFor ? (
          <View style={[styles.bestForPill, isFeatured && styles.bestForPillDark]}>
            <Ionicons name="sparkles" size={12} color={isFeatured ? '#FDBA74' : Colors.accent} />
            <Text
              style={[styles.bestForText, isFeatured && { color: '#FDE68A' }]}
              numberOfLines={1}
            >
              Best for: {video.summary.bestFor}
            </Text>
          </View>
        ) : null}

        <Pressable style={styles.watchRow} onPress={() => openExternalUrl(video.url)}>
          <Ionicons name="logo-youtube" size={15} color={isFeatured ? Colors.accent : '#EF4444'} />
          <Text style={[styles.watchCta, isFeatured && { color: '#FFFFFF' }]}>
            Open on YouTube (comments, subscribe)
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
    >
      {/* Channel Banner */}
      <View style={[styles.channelBanner, { paddingHorizontal: horizontalPadding }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerEyebrow}>THE UNCHARTED ITINERARY ON YOUTUBE</Text>
          <Text style={styles.bannerTitle}>
            {videos.length} Full Reviews & {shorts.length} Travel Shorts
          </Text>
          <Text style={styles.bannerSub}>
            Personally curated episodes from The Uncharted Itinerary — hotel tours, flight reviews, and camera tests.
          </Text>
        </View>
        <Pressable
          style={styles.subBtn}
          onPress={() => openExternalUrl('https://www.youtube.com/@TheUnchartedItinerary?sub_confirmation=1')}
        >
          <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
          <Text style={styles.subBtnText}>Subscribe</Text>
        </Pressable>
      </View>

      {/* Search & Categories */}
      <View style={{ paddingHorizontal: horizontalPadding, paddingTop: 14 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.inkMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search episodes, hotels, destinations, or cameras..."
            placeholderTextColor={Colors.inkMuted}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.pillRow, { paddingHorizontal: horizontalPadding }]}
      >
        {categories.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.filterPill, category === cat && styles.filterPillActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.filterPillText, category === cat && styles.filterPillTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Featured Latest Episode (Dark Charcoal Spotlight) */}
      {featuredVideo ? (
        <View style={{ paddingHorizontal: horizontalPadding, marginBottom: 18 }}>
          {renderVideoCard(featuredVideo, true)}
        </View>
      ) : null}

      {/* Horizontal Shorts Rail */}
      {shorts.length > 0 ? (
        <View style={styles.shortsSection}>
          <View style={[styles.sectionHeader, { paddingHorizontal: horizontalPadding }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="flash" size={16} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Quick Resort Shorts ({shorts.length})</Text>
            </View>
            <Text style={styles.sectionHint}>Swipe →</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={shorts.slice(0, 24)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 10 }}
            renderItem={({ item }) => (
              <View style={styles.shortCard}>
                <InlineVideo url={item.url} thumbnail={item.thumbnail || item.fallbackThumbnail} aspect={9 / 16} badge="SHORT" style={{ borderRadius: 14 }} />
                <Text style={styles.shortTitleBelow} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            )}
          />
        </View>
      ) : null}

      {/* All Episodes Grid */}
      <View style={{ paddingHorizontal: horizontalPadding, marginTop: 18 }}>
        <Text style={styles.sectionTitle}>
          More Episodes ({remainingVideos.length})
        </Text>
        <View style={[styles.episodesGrid, gridColumns >= 2 && styles.episodesGridWide]}>
          {remainingVideos.map((v) => renderVideoCard(v, false))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shortTitleBelow: { fontSize: 12.5, fontWeight: '700', color: Colors.inkPrimary, marginTop: 6 },
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  channelBanner: {
    backgroundColor: Colors.bgWhite,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerEyebrow: { fontSize: 10, fontWeight: '800', color: Colors.accent, letterSpacing: 0.9 },
  bannerTitle: { fontSize: 19, fontWeight: '800', color: Colors.inkPrimary, marginTop: 2 },
  bannerSub: { fontSize: 12, color: Colors.inkSecondary, marginTop: 4, lineHeight: 17 },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  subBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },
  pillRow: { gap: 8, paddingVertical: 12 },
  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterPillActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterPillText: { fontSize: 12.5, fontWeight: '700', color: Colors.inkSecondary },
  filterPillTextActive: { color: '#FFFFFF' },

  videoCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  featuredCard: {
    backgroundColor: Colors.charcoal,
    borderColor: '#2E323A',
  },
  thumbWrap: { position: 'relative', height: 180, backgroundColor: '#111' },
  featuredThumbWrap: { height: 210 },
  thumbImg: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  playCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(11, 122, 122, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(25,27,31,0.86)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  catBadgeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },

  videoBody: { padding: 14 },
  videoTitle: { fontSize: 16, fontWeight: '800', color: Colors.inkPrimary, lineHeight: 21 },
  featuredTitle: { color: '#FFFFFF', fontSize: 18 },
  videoMeta: { fontSize: 12, color: Colors.inkMuted, marginTop: 4 },
  featuredMeta: { color: '#B8BDC7' },
  videoSummary: { fontSize: 13, color: Colors.inkSecondary, marginTop: 8, lineHeight: 19 },
  featuredSummary: { color: '#E2E5EC' },

  bestForPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bestForPillDark: { backgroundColor: 'rgba(11, 122, 122, 0.18)' },
  bestForText: { fontSize: 11.5, fontWeight: '700', color: Colors.accentDark },

  watchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  watchCta: { fontSize: 12.5, fontWeight: '800', color: Colors.inkPrimary },

  shortsSection: {
    backgroundColor: Colors.bgWarm,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.accentBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.inkPrimary },
  sectionHint: { fontSize: 12, fontWeight: '700', color: Colors.accent },

  shortCard: { width: 150 },
  shortImg: { width: '100%', height: '100%' },
  shortScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 17, 21, 0.38)',
  },
  shortBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  shortBadgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '800' },
  shortFooter: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  shortTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', lineHeight: 16 },
  shortViews: { color: '#E5E7EB', fontSize: 10.5, marginTop: 3, fontWeight: '600' },

  episodesGrid: { marginTop: 12, gap: 14 },
  episodesGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
});

export default lazyTab(WatchScreen);
