import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../../lib/brand';
import { Colors } from '../../lib/theme';

function BrandHeaderTitle() {
  return (
    <View style={styles.brandRow}>
      <View style={styles.emblemCircle}>
        <Ionicons name="compass-outline" size={18} color={Colors.accent} />
      </View>
      <View>
        <Text style={styles.brandName}>{BRAND.name}</Text>
        <Text style={styles.brandSub}>{BRAND.subtitle}</Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.bgCanvas,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderSoft,
        },
        headerTintColor: Colors.inkPrimary,
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.inkMuted,
        tabBarStyle: {
          backgroundColor: Colors.charcoal,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          headerTitle: () => <BrandHeaderTitle />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Compare',
          headerTitle: 'Head-to-Head Compare',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="git-compare-outline" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: 'Watch',
          headerTitle: 'Episodes & Shorts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle-outline" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals',
          headerTitle: 'Travel Perks & Gear',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag-outline" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emblemCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.inkPrimary,
    letterSpacing: 0.2,
    lineHeight: 21,
  },
  brandSub: {
    fontSize: 10.5,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: 0.3,
  },
});
