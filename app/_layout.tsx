import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BRAND } from '../lib/brand';
import { useSideInsetStyle } from '../lib/layout';
import { StayOddsProvider } from '../lib/store';
import { Colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StayOddsProvider>
        <StatusBar style="light" />
        <RootStack />
      </StayOddsProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  // Pushed screens (hotel breakdown, award lists) keep their content clear of the iPhone Duo rail.
  const sidePadding = useSideInsetStyle();
  return (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.navy },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '700', color: '#FFFFFF' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Colors.bgCanvas, ...sidePadding },
          }}
        >
          {/* The tabs pad their own screens, so the system tab bar / rail itself stays at the edge. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgCanvas } }} />
          <Stack.Screen name="awards" options={{ title: 'Award Lists', headerBackTitle: 'Back' }} />
          <Stack.Screen name="holidays" options={{ title: 'Holiday Dates', headerBackTitle: 'Back' }} />
          <Stack.Screen name="insights" options={{ title: 'Guest Insights', headerBackTitle: 'Back' }} />
          <Stack.Screen
            name="hotel/[id]"
            options={{
              title: `${BRAND.name} Breakdown`,
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
  );
}
