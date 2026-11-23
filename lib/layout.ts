import { useWindowDimensions } from 'react-native';

/**
 * Adaptive layout hook built for standard phones, iPhone Duo / Foldables (unfolded),
 * Android foldables (Galaxy Z Fold / Pixel Fold), and iPads.
 */
export function useAdaptiveLayout() {
  const { width, height } = useWindowDimensions();
  const isSplitScreen = width >= 680; // Unfolded foldable, iPhone Duo, or tablet
  const isWideDesktop = width >= 1024;
  const gridColumns = width >= 1024 ? 3 : width >= 680 ? 2 : 1;

  return {
    width,
    height,
    isSplitScreen,
    isWideDesktop,
    gridColumns,
    horizontalPadding: isSplitScreen ? 20 : 16,
  };
}

export function formatPersonalScore(val: number | null | undefined): string {
  if (val == null || Number.isNaN(Number(val))) return '—';
  const num = Number(val);
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
}

export function isRatedHotel(h: { overall: number | null; scores: unknown }): boolean {
  return h.overall != null && h.scores != null;
}

export function isVisitedHotel(h: { visitedByUs?: boolean; coverageType?: string }): boolean {
  return h.visitedByUs !== false && h.coverageType !== 'Global Directory';
}
