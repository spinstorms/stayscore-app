import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '../lib/brand';
import { useSideInsetStyle } from '../lib/layout';
import { StayOddsProvider } from '../lib/store';
import { Colors } from '../lib/theme';
import { useLanguage } from '../lib/i18n';
import { t } from '../lib/i18n';

export default function RootLayout() {
  // the whole app redraws in the new language when it changes
  const lang = useLanguage();
  return (
    <SafeAreaProvider>
      <StayOddsProvider>
        <StatusBar style="dark" />
        <RootStack key={lang} />
      </StayOddsProvider>
    </SafeAreaProvider>
  );
}

// The Uncharted Itinerary's pages (videos, deals) in the channel's orange
const UNCHARTED_HEADER = {
  headerStyle: { backgroundColor: Colors.uncharted },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: { fontWeight: '700' as const, color: '#FFFFFF' },
};

function RootStack() {
  // Pushed screens (hotel breakdown, award lists) keep their content clear of the iPhone Duo rail.
  const sidePadding = useSideInsetStyle();
  const insets = useSafeAreaInsets();
  // Android draws edge to edge: keep pushed screens (hotel pages, award lists) above the navigation bar
  const bottomPad = process.env.EXPO_OS === 'android' ? { paddingBottom: insets.bottom } : null;
  return (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.bgWhite },
            headerTintColor: Colors.accent,
            headerTitleStyle: { fontWeight: '700', color: Colors.inkPrimary },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Colors.bgCanvas, ...sidePadding, ...bottomPad },
          }}
        >
          {/* The tabs pad their own screens, so the system tab bar / rail itself stays at the edge. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false, contentStyle: { backgroundColor: Colors.bgCanvas } }} />
          <Stack.Screen name="awards" options={{ title: t("Award Lists"), headerBackTitle: 'Back' }} />
          {/* iPhone: opened from the rail's shortcut group (Watch, Deals, Holiday dates) */}
          {/* the strip beside the rail is orange too, so the whole page reads as one Uncharted zone */}
          <Stack.Screen name="videos" options={{ title: t("Episodes & Shorts"), headerBackTitle: 'Back', ...UNCHARTED_HEADER, contentStyle: { backgroundColor: Colors.unchartedTint, ...sidePadding, ...bottomPad } }} />
          <Stack.Screen name="offers" options={{ title: t("Deals"), headerBackTitle: 'Back', ...UNCHARTED_HEADER, contentStyle: { backgroundColor: Colors.unchartedTint, ...sidePadding, ...bottomPad } }} />
          <Stack.Screen name="holiday-dates" options={{ title: t("Holiday Dates"), headerBackTitle: 'Back' }} />
          <Stack.Screen
            name="hotel/[id]"
            options={{
              title: `${BRAND.name} Breakdown`,
              headerBackTitle: 'Back',
              // same sand as the page, so the strip beside the rail is part of the page
              contentStyle: { backgroundColor: Colors.sand, ...sidePadding, ...bottomPad },
            }}
          />
        </Stack>
  );
}
