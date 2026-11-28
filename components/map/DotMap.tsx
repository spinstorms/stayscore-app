import React, { memo, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import type { HotelMapProps } from './types';

/**
 * Lightweight map of dots, used on web and on Android until a Google Maps key is added.
 * Dots are plain views (not 1,300 separate buttons, which froze the app); one touch layer
 * picks the nearest hotel. Only the selected dot re-renders when you tap.
 */
export function DotMap({ hotels, selectedId, onSelect, colorFor, bounds }: HotelMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width && height) setSize({ width, height });
  };
  const points = useMemo(() => {
    const pad = 16;
    const w = Math.max(1, size.width - pad * 2);
    const h = Math.max(1, size.height - pad * 2);
    return hotels.map((ht) => {
      const xr = (ht.lng - bounds.minLng) / Math.max(0.1, bounds.maxLng - bounds.minLng);
      const yr = (bounds.maxLat - ht.lat) / Math.max(0.1, bounds.maxLat - bounds.minLat);
      return {
        id: ht.id,
        x: pad + Math.max(0, Math.min(1, xr)) * w,
        y: pad + Math.max(0, Math.min(1, yr)) * h,
        color: colorFor(ht),
        big: Boolean(ht.visitedByUs),
      };
    });
  }, [hotels, bounds, size, colorFor]);

  const pointsRef = useRef(points);
  pointsRef.current = points;
  const pick = (x: number, y: number) => {
    let best: string | null = null;
    let bestD = 28 * 28;
    for (const p of pointsRef.current) {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p.id;
      }
    }
    if (best) onSelect(best);
  };
  const sel = points.find((p) => p.id === selectedId);

  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      <Dots points={points} />
      {sel ? (
        <View
          pointerEvents="none"
          style={[styles.dot, { left: sel.x - 9, top: sel.y - 9, width: 18, height: 18, borderRadius: 9, backgroundColor: sel.color, borderWidth: 2.5, borderColor: '#FFFFFF', zIndex: 30 }]}
        />
      ) : null}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) => pick(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        accessibilityLabel="Map of hotels. Tap a dot to see the hotel."
      />
    </View>
  );
}

const Dots = memo(function Dots({ points }: { points: { id: string; x: number; y: number; color: string; big: boolean }[] }) {
  return (
    <>
      {points.map((p) => {
        const s = p.big ? 12 : 9;
        return (
          <View
            key={p.id}
            pointerEvents="none"
            style={[styles.dot, { left: p.x - s / 2, top: p.y - s / 2, width: s, height: s, borderRadius: s / 2, backgroundColor: p.color }]}
          />
        );
      })}
    </>
  );
});

const styles = StyleSheet.create({
  dot: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' },
});
