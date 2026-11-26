import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { HotelDetailContent } from '../../components/HotelDetailContent';
import { BRAND } from '../../lib/brand';
import { buildSingleDeepLink } from '../../lib/propertyStatus';
import { useStayOdds } from '../../lib/store';
import { Colors } from '../../lib/theme';

const IOS = process.env.EXPO_OS === 'ios';

export default function HotelDetailRoute() {
  const { id, when } = useLocalSearchParams<{ id: string; when?: string }>();
  const { hotels, toggleShortlist, isShortlisted, pushToCompare } = useStayOdds();
  const hotel = hotels.find((h) => h.id === id) || hotels[0];

  if (!hotel) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Loading {BRAND.name} breakdown…</Text>
      </View>
    );
  }

  const saved = isShortlisted(hotel.id);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: hotel.name }} />
      {IOS ? (
        // Native header actions. On iPhone Duo these move into the side rail with Back,
        // the same way system apps place their actions.
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={saved ? 'heart.fill' : 'heart'}
            selected={saved}
            accessibilityLabel={saved ? 'Remove from shortlist' : 'Save to shortlist'}
            onPress={() => toggleShortlist(hotel.id)}
          />
          <Stack.Toolbar.Button
            icon="arrow.left.arrow.right"
            accessibilityLabel="Compare with another hotel"
            onPress={() => {
              pushToCompare(hotel.id);
              router.push('/compare');
            }}
          />
          <Stack.Toolbar.Button
            icon="square.and.arrow.up"
            accessibilityLabel="Share this hotel"
            onPress={() => {
              const url = buildSingleDeepLink(hotel);
              Share.share({ message: `${hotel.name} on ${BRAND.name}: ${url}`, url }).catch(() => {});
            }}
          />
        </Stack.Toolbar>
      ) : null}
      <HotelDetailContent hotel={hotel} when={typeof when === 'string' ? when : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: Colors.inkMuted, fontSize: 15 },
});
