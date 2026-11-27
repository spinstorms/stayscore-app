import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdaptiveLayout } from '../../lib/layout';
import { Colors } from '../../lib/theme';

const IOS = process.env.EXPO_OS === 'ios';

type IonName = keyof typeof Ionicons.glyphMap;
// wideOnly: shown in the side rail when unfolded; on a phone they're one tap away from Home.
const TABS: { name: string; label: string; ion: IonName; ionOn: IonName; wideOnly?: boolean }[] = [
  { name: '(trip)', label: 'Home', ion: 'sparkles-outline', ionOn: 'sparkles' },
  { name: '(explore)', label: 'Explore', ion: 'search-outline', ionOn: 'search' },
  { name: '(map)', label: 'Map', ion: 'map-outline', ionOn: 'map' },
  { name: '(compare)', label: 'Compare', ion: 'git-compare-outline', ionOn: 'git-compare' },
  { name: '(holidays)', label: 'Holidays', ion: 'gift-outline', ionOn: 'gift', wideOnly: true },
  { name: '(insights)', label: 'Insights', ion: 'stats-chart-outline', ionOn: 'stats-chart', wideOnly: true },
  { name: '(watch)', label: 'Watch', ion: 'play-circle-outline', ionOn: 'play-circle' },
  { name: '(deals)', label: 'Deals', ion: 'pricetag-outline', ionOn: 'pricetag' },
];

/**
 * iOS: five system tabs, the most iPhone and the Duo rail show without a "More" button (the
 * tabs behind "More" froze): Home, Explore (with the map inside), Compare, Watch & Deals and
 * Plan (Holidays + Insights). Each screen adds its own buttons to the rail above the tabs.
 *
 * iOS: system tabs. iOS places them itself: the bottom bar on iPhone and the side rail on
 * iPhone Duo, folded and open. No sidebar placement: on the open Duo it turned the rail into a
 * pop-out sidebar that covered the screen.
 *
 * Android (and web): a compact bottom bar on a phone. Unfolded (600dp+ wide, e.g. Pixel Fold)
 * it becomes a Material navigation rail down the left edge, so the full height goes to content,
 * as Google recommends for foldables and tablets.
 */
export default function TabsLayout() {
  const { isSplitScreen } = useAdaptiveLayout();
  const insets = useSafeAreaInsets();

  if (IOS) {
    return (
      <NativeTabs tintColor={Colors.accent}>
        <NativeTabs.Trigger name="(trip)">
          <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} md="auto_awesome" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(explore)">
          <NativeTabs.Trigger.Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} md="search" />
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(compare)">
          <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" md="compare_arrows" />
          <NativeTabs.Trigger.Label>Compare</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(watch)">
          <NativeTabs.Trigger.Icon sf={{ default: 'play.circle', selected: 'play.circle.fill' }} md="play_circle" />
          <NativeTabs.Trigger.Label>Watch</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(plan)">
          <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="event" />
          <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.inkMuted,
        // unfolded: a floating rail on the edge, like the iPhone Duo's, instead of a full-height strip
        tabBarStyle: isSplitScreen
          ? {
              backgroundColor: Colors.bgWhite,
              borderRightWidth: 0,
              marginLeft: insets.left + 10,
              marginTop: insets.top + 10,
              marginBottom: insets.bottom + 10,
              marginRight: 6,
              borderRadius: 28,
              paddingVertical: 8,
              elevation: 6,
              shadowColor: '#0F2B33',
              shadowOpacity: 0.12,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }
          : { backgroundColor: Colors.bgWhite, borderTopWidth: 1, borderTopColor: Colors.border },
        sceneStyle: { backgroundColor: Colors.bgCanvas },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarPosition: isSplitScreen ? 'left' : 'bottom',
        tabBarVariant: isSplitScreen ? 'material' : 'uikit',
        tabBarLabelPosition: 'below-icon',
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            // phone bottom bar: keep it to the essentials (the route still works from links)
            ...(t.wideOnly && !isSplitScreen ? { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } } : null),
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.ionOn : t.ion} size={22} color={color as string} />,
          }}
        />
      ))}
      {/* iPhone only: Holidays + Insights together; Android has them as their own rail tabs */}
      <Tabs.Screen name="(plan)" options={{ href: null }} />
    </Tabs>
  );
}
