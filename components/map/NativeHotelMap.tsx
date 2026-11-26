import type { HotelMapProps } from './types';

/** Web: no native map; the screen uses the dot map instead. */
export const nativeMapAvailable = false;

export function NativeHotelMap(_props: HotelMapProps) {
  return null;
}
