import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StayScoreProvider } from '../lib/store';
import { Colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StayScoreProvider>
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
              title: 'StayScore Breakdown',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </StayScoreProvider>
    </SafeAreaProvider>
  );
}
