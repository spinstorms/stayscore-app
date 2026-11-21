import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../lib/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'StayScore' }} />
      <View style={styles.container}>
        <Text style={styles.title}>We couldn't find that screen.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Return to StayScore Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Colors.bgCanvas,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.inkPrimary,
  },
  link: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: Colors.accent,
    borderRadius: 10,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
