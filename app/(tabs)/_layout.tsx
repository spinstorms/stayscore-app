import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../lib/theme';

function StayOddsWordmark() {
  return (
    <View style={styles.brandRow}>
      <Text style={styles.wordmark}>
        StayOdds<Text style={styles.wordmarkDot}>.</Text>
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.navy,
        },
        headerTintColor: '#FFFFFF',
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.inkMuted,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 9,
          paddingTop: 7,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          headerTitle: () => <StayOddsWordmark />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          headerTitle: 'World Hotel Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={typeof color === 'string' ? color : Colors.accent} />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: 'Compare',
          headerTitle: 'Head-to-Head',
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
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  wordmark: {
    fontSize: 23,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  wordmarkDot: {
    color: Colors.accent,
    fontSize: 27,
    fontWeight: '900',
  },
});
