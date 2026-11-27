import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Colors } from '../lib/theme';

/**
 * Native tabs build every tab as soon as the app opens. The heavy ones (the map with 1,300
 * pins, Compare, Explore's long list) would all be built at once and slow the start, so each
 * tab is built the first time it is opened and then kept, so coming back to it is instant.
 */
export function lazyTab<P extends object>(Screen: React.ComponentType<P>) {
  function LazyTabScreen(props: P) {
    const [opened, setOpened] = useState(false);
    useFocusEffect(
      useCallback(() => {
        setOpened(true);
      }, [])
    );
    if (!opened) return <View style={{ flex: 1, backgroundColor: Colors.bgCanvas }} />;
    return <Screen {...props} />;
  }
  LazyTabScreen.displayName = `Lazy(${Screen.displayName || Screen.name || 'Tab'})`;
  return LazyTabScreen;
}
