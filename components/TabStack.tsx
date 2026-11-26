import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdaptiveLayout, useSideInsetStyle } from '../lib/layout';
import { Colors } from '../lib/theme';

export function StayOddsWordmark() {
  return (
    <View style={styles.brandRow}>
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
        headerStyle: { backgroundColor: Colors.navy },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerShown: !compactChrome,
        contentStyle: {
          // navy behind the status bar so its light icons stay readable
          backgroundColor: compactChrome ? Colors.navy : Colors.bgCanvas,
          ...sidePadding,
          ...(compactChrome ? { paddingTop: insets.top } : null),
          // Android unfolded has no bottom tab bar, so keep content above the system navigation bar
          ...(process.env.EXPO_OS === 'android' && isSplitScreen ? { paddingBottom: insets.bottom } : null),
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
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: { fontSize: 23, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.6 },
  wordmarkDot: { color: Colors.accent, fontSize: 27, fontWeight: '900' },
});
