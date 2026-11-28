import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { routes } from '../lib/nav';
import { t } from '../lib/i18n';

const IOS = process.env.EXPO_OS === 'ios';

/**
 * iPhone and Duo: the shortcut group. On the Duo these sit in the side rail as their own group,
 * above the five tabs (like the Claude app's rail); on a regular iPhone they're in the top bar.
 * Each opens its page over the current tab.
 */
export function RailShortcuts() {
  const router = useRouter();
  if (!IOS) return null;
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button icon="play.circle" accessibilityLabel={t("Watch our stays")} onPress={() => router.push(routes.watch() as never)} />
      <Stack.Toolbar.Button icon="tag" accessibilityLabel={t("Deals")} onPress={() => router.push(routes.deals() as never)} />
      <Stack.Toolbar.Button icon="gift" accessibilityLabel={t("Holiday dates")} onPress={() => router.push(routes.holidays() as never)} />
    </Stack.Toolbar>
  );
}

export function withRailShortcuts<P extends object>(Screen: React.ComponentType<P>) {
  function WithShortcuts(props: P) {
    return (
      <>
        <RailShortcuts />
        <Screen {...props} />
      </>
    );
  }
  WithShortcuts.displayName = `WithShortcuts(${Screen.displayName || Screen.name || 'Screen'})`;
  return WithShortcuts;
}
