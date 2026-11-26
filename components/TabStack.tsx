import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSideInsetStyle } from '../lib/layout';
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
export function TabStack({ screen, title, wordmark }: { screen: string; title: string; wordmark?: boolean }) {
  const sidePadding = useSideInsetStyle();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.navy },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.bgCanvas, ...sidePadding },
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
