import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { openExternalUrl } from '../../lib/api';
import { youtubeId } from './youtube';
import { YouTubeFrame } from './YouTubeFrame';

/**
 * A video thumbnail that starts playing right where it is when tapped, like the play buttons on
 * stayodds.com. Falls back to opening YouTube if the link isn't a YouTube video.
 */
export function InlineVideo({
  url,
  thumbnail,
  aspect = 16 / 9,
  style,
  badge,
}: {
  url: string;
  thumbnail?: string;
  aspect?: number;
  style?: StyleProp<ViewStyle>;
  badge?: string;
}) {
  const id = youtubeId(url);
  const [playing, setPlaying] = useState(false);
  const thumb = thumbnail || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined);

  return (
    <View style={[styles.wrap, { aspectRatio: aspect }, style]}>
      {playing && id ? (
        <YouTubeFrame id={id} />
      ) : (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Play video"
          onPress={() => (id ? setPlaying(true) : openExternalUrl(url))}
        >
          {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={styles.scrim} />
          <View style={styles.center}>
            <View style={styles.play}>
              <Ionicons name="play" size={26} color="#FFFFFF" style={{ marginLeft: 3 }} />
            </View>
          </View>
          {badge ? (
            <View style={styles.badge}>
              <Ionicons name="logo-youtube" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', backgroundColor: '#000', borderRadius: 14, overflow: 'hidden' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.18)' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  play: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF0033',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badge: {
    position: 'absolute',
    left: 10,
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800' },
});
