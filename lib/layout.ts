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

/** Width of the floating rail on unfolded Android (the pill plus its margins). */
export const ANDROID_RAIL_WIDTH = 96;

/**
 * Space taken by the rail on each side of a tab screen: the iPhone Duo's system rail (safe-area
 * inset), or the floating rail on unfolded Android, which now floats over the screen.
 * `rail: false` for pushed screens, where Android has no rail.
 */
export function useRailInsets(opts?: { rail?: boolean }) {
  const insets = useSafeAreaInsets();
  const { isSplitScreen } = useAdaptiveLayout();
  const androidRail = opts?.rail !== false && process.env.EXPO_OS === 'android' && isSplitScreen;
  return { left: insets.left + (androidRail ? ANDROID_RAIL_WIDTH : 0), right: insets.right };
}

export function useTabSideInsetStyle() {
  const r = useRailInsets();
  return { paddingLeft: r.left, paddingRight: r.right };
}

/**
 * Seamless rail: the screen's own colours run underneath the rail instead of stopping beside it.
 *  - root: on the screen's outer view, so its background covers the rail area
 *  - pad: on the content, so text and buttons stay clear of the rail
 *  - band(h): on a full-width coloured strip (a banner) inside padded content, so it reaches the edge too
 */
export function useBleed(opts?: { rail?: boolean }) {
  const { left: l, right: r } = useRailInsets(opts);
  return {
    l,
    r,
    root: { marginLeft: -l, marginRight: -r },
    pad: { paddingLeft: l, paddingRight: r },
    band: (h = 0) => ({ marginLeft: -l, marginRight: -r, paddingLeft: h + l, paddingRight: h + r }),
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
