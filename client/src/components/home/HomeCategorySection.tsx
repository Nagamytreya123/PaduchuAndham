import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { usePageRestoreEffect } from '../../hooks/usePageRestoreEffect';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { homeSurface } from '../../constants/homeSurface';
import { useCategories } from '../../context/CategoriesContext';
import type { CollectionFilterKey } from '../../utils/catalogCategory';
import { PRODUCT_IMAGE_FALLBACK, handleProductImageError } from '../../utils/productImage';

const VISIBLE_COLUMNS = 5;
const COLUMN_GAP = { xs: 1, sm: 1.25 } as const;
const COLUMN_GAP_PX = { xs: 8, sm: 10 } as const;
const COLUMN_PAGE_PAD_PX = { xs: 32, sm: 48 } as const;
const COLUMN_VIEWPORT_MAX = 920;

const scrollColumnWidthCss = {
  xs: `calc((100vw - ${COLUMN_PAGE_PAD_PX.xs}px - ${(VISIBLE_COLUMNS - 1) * COLUMN_GAP_PX.xs}px) / ${VISIBLE_COLUMNS})`,
  sm: `calc((min(100vw, ${COLUMN_VIEWPORT_MAX}px) - ${COLUMN_PAGE_PAD_PX.sm}px - ${(VISIBLE_COLUMNS - 1) * COLUMN_GAP_PX.sm}px) / ${VISIBLE_COLUMNS})`,
} as const;

const scrollCategoryColumnSx = {
  flex: '0 0 auto',
  width: scrollColumnWidthCss,
  minWidth: scrollColumnWidthCss,
  maxWidth: scrollColumnWidthCss,
  boxSizing: 'border-box' as const,
};

const fillCategoryColumnSx = {
  flex: '1 1 0',
  minWidth: 0,
  width: 0,
  maxWidth: 'none',
  boxSizing: 'border-box' as const,
};

function usesScrollableCategoryLayout(count: number): boolean {
  return count > VISIBLE_COLUMNS;
}

function getCategoryColumnSx(count: number) {
  return usesScrollableCategoryLayout(count) ? scrollCategoryColumnSx : fillCategoryColumnSx;
}

const U_RISE = 10;
const BASELINE = 2;
const NAV_STROKE = 1;
const STROKE = 2;
const U_TOP_RADIUS = 7;
const U_FOOT_RADIUS = 12;
const LABEL_ROW = 28;
const TAB_PAD_X = 4;
const NAV_HEIGHT = U_RISE + LABEL_ROW + BASELINE;
const INDICATOR_HEIGHT = U_RISE + LABEL_ROW + BASELINE;

/** ≤5 categories — grows with viewport (11px → 15px). */
const CATEGORY_LABEL_FONT_FILL = {
  xs: '0.6875rem',
  sm: '0.75rem',
  md: '0.8125rem',
  lg: '0.875rem',
  xl: '0.9375rem',
} as const;

/** >5 categories — one step smaller at each breakpoint (10px → 14px). */
const CATEGORY_LABEL_FONT_SCROLL = {
  xs: '0.625rem',
  sm: '0.6875rem',
  md: '0.75rem',
  lg: '0.8125rem',
  xl: '0.875rem',
} as const;

function getCategoryLabelFontSize(count: number) {
  return usesScrollableCategoryLayout(count)
    ? CATEGORY_LABEL_FONT_SCROLL
    : CATEGORY_LABEL_FONT_FILL;
}

type HomeCategorySectionProps = {
  value: CollectionFilterKey;
  onChange: (key: CollectionFilterKey) => void;
};

type CategoryColumn = {
  key: CollectionFilterKey;
  label: string;
  image: string;
};

function categoryImageSrc(tileImageUrl: string | undefined): string {
  return tileImageUrl?.trim() ? tileImageUrl : PRODUCT_IMAGE_FALLBACK;
}

type IndicatorMetrics = {
  left: number;
  width: number;
};

const INDICATOR_DURATION_MS = 340;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function readActiveTabMetrics(
  track: HTMLElement,
  activeIndex: number,
): IndicatorMetrics | null {
  if (activeIndex < 0) return null;
  const tab = track.querySelectorAll<HTMLElement>('[data-category-tab="true"]')[activeIndex];
  if (!tab) return null;
  return { left: tab.offsetLeft, width: tab.offsetWidth };
}

function useAnimatedIndicatorMetrics(
  trackRef: RefObject<HTMLElement | null>,
  activeIndex: number,
  tabCount: number,
) {
  const [metrics, setMetrics] = useState<IndicatorMetrics>({ left: 0, width: 0 });
  const [trackWidth, setTrackWidth] = useState(0);
  const metricsRef = useRef<IndicatorMetrics>({ left: 0, width: 0 });
  const activeIndexRef = useRef(activeIndex);
  const prevIndexRef = useRef(activeIndex);
  const rafRef = useRef(0);
  const measureRetryRef = useRef(0);

  activeIndexRef.current = activeIndex;

  const readTargetMetrics = useCallback((): IndicatorMetrics | null => {
    const track = trackRef.current;
    if (!track || activeIndex < 0 || tabCount === 0) return null;
    return readActiveTabMetrics(track, activeIndex);
  }, [activeIndex, tabCount, trackRef]);

  const measureTrackWidth = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setTrackWidth(track.getBoundingClientRect().width);
  }, [trackRef]);

  const snapToActiveTab = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    measureTrackWidth();
    const track = trackRef.current;
    const index = activeIndexRef.current;
    if (!track || index < 0) return;
    const target = readActiveTabMetrics(track, index);
    if (!target) return;
    metricsRef.current = target;
    setMetrics(target);
  }, [measureTrackWidth, trackRef]);

  useLayoutEffect(() => {
    cancelAnimationFrame(rafRef.current);
    measureTrackWidth();

    const target = readTargetMetrics();
    if (!target) {
      if (measureRetryRef.current < 16) {
        measureRetryRef.current += 1;
        rafRef.current = requestAnimationFrame(() => {
          const retryTarget = readTargetMetrics();
          if (!retryTarget) return;
          metricsRef.current = retryTarget;
          setMetrics(retryTarget);
        });
      }
      return () => cancelAnimationFrame(rafRef.current);
    }

    measureRetryRef.current = 0;
    const indexChanged = prevIndexRef.current !== activeIndex;
    prevIndexRef.current = activeIndex;

    if (!indexChanged || metricsRef.current.width <= 0) {
      metricsRef.current = target;
      setMetrics(target);
      return () => cancelAnimationFrame(rafRef.current);
    }

    const from = metricsRef.current;
    const to = target;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / INDICATOR_DURATION_MS);
      const eased = easeOutCubic(progress);
      const next = {
        left: from.left + (to.left - from.left) * eased,
        width: from.width + (to.width - from.width) * eased,
      };
      metricsRef.current = next;
      setMetrics(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        metricsRef.current = to;
        setMetrics(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeIndex, measureTrackWidth, readTargetMetrics, trackRef]);

  useLayoutEffect(() => {
    measureRetryRef.current = 0;
    snapToActiveTab();

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      snapToActiveTab();
      raf2 = requestAnimationFrame(snapToActiveTab);
    });

    const fontsReady = document.fonts?.ready;
    void fontsReady?.then(() => snapToActiveTab());

    const track = trackRef.current;
    if (!track) {
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }

    const observer = new ResizeObserver(() => snapToActiveTab());
    observer.observe(track);
    track.querySelectorAll('[data-category-tab="true"]').forEach((el) => observer.observe(el));
    window.addEventListener('resize', snapToActiveTab);

    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      observer.disconnect();
      window.removeEventListener('resize', snapToActiveTab);
    };
  }, [snapToActiveTab, trackRef, tabCount]);

  usePageRestoreEffect(() => {
    prevIndexRef.current = activeIndexRef.current;
    snapToActiveTab();
    window.setTimeout(snapToActiveTab, 200);
  });

  return { metrics, trackWidth };
}

const baselineSegmentSx = {
  position: 'absolute' as const,
  bottom: 0,
  height: `${BASELINE}px`,
  bgcolor: homeSurface.accent,
  pointerEvents: 'none' as const,
  zIndex: 0,
};

function CategoryNavIndicator({
  trackRef,
  activeIndex,
  tabCount,
}: {
  trackRef: RefObject<HTMLElement | null>;
  activeIndex: number;
  tabCount: number;
}) {
  const { metrics, trackWidth } = useAnimatedIndicatorMetrics(trackRef, activeIndex, tabCount);
  const hasActiveTab = activeIndex >= 0 && metrics.width > 0 && trackWidth > 0;

  if (!hasActiveTab) {
    return (
      <Box
        aria-hidden
        sx={{
          ...baselineSegmentSx,
          left: 0,
          right: 0,
        }}
      />
    );
  }

  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: INDICATOR_HEIGHT,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <NavTrackIndicator
        trackWidth={trackWidth}
        tabLeft={metrics.left}
        tabWidth={metrics.width}
      />
    </Box>
  );
}

function getFootSpan(tabWidth: number) {
  const inset = NAV_STROKE / 2;
  const xL = inset;
  const xR = Math.max(inset + 1, tabWidth - inset);
  const innerWidth = Math.max(8, xR - xL);
  const rb = Math.min(U_FOOT_RADIUS, innerWidth / 3, INDICATOR_HEIGHT * 0.28);
  const footL = xL - rb;
  const footR = xR + rb;

  return { footL, footR, spanWidth: footR - footL, rb, xL, xR };
}

function buildNavTrackPaths(
  trackWidth: number,
  tabLeft: number,
  tabWidth: number,
  height: number,
) {
  const { footL, footR, rb, xL, xR } = getFootSpan(tabWidth);
  const inset = NAV_STROKE / 2;
  const yB = height - BASELINE / 2;
  const yT = inset;
  const innerWidth = Math.max(8, xR - xL);
  const rt = Math.min(U_TOP_RADIUS, innerWidth / 4, U_RISE);
  const k = rb * 0.5522847498;

  const joinL = tabLeft + footL;
  const joinR = tabLeft + footR;
  const axL = tabLeft + xL;
  const axR = tabLeft + xR;

  // Mirrored quarter-circle cubics — identical curve type and radius on both feet.
  const leftFoot = `C ${joinL + k} ${yB} ${axL} ${yB - rb + k} ${axL} ${yB - rb}`;
  const rightFoot = `C ${axR} ${yB - rb + k} ${joinR - k} ${yB} ${joinR} ${yB}`;

  const strokeParts: string[] = [];

  if (joinL > 0) {
    strokeParts.push(`M 0 ${yB}`, `L ${joinL} ${yB}`);
  } else {
    strokeParts.push(`M ${joinL} ${yB}`);
  }

  strokeParts.push(
    leftFoot,
    `L ${axL} ${yT + rt}`,
    `A ${rt} ${rt} 0 0 1 ${axL + rt} ${yT}`,
    `L ${axR - rt} ${yT}`,
    `A ${rt} ${rt} 0 0 1 ${axR} ${yT + rt}`,
    `L ${axR} ${yB - rb}`,
    rightFoot,
  );

  if (joinR < trackWidth) {
    strokeParts.push(`L ${trackWidth} ${yB}`);
  }

  const fillPath = [
    `M ${joinL} ${yB}`,
    leftFoot,
    `L ${axL} ${yT + rt}`,
    `A ${rt} ${rt} 0 0 1 ${axL + rt} ${yT}`,
    `L ${axR - rt} ${yT}`,
    `A ${rt} ${rt} 0 0 1 ${axR} ${yT + rt}`,
    `L ${axR} ${yB - rb}`,
    rightFoot,
    `L ${joinL} ${yB}`,
    'Z',
  ].join(' ');

  return {
    strokePath: strokeParts.join(' '),
    fillPath,
  };
}

function NavTrackIndicator({
  trackWidth,
  tabLeft,
  tabWidth,
}: {
  trackWidth: number;
  tabLeft: number;
  tabWidth: number;
}) {
  const width = Math.max(1, trackWidth);
  const { strokePath, fillPath } = buildNavTrackPaths(width, tabLeft, tabWidth, INDICATOR_HEIGHT);

  return (
    <Box
      component="svg"
      aria-hidden
      viewBox={`0 0 ${width} ${INDICATOR_HEIGHT}`}
      sx={{
        display: 'block',
        width: '100%',
        height: INDICATOR_HEIGHT,
        overflow: 'visible',
      }}
    >
      <path d={fillPath} fill={homeSurface.pageBg} stroke="none" />
      <path
        d={strokePath}
        fill="none"
        stroke={homeSurface.accent}
        strokeWidth={NAV_STROKE}
        strokeLinecap="butt"
        strokeLinejoin="round"
        shapeRendering="geometricPrecision"
      />
    </Box>
  );
}

function categoryDisplayLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function CategoryLabel({
  label,
  selected,
  fontSize,
}: {
  label: string;
  selected: boolean;
  fontSize: typeof CATEGORY_LABEL_FONT_FILL | typeof CATEGORY_LABEL_FONT_SCROLL;
}) {
  const displayLabel = categoryDisplayLabel(label);

  return (
    <Box
      component="span"
      title={label}
      sx={{
        display: 'block',
        width: '100%',
        fontFamily: homeSurface.font.category,
        fontOpticalSizing: 'auto',
        fontSize,
        fontWeight: 600,
        fontStyle: 'normal',
        letterSpacing: '0.01em',
        lineHeight: 1.15,
        textAlign: 'center',
        color: selected ? homeSurface.accent : homeSurface.ink,
        opacity: selected ? 1 : 0.68,
        whiteSpace: 'normal',
        overflow: 'visible',
        wordBreak: 'break-word',
        hyphens: 'auto',
        textDecoration: 'none',
        transition: `color ${homeSurface.indicatorDuration} ${homeSurface.indicatorEasing}, opacity ${homeSurface.indicatorDuration} ${homeSurface.indicatorEasing}`,
      }}
    >
      {displayLabel}
    </Box>
  );
}

function CategoryTab({
  column,
  selected,
  onSelect,
  columnSx,
  labelFontSize,
}: {
  column: CategoryColumn;
  selected: boolean;
  onSelect: () => void;
  columnSx: typeof scrollCategoryColumnSx | typeof fillCategoryColumnSx;
  labelFontSize: typeof CATEGORY_LABEL_FONT_FILL | typeof CATEGORY_LABEL_FONT_SCROLL;
}) {
  return (
    <Button
      role="tab"
      data-category-tab="true"
      aria-selected={selected}
      id={`home-category-tab-${column.key}`}
      aria-controls={`home-category-panel-${column.key}`}
      onClick={onSelect}
      disableRipple
      sx={{
        position: 'relative',
        zIndex: selected ? 2 : 1,
        ...columnSx,
        height: NAV_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
        px: `${TAB_PAD_X}px`,
        pt: `${U_RISE}px`,
        pb: `${BASELINE}px`,
        borderRadius: 0,
        bgcolor: 'transparent',
        textTransform: 'none',
        textDecoration: 'none',
        minHeight: 0,
        '&:hover': { bgcolor: 'transparent', textDecoration: 'none' },
        '&:focus-visible': {
          outline: `2px solid ${homeSurface.accent}`,
          outlineOffset: 3,
        },
      }}
    >
      <Box
        sx={{
          minHeight: LABEL_ROW,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
        }}
      >
        <CategoryLabel label={column.label} selected={selected} fontSize={labelFontSize} />
      </Box>
    </Button>
  );
}

export function HomeCategorySection({ value, onChange }: HomeCategorySectionProps) {
  const { categories, loading, refresh } = useCategories();
  const scrollRef = useRef<HTMLDivElement>(null);
  const navTrackRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const columns = useMemo<CategoryColumn[]>(
    () =>
      categories
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => ({
          key: c.slug,
          label: c.label,
          image: categoryImageSrc(c.tileImageUrl),
        })),
    [categories],
  );

  const activeKey = useMemo(() => {
    if (columns.length === 0) return value;
    const match = columns.find((c) => c.key === value);
    return match?.key ?? columns[0]!.key;
  }, [columns, value]);

  const activeIndex = columns.findIndex((c) => c.key === activeKey);

  const registerColumn = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) columnRefs.current.set(key, node);
    else columnRefs.current.delete(key);
  }, []);

  const scrollToColumn = useCallback((key: CollectionFilterKey, smooth = true) => {
    const container = scrollRef.current;
    const column = columnRefs.current.get(key);
    if (!container || !column) return;

    const columnCenter = column.offsetLeft + column.offsetWidth / 2;
    const targetLeft = columnCenter - container.clientWidth / 2;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    const nextLeft = Math.max(0, Math.min(maxScroll, targetLeft));

    container.scrollTo({
      left: nextLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  const scrollReadyRef = useRef(false);

  const syncScrollPosition = useCallback(() => {
    if (!usesScrollableCategoryLayout(columns.length)) return;
    scrollToColumn(activeKey, false);
  }, [activeKey, columns.length, scrollToColumn]);

  useLayoutEffect(() => {
    if (!usesScrollableCategoryLayout(columns.length)) return;
    scrollToColumn(activeKey, scrollReadyRef.current);
    scrollReadyRef.current = true;
  }, [activeKey, columns.length, scrollToColumn]);

  usePageRestoreEffect(syncScrollPosition);

  useEffect(() => {
    const onLoad = () => syncScrollPosition();
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, [syncScrollPosition]);

  if (loading && columns.length === 0) {
    return (
      <Box sx={{ mt: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', gap: COLUMN_GAP, overflowX: 'auto', ...homeSurface.hideScrollbar }}>
          {Array.from({ length: VISIBLE_COLUMNS }, (_, i) => (
            <Box key={`cat-col-skel-${i}`} sx={scrollCategoryColumnSx}>
              <Skeleton variant="rectangular" height={NAV_HEIGHT} sx={{ mb: 1.25, bgcolor: 'rgba(5,11,24,0.06)' }} />
              <Skeleton variant="rounded" height={72} sx={{ bgcolor: 'rgba(5,11,24,0.07)', borderRadius: 2 }} />
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (!loading && columns.length === 0) {
    return (
      <Typography
        sx={{
          mt: 2,
          fontFamily: homeSurface.font.body,
          fontSize: '0.9rem',
          color: homeSurface.inkMuted,
        }}
      >
        Categories will appear here once configured.
      </Typography>
    );
  }

  const isScrollableLayout = usesScrollableCategoryLayout(columns.length);
  const columnSx = getCategoryColumnSx(columns.length);
  const labelFontSize = getCategoryLabelFontSize(columns.length);

  return (
    <Box sx={{ mt: { xs: 2, sm: 2.5 }, minWidth: 0 }}>
      <Box
        ref={scrollRef}
        data-category-scroll="true"
        sx={{
          overflowX: isScrollableLayout ? 'auto' : 'hidden',
          overflowY: 'hidden',
          width: '100%',
          mx: { xs: -0.5, sm: 0 },
          px: { xs: 0.5, sm: 0 },
          ...homeSurface.hideScrollbar,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 1.25, sm: 1.5 },
            width: isScrollableLayout ? 'max-content' : '100%',
            minWidth: isScrollableLayout ? 'min(100%, max-content)' : 0,
          }}
        >
          <Box
            ref={navTrackRef}
            role="tablist"
            aria-label="Shop categories"
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              gap: COLUMN_GAP,
              width: isScrollableLayout ? 'max-content' : '100%',
              minWidth: isScrollableLayout ? 'min(100%, max-content)' : 0,
              height: NAV_HEIGHT,
            }}
          >
            <CategoryNavIndicator
              trackRef={navTrackRef}
              activeIndex={activeIndex}
              tabCount={columns.length}
            />

            {columns.map((column) => (
              <CategoryTab
                key={column.key}
                column={column}
                selected={column.key === activeKey}
                onSelect={() => onChange(column.key)}
                columnSx={columnSx}
                labelFontSize={labelFontSize}
              />
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: COLUMN_GAP,
              width: isScrollableLayout ? 'max-content' : '100%',
              minWidth: isScrollableLayout ? 'min(100%, max-content)' : 0,
            }}
          >
            {columns.map((column) => {
              const selected = column.key === activeKey;
              return (
                <Box
                  key={column.key}
                  ref={(node: HTMLDivElement | null) => registerColumn(column.key, node)}
                  role="tabpanel"
                  id={`home-category-panel-${column.key}`}
                  aria-labelledby={`home-category-tab-${column.key}`}
                  sx={columnSx}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onChange(column.key)}
                    aria-pressed={selected}
                    aria-label={`Browse ${column.label}`}
                    sx={{
                      width: '100%',
                      border: 'none',
                      p: 0,
                      bgcolor: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'center',
                      borderRadius: 2,
                      transition: 'transform 0.25s ease',
                      transform: selected ? 'scale(1.02)' : 'none',
                      '&:hover': { transform: 'scale(1.02)' },
                      '&:focus-visible': {
                        outline: `2px solid ${homeSurface.accent}`,
                        outlineOffset: 3,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        aspectRatio: '4 / 5',
                        borderRadius: 2,
                        overflow: 'hidden',
                        bgcolor: '#F3ECE4',
                        boxShadow: selected
                          ? '0 10px 24px rgba(232, 72, 122, 0.16)'
                          : homeSurface.shadowSoft,
                        border: selected
                          ? `${STROKE}px solid ${homeSurface.accent}`
                          : `1px solid ${homeSurface.border}`,
                        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
                      }}
                    >
                      <Box
                        component="img"
                        src={column.image}
                        alt=""
                        loading="lazy"
                        onError={handleProductImageError}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {!loading && categories.length === 0 ? (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={() => void refresh()}>
              Retry
            </Button>
          }
          sx={{ mt: 1.5, borderRadius: 2 }}
        >
          Could not load categories.
        </Alert>
      ) : null}
    </Box>
  );
}
