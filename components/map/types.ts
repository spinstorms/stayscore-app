import type { Hotel } from '../../lib/types';

export interface HotelMapProps {
  hotels: Hotel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colorFor: (h: Hotel) => string;
  /** bounds of the chosen region, used for the starting camera */
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /** satellite photos (with place names) instead of the street map */
  satellite?: boolean;
  /** which StayOdds pin to draw: our filmed stays (orange key), every other hotel, or saved */
  pinKind?: (h: Hotel) => PinKind;
}

export type PinKind = 'ours' | 'global' | 'saved';

export function cameraFor(b: HotelMapProps['bounds']) {
  const lat = (b.minLat + b.maxLat) / 2;
  const lng = (b.minLng + b.maxLng) / 2;
  const span = Math.max(b.maxLat - b.minLat, (b.maxLng - b.minLng) / 2);
  // rough zoom from the region's size: world ~1.5, a country ~5, an island group ~7
  const zoom = Math.max(1.2, Math.min(9, Math.log2(360 / Math.max(span, 0.5)) - 0.4));
  return { coordinates: { latitude: lat, longitude: lng }, zoom };
}
