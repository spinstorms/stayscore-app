import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { HotelDetailContent } from '../../components/HotelDetailContent';
import { useStayScore } from '../../lib/store';
import { Colors } from '../../lib/theme';

export default function HotelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hotels, loading } = useStayScore();

  const hotel = hotels.find((h) => h.id === id) || hotels[0];

  if (loading && !hotel) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.msg}>Loading StayScore breakdown…</Text>
      </View>
    );
  }

  if (!hotel) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Hotel not found.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: hotel.name }} />
      <HotelDetailContent hotel={hotel} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCanvas, gap: 10 },
  msg: { color: Colors.inkSecondary, fontSize: 14 },
});
