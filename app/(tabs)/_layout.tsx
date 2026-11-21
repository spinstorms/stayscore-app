import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BRAND } from '../../lib/brand';
import { Colors } from '../../lib/theme';

function BrandHeaderTitle() {
  return (
    <View style={styles.brandRow}>
      <Image source={require('../../assets/images/icon.png')} style={styles.brandIcon} />
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
        headerStyle: { backgroundColor: Colors.accent },
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.inkMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: BRAND.name,
          headerTitle: () => <BrandHeaderTitle />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Compare VS',
          headerTitle: 'Head-to-Head Compare',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="git-compare" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: 'Watch',
          headerTitle: 'Episodes & Travel Shorts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="deals"
        options={{
          title: 'Deals & Gear',
          headerTitle: 'Travel Deals & Filming Kit',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  brandName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', lineHeight: 20 },
  brandSub: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
});
