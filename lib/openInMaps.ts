import { Linking } from 'react-native';
import type { Hotel } from './types';

/** Opens the hotel in the phone's own maps app: Apple Maps on iPhone, Google Maps on Android, Google Maps on the web. */
export async function openInMaps(h: Pick<Hotel, 'name' | 'lat' | 'lng' | 'location' | 'country'>) {
  const label = encodeURIComponent(`${h.name}, ${h.location}`);
  const web = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h.name} ${h.location} ${h.country}`)}`;
  const url =
    process.env.EXPO_OS === 'ios'
      ? `maps://?q=${label}&ll=${h.lat},${h.lng}`
      : process.env.EXPO_OS === 'android'
        ? `geo:${h.lat},${h.lng}?q=${h.lat},${h.lng}(${label})`
        : web;
  try {
    await Linking.openURL(url);
  } catch {
    Linking.openURL(web).catch(() => {});
  }
}
