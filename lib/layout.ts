import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Adaptive layout hook for standard phones, iPhone Duo (outer + inner display),
 * Android foldables (Galaxy Z Fold / Pixel Fold) and iPads.
 *
 * Reference sizes (points):
 *  - iPhone Duo outer display: 466 x 678, with an 84pt rail inset on one side
 *  - iPhone Duo inner display: 951 x 669 open (landscape), 669 x 951 in portrait
 *  - iPhone Duo Split View window: 469 wide
 *  - Galaxy Z Fold / Pixel Fold inner display: roughly 600-700 wide unfolded
 *
 * Always read at render time: the window changes size on fold/unfold and in Split View.
 */
export function useAdaptiveLayout() {
  const { width, height } = useWindowDimensions();
  // 600+ wide and reasonably tall = unfolded foldable, iPhone Duo inner display or tablet.
  // The height check keeps landscape phones (about 400 tall) on the single-column layout.
  const isSplitScreen = width >= 600 && height >= 500;
  const isWideDesktop = width >= 1100;
  const gridColumns = width >= 1100 ? 3 : isSplitScreen ? 2 : 1;

  return {
    width,
    height,
    isSplitScreen,
    isWideDesktop,
    gridColumns,
    horizontalPadding: isSplitScreen ? 20 : 16,
  };
}

/**
 * Left/right safe-area padding for a screen's content. On iPhone Duo the system rail
 * (header, toolbar and tab controls) sits on the left or right edge with an 84pt inset;
 * on landscape phones this keeps content clear of the notch. Zero everywhere else.
 */
export function useSideInsetStyle() {
  const insets = useSafeAreaInsets();
  return { paddingLeft: insets.left, paddingRight: insets.right };
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
