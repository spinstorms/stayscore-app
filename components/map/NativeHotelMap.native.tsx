import Constants from 'expo-constants';
import { useImage } from 'expo-image';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import React, { useCallback, useMemo } from 'react';
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
// The key in app.json is built into the Android app, but the copy of the config the app can
// read at run time leaves it out, so checking it here wrongly fell back to the dot map.
export const nativeMapAvailable = IOS || process.env.EXPO_OS === 'android' || Boolean(googleKey);

const PIN = { maxWidth: 36, maxHeight: 47 };

export function NativeHotelMap({ hotels, selectedId, onSelect, colorFor, bounds, satellite, pinKind }: HotelMapProps) {
  const camera = useMemo(() => cameraFor(bounds), [bounds]);
  // StayOdds' own pins instead of the stock ones: orange with the key for our filmed stays,
  // lagoon teal for every other hotel, pink with a heart for saved ones
  const pinOurs = useImage(require('../../assets/images/pins/pin-ours.png'), PIN);
  const pinGlobal = useImage(require('../../assets/images/pins/pin-global.png'), PIN);
  const pinSaved = useImage(require('../../assets/images/pins/pin-saved.png'), PIN);
  const iconFor = useCallback(
    (h: (typeof hotels)[number]) => {
      const k = pinKind ? pinKind(h) : 'global';
      return (k === 'ours' ? pinOurs : k === 'saved' ? pinSaved : pinGlobal) ?? undefined;
    },
    [pinKind, pinOurs, pinGlobal, pinSaved]
  );
  const iconsReady = Boolean(pinOurs && pinGlobal && pinSaved);
  // Markers only change with the hotel list (not on every selection), so the map stays smooth.
  const markers = useMemo(
    () =>
      hotels.map((h) => ({
        id: h.id,
        coordinates: { latitude: h.lat, longitude: h.lng },
        // no title on iPhone: a titled pin opens Apple's own place sheet over the app; the
        // app's hotel card underneath shows the details instead
        ...(IOS ? null : { title: h.name, snippet: `${h.location}, ${h.country}` }),
        tintColor: colorFor(h),
        icon: iconFor(h),
      })),
    [hotels, colorFor, iconFor]
  );

  if (IOS) {
    return (
      <AppleMaps.View
        key={`${bounds.minLat},${bounds.minLng}`}
        style={StyleSheet.absoluteFill}
        cameraPosition={camera}
        // StayOdds pins once their pictures are loaded (a moment after opening); the stock tinted
        // pins until then
        markers={iconsReady ? [] : markers.map(({ icon: _i, ...m }) => m)}
        annotations={iconsReady ? markers.map(({ tintColor: _t, ...m }) => ({ ...m, anchor: { x: 0.5, y: 1 } })) : []}
        onMarkerClick={(m) => m.id && onSelect(m.id)}
        onAnnotationClick={(m) => m.id && onSelect(m.id)}
        // map types are the strings expo-maps' enums hold: satellite photos with labels, or streets
        properties={{ mapType: (satellite ? 'HYBRID' : 'STANDARD') as never }}
        uiSettings={{ compassEnabled: true, scaleBarEnabled: true }}
      />
    );
  }
  return (
    <GoogleMaps.View
      key={`${bounds.minLat},${bounds.minLng}`}
      style={StyleSheet.absoluteFill}
      cameraPosition={camera}
      markers={markers.map(({ tintColor: _t, ...m }) => ({
        ...m,
        anchor: { x: 0.5, y: 1 },
        zIndex: m.id === selectedId ? 10 : 0,
      }))}
      onMarkerClick={(m) => m.id && onSelect(m.id)}
      properties={{ mapType: (satellite ? 'HYBRID' : 'NORMAL') as never }}
      uiSettings={{
        compassEnabled: true,
        mapToolbarEnabled: false,
        zoomControlsEnabled: false,
        zoomGesturesEnabled: true,
        scrollGesturesEnabled: true,
        rotationGesturesEnabled: true,
      }}
    />
  );
}
