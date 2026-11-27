import { Stack } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdaptiveLayout, useSideInsetStyle } from '../lib/layout';
import { Colors } from '../lib/theme';

export function StayOddsWordmark() {
  return (
    <View style={styles.brandRow}>
      <Image source={require('../assets/images/stayodds-logo.png')} style={styles.brandLogo} accessibilityIgnoresInvertColors />
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
}: {
  screen: string;
  title: string;
  wordmark?: boolean;
  /** the screen draws its own top (the home screen's photo header) */
  hideHeader?: boolean;
}) {
  const sidePadding = useSideInsetStyle();
  const insets = useSafeAreaInsets();
  const { isSplitScreen } = useAdaptiveLayout();
  // Android/web unfolded: no title bar, so the whole height goes to content (each screen already
  // shows its own heading). iOS keeps the native header because its buttons live in the Duo rail.
  const compactChrome = hideHeader || (process.env.EXPO_OS !== 'ios' && isSplitScreen);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.bgWhite },
        headerTintColor: Colors.accent,
        headerTitleStyle: { fontWeight: '700', color: Colors.inkPrimary },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerShown: !compactChrome,
        contentStyle: {
          backgroundColor: Colors.bgCanvas,
          // the home screen draws edge to edge (its photo goes under the rail and bars) and
          // keeps its own text clear of them
          ...(hideHeader ? null : sidePadding),
          ...(compactChrome && !hideHeader ? { paddingTop: insets.top } : null),
          // Android unfolded has no bottom tab bar, so keep content above the system navigation bar
          ...(process.env.EXPO_OS === 'android' && isSplitScreen && !hideHeader ? { paddingBottom: insets.bottom } : null),
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
