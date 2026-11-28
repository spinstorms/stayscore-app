import { Stack } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdaptiveLayout, useAndroidBarSpace, useTabSideInsetStyle } from '../lib/layout';
import { Colors } from '../lib/theme';

type Tone = 'default' | 'uncharted' | 'sand' | 'band' | 'bandSand';
/** Colour zones, as on stayodds.com: hotels in sea-glass, the channel in orange, choosing in sand */
export const TONES: Record<Tone, { header: string; tint: string; title: string; bg: string }> = {
  default: { header: Colors.bgWhite, tint: Colors.accent, title: Colors.inkPrimary, bg: Colors.bgCanvas },
  uncharted: { header: Colors.uncharted, tint: '#FFFFFF', title: '#FFFFFF', bg: Colors.uncharted },
  sand: { header: Colors.sand, tint: Colors.accentDark, title: Colors.inkPrimary, bg: Colors.sand },
  // orange title band over a light page, as on stayodds.com's map, insights and holidays pages
  band: { header: Colors.uncharted, tint: '#FFFFFF', title: '#FFFFFF', bg: Colors.bgCanvas },
  bandSand: { header: Colors.uncharted, tint: '#FFFFFF', title: '#FFFFFF', bg: Colors.sand },
};

export function StayOddsWordmark() {
  return (
    <View style={styles.brandRow}>
      <Image source={require('../assets/images/stayodds-logo-white.png')} style={styles.brandLogo} accessibilityIgnoresInvertColors />
      <Text style={styles.wordmark}>
        StayOdds<Text style={styles.wordmarkDot}>.</Text>
      </Text>
    </View>
  );
}

/**
 * The native Stack each tab lives in. Native headers move into the iPhone Duo rail
 * automatically; the side padding keeps screen content clear of the rail and notches.
 */
export function TabStack({
  screen,
  title,
  wordmark,
  hideHeader,
  tone,
}: {
  screen: string;
  title: string;
  wordmark?: boolean;
  /** the screen draws its own top (the home screen's photo header) */
  hideHeader?: boolean;
  /** colour zone: The Uncharted Itinerary's orange (videos, deals) or sand (Compare) */
  tone?: Tone;
}) {
  const t = TONES[tone ?? 'default'];
  const sidePadding = useTabSideInsetStyle();
  // folded Android: content stops above the floating bar (its own colour shows around the bar)
  const barSpace = useAndroidBarSpace();
  const insets = useSafeAreaInsets();
  const { isSplitScreen } = useAdaptiveLayout();
  // Android/web unfolded: no title bar, so the whole height goes to content (each screen already
  // shows its own heading). iOS keeps the native header because its buttons live in the Duo rail.
  const compactChrome = hideHeader || (process.env.EXPO_OS !== 'ios' && isSplitScreen);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: t.header },
        headerTintColor: t.tint,
        headerTitleStyle: { fontWeight: '700', color: t.title },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerShown: !compactChrome,
        contentStyle: {
          backgroundColor: t.bg,
          // the home screen draws edge to edge (its photo goes under the rail and bars) and
          // keeps its own text clear of them
          ...(hideHeader ? null : sidePadding),
          ...(compactChrome && !hideHeader ? { paddingTop: insets.top } : null),
          // Android unfolded has no bottom tab bar, so keep content above the system navigation bar
          ...(process.env.EXPO_OS === 'android' && isSplitScreen && !hideHeader ? { paddingBottom: insets.bottom } : null),
          ...(barSpace && !hideHeader ? { paddingBottom: barSpace } : null),
        },
      }}
    >
      <Stack.Screen
        name={screen}
        options={{ title, headerTitle: wordmark ? () => <StayOddsWordmark /> : title }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  brandLogo: { width: 26, height: 26, borderRadius: 7, marginRight: 7 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontSize: 23, fontWeight: '900', color: Colors.inkPrimary, letterSpacing: -0.6 },
  wordmarkDot: { color: Colors.coral, fontSize: 27, fontWeight: '900' },
});
