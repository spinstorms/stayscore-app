import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/FloatingTabBar';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { useAdaptiveLayout } from '../../lib/layout';
import { Colors } from '../../lib/theme';
import { t as tr } from '../../lib/i18n';

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
 * iOS, laid out for the iPhone Duo rail in groups, like Apple's own apps:
 *  - the tab group (five, the most the rail shows without a "More" button, whose tabs froze):
 *    Home, Explore, Map, Compare, Insights;
 *  - a shortcut group above it on each screen: Watch, Deals and Holiday dates (RailShortcuts),
 *    which open as pages over the current tab;
 *  - the screen's own buttons (Explore's filters, Compare's share).
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

  if (IOS) {
    return (
      <NativeTabs tintColor={Colors.accent}>
        <NativeTabs.Trigger name="(trip)">
          <NativeTabs.Trigger.Icon sf={{ default: 'sparkles', selected: 'sparkles' }} md="auto_awesome" />
          <NativeTabs.Trigger.Label>{tr("Home")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(explore)">
          <NativeTabs.Trigger.Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} md="search" />
          <NativeTabs.Trigger.Label>{tr("Explore")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(map)">
          <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
          <NativeTabs.Trigger.Label>{tr("Map")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(compare)">
          <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" md="compare_arrows" />
          <NativeTabs.Trigger.Label>{tr("Compare")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(insights)">
          <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
          <NativeTabs.Trigger.Label>{tr("Insights")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // Android: the rail (unfolded) or bar (folded) floats over the screen, so each screen's own colours
  // and photos run underneath it; screens keep their content clear of it.
  const labelled = TABS.map((t) => ({ ...t, label: tr(t.label) }));
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} tabs={labelled} rail={isSplitScreen} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bgCanvas },
        tabBarPosition: 'bottom',
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: tr(t.label),
            // phone bottom bar: keep it to the essentials (the route still works from links)
            ...(t.wideOnly && !isSplitScreen ? { tabBarButton: () => null, tabBarItemStyle: { display: 'none' as const } } : null),
            tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? t.ionOn : t.ion} size={22} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}
