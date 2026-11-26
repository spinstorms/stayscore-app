import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { Colors } from '../../lib/theme';

/**
 * System (native) tabs. iOS places them itself: a bottom tab bar on a normal iPhone,
 * the side rail on iPhone Duo's outer display, and a sidebar or tab bar on the open
 * inner display and iPad. Android gets the Material bottom navigation bar.
 * Each tab has its own Stack (see the (group)/_layout.tsx files) for its header.
 */
export default function TabsLayout() {
  return (
    <NativeTabs tintColor={Colors.accent}>
      <NativeTabs.Trigger name="(explore)">
        <NativeTabs.Trigger.Icon sf={{ default: 'magnifyingglass', selected: 'magnifyingglass' }} md="search" />
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(map)">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(compare)">
        <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" md="compare_arrows" />
        <NativeTabs.Trigger.Label>Compare</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(watch)">
        <NativeTabs.Trigger.Icon sf={{ default: 'play.circle', selected: 'play.circle.fill' }} md="play_circle" />
        <NativeTabs.Trigger.Label>Watch</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(deals)">
        <NativeTabs.Trigger.Icon sf={{ default: 'tag', selected: 'tag.fill' }} md="sell" />
        <NativeTabs.Trigger.Label>Deals</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
