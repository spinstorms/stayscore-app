import Constants from 'expo-constants';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { cameraFor, type HotelMapProps } from './types';

// Apple Maps through expo-maps needs iOS 17+ (the app itself supports 16.4+)
const IOS = process.env.EXPO_OS === 'ios' && parseInt(String(Platform.Version), 10) >= 17;
const googleKey = (Constants.expoConfig?.android as { config?: { googleMaps?: { apiKey?: string } } } | undefined)?.config
  ?.googleMaps?.apiKey;

/**
 * The phone's own map: Apple Maps on iPhone (no setup), Google Maps on Android once a
 * Google Maps key is in app.json (android.config.googleMaps.apiKey). Without a key Android
 * falls back to the built-in dot map.
 */
export const nativeMapAvailable = IOS || Boolean(googleKey);

export function NativeHotelMap({ hotels, selectedId, onSelect, colorFor, bounds }: HotelMapProps) {
  const camera = useMemo(() => cameraFor(bounds), [bounds]);
  // Markers only change with the hotel list (not on every selection), so the map stays smooth.
  const markers = useMemo(
    () =>
      hotels.map((h) => ({
        id: h.id,
        coordinates: { latitude: h.lat, longitude: h.lng },
        title: h.name,
        snippet: `${h.location}, ${h.country}`,
        tintColor: colorFor(h),
      })),
    [hotels, colorFor]
  );

  if (IOS) {
    return (
      <AppleMaps.View
        key={`${bounds.minLat},${bounds.minLng}`}
        style={StyleSheet.absoluteFill}
        cameraPosition={camera}
        markers={markers}
        onMarkerClick={(m) => m.id && onSelect(m.id)}
        uiSettings={{ compassEnabled: true, scaleBarEnabled: true }}
      />
    );
  }
  return (
    <GoogleMaps.View
      key={`${bounds.minLat},${bounds.minLng}`}
      style={StyleSheet.absoluteFill}
      cameraPosition={camera}
      markers={markers.map(({ tintColor: _t, ...m }) => ({ ...m, zIndex: m.id === selectedId ? 10 : 0 }))}
      onMarkerClick={(m) => m.id && onSelect(m.id)}
      uiSettings={{ compassEnabled: true, mapToolbarEnabled: false, zoomControlsEnabled: false }}
    />
  );
}
