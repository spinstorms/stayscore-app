import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANDROID_BAR_HEIGHT, ANDROID_RAIL_PILL } from '../lib/layout';
import { Colors } from '../lib/theme';

export type FloatingTab = { name: string; label: string; ion: keyof typeof Ionicons.glyphMap; ionOn: keyof typeof Ionicons.glyphMap; wideOnly?: boolean };

/**
 * Android's tab bar, floating OVER the screen (not beside or below it), so every screen's own
 * colours and photos run underneath it: a rail down the left when unfolded, a pill at the
 * bottom when folded. Screens keep their content clear of it (useRailInsets / TabStack).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FloatingTabBar({ state, navigation, tabs, rail }: { state: any; navigation: any; tabs: FloatingTab[]; rail: boolean }) {
  const insets = useSafeAreaInsets();
  const shown = tabs.filter((t) => rail || !t.wideOnly);
  return (
    <View
      pointerEvents="box-none"
      style={
        rail
          ? [styles.railWrap, { top: insets.top + 10, bottom: insets.bottom + 10, left: insets.left + 10 }]
          : [styles.barWrap, { bottom: insets.bottom + 8, left: insets.left + 12, right: insets.right + 12 }]
      }
    >
      <View style={[styles.pill, rail ? styles.railPill : styles.barPill]}>
        {shown.map((t) => {
          const route = state.routes.find((r: { name: string }) => r.name === t.name);
          if (!route) return null;
          const focused = state.routes[state.index]?.name === t.name;
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={t.name}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t.label}
              style={[rail ? styles.railItem : styles.barItem, focused && styles.itemOn]}
            >
              <Ionicons name={focused ? t.ionOn : t.ion} size={22} color={focused ? Colors.accent : Colors.inkMuted} />
              <Text style={[styles.label, { color: focused ? Colors.accent : Colors.inkMuted }]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  railWrap: { position: 'absolute', width: ANDROID_RAIL_PILL, justifyContent: 'center', zIndex: 20, elevation: 20 },
  barWrap: { position: 'absolute', height: ANDROID_BAR_HEIGHT, zIndex: 20, elevation: 20 },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#0F2B33',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  railPill: { flex: 1, paddingVertical: 14, justifyContent: 'space-evenly', alignItems: 'center' },
  barPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 },
  railItem: { alignItems: 'center', justifyContent: 'center', width: ANDROID_RAIL_PILL - 12, paddingVertical: 8, borderRadius: 18, gap: 2 },
  barItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 18, gap: 1 },
  itemOn: { backgroundColor: Colors.accentSoft },
  label: { fontSize: 11, fontWeight: '700' },
});
