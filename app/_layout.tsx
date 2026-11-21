import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BRAND } from '../lib/brand';
import { StayOddsProvider } from '../lib/store';
import { Colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StayOddsProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.accent },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: Colors.bgCanvas },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="hotel/[id]"
            options={{
              title: `${BRAND.name} Breakdown`,
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </StayOddsProvider>
    </SafeAreaProvider>
  );
}
