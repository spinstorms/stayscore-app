import { useLocalSearchParams, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HotelDetailContent } from '../../components/HotelDetailContent';
import { BRAND } from '../../lib/brand';
import { useStayOdds } from '../../lib/store';
import { Colors } from '../../lib/theme';

export default function HotelDetailRoute() {
  const { id, when } = useLocalSearchParams<{ id: string; when?: string }>();
  const { hotels } = useStayOdds();
  const hotel = hotels.find((h) => h.id === id) || hotels[0];

  if (!hotel) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Loading {BRAND.name} breakdown…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: hotel.name }} />
      <HotelDetailContent hotel={hotel} when={typeof when === 'string' ? when : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  empty: { color: Colors.inkMuted, fontSize: 15 },
});
