import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { usePageRestoreEffect } from '@/hooks/usePageRestoreEffect';
import { cn } from '@/lib/utils';
import { SansDigitsText } from '@/components/SansDigitsText';

const DRAG_CLICK_THRESHOLD_PX = 8;

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

export interface CoverflowSlide {
  src: string;
  alt: string;
  title?: string;
  subtitle?: string;
  href?: string;
  meta?: { label: string; value: string }[];
}

export interface CoverflowCarouselProps {
  slides: CoverflowSlide[];
  /** Degrees the first neighbour tilts. */
  rotate?: number;
  /** How far the first neighbour recedes, as a fraction of card width. */
  depth?: number;
  /** Viewer distance as a multiple of card width — smaller is a wider lens. */
  perspective?: number;
  /** Exponent on distance. Below 1 the rake eases off as cards travel out. */
  falloff?: number;
  /** Opacity lost per step from the centre. */
  fade?: number;
  /** Any CSS length. Everything else is derived from it, so the rake scales. */
  cardWidth?: string;
  /** Space between cards, as a fraction of card width. */
  gap?: number;
  loop?: boolean;
  showCaption?: boolean;
  showPagination?: boolean;
  showNavigation?: boolean;
  /** Milliseconds between auto-advances. 0 or omitted disables autoplay. */
  autoPlayInterval?: number;
  /** Names the carousel for assistive tech. */
  label?: string;
  className?: string;
  cardClassName?: string;
}

export function CoverflowCarousel({
  slides,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = 'clamp(148px, 22vw, 260px)',
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  autoPlayInterval = 0,
  label = 'Cover carousel',
  className,
  cardClassName,
}: CoverflowCarouselProps) {
  const navigate = useNavigate();
  const count = slides.length;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  /** Fractional card index at the centre. The single source of truth. */
  const posRef = React.useRef(0);
  /** Where the current settle is headed. Stepping off `pos` instead would
      swallow a keypress that lands mid-flight, before the round-off moves. */
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    x: number;
    y: number;
    pos: number;
    v: number;
    t: number;
  } | null>(null);
  const pausedRef = React.useRef(false);
  const didDragRef = React.useRef(false);

  const [selected, setSelected] = React.useState(0);

  /** Nearest whole card, folded back into 0..count-1. */
  const indexAt = React.useCallback(
    (pos: number) => ((Math.round(pos) % count) + count) % count,
    [count],
  );

  // Paint straight to the DOM. Sixty state updates a second would re-render
  // every card for numbers React never needs to see.
  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      // Fold the distance into the shorter way round the ring. This is the
      // whole looping mechanism — no cloned nodes, no shuffling the DOM.
      let offset = index - pos;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, falloff);
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      const step = () => {
        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        posRef.current += remaining * 0.16;
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint],
  );

  const clamp = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  );

  const goTo = React.useCallback(
    (index: number) => {
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clamp(target));
    },
    [clamp, count, loop, settle],
  );

  const nudge = React.useCallback(
    (by: number) => settle(clamp(Math.round(targetRef.current) + by)),
    [clamp, settle],
  );

  const pauseAutoPlay = React.useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resumeAutoPlay = React.useCallback(() => {
    pausedRef.current = false;
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pauseAutoPlay();
    didDragRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    if (Math.abs(event.clientX - drag.x) > DRAG_CLICK_THRESHOLD_PX) {
      didDragRef.current = true;
    }

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clamp(drag.pos - (event.clientX - drag.x) / pitch);
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const wasTap = !didDragRef.current;

    if (wasTap) {
      const hit = document.elementFromPoint(drag.x, event.clientY);
      const card = hit?.closest<HTMLElement>('[data-coverflow-card]');
      const tappedIndex = card ? Number(card.dataset.index) : NaN;
      const index = Number.isFinite(tappedIndex)
        ? tappedIndex
        : indexAt(Math.round(targetRef.current));
      const href = slides[index]?.href;
      if (href) {
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        navigate(href);
        return;
      }
    }

    dragRef.current = null;
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clamp(Math.round(posRef.current + carried)));
    window.setTimeout(resumeAutoPlay, autoPlayInterval);
  };

  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint, slides.length]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const slidesKey = slides.map((slide) => slide.href ?? slide.src).join('|');

  const resetCarousel = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    didDragRef.current = false;
    dragRef.current = null;
    pausedRef.current = false;
    posRef.current = 0;
    targetRef.current = 0;
    setSelected(0);
    paint();
  }, [paint]);

  React.useEffect(() => {
    resetCarousel();
  }, [slidesKey, resetCarousel]);

  usePageRestoreEffect(resetCarousel);

  React.useEffect(() => {
    if (!autoPlayInterval || autoPlayInterval <= 0 || count <= 1) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      if (pausedRef.current || dragRef.current) return;
      nudge(1);
    }, autoPlayInterval);

    return () => window.clearInterval(intervalId);
  }, [autoPlayInterval, count, nudge]);

  const active = slides[selected];

  if (count === 0) return null;

  return (
    <div
      className={cn('w-full', className)}
      style={{ ['--cf-card' as string]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={pauseAutoPlay}
      onMouseLeave={resumeAutoPlay}
      onFocus={pauseAutoPlay}
      onBlur={resumeAutoPlay}
    >
      <div className="relative w-full">
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            pauseAutoPlay();
            if (event.key === 'ArrowLeft') {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === 'ArrowRight') {
              event.preventDefault();
              nudge(1);
            }
            window.setTimeout(resumeAutoPlay, autoPlayInterval);
          }}
          className="coverflow-carousel-frame w-full cursor-grab overflow-hidden py-10 outline-none ring-ring focus-visible:ring-2 active:cursor-grabbing"
          style={{
            perspective: `calc(var(--cf-card) * ${perspective})`,
            perspectiveOrigin: '50% 50%',
            touchAction: 'pan-y',
          }}
        >
          <div
            className="relative mx-auto w-full select-none"
            style={{
              height: 'var(--cf-card)',
              transformStyle: 'preserve-3d',
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.href ?? `${slide.src}-${index}`}
                data-coverflow-card
                data-index={index}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}`}
                className={cn(
                  'absolute left-1/2 top-0 aspect-square overflow-hidden rounded-2xl bg-muted shadow-xl will-change-transform transition-[opacity] duration-300',
                  slide.href && 'cursor-pointer',
                  cardClassName,
                )}
                style={{ width: 'var(--cf-card)' }}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  draggable={false}
                  loading="lazy"
                  className="h-full w-full select-none object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {showNavigation && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => {
                pauseAutoPlay();
                nudge(-1);
                window.setTimeout(resumeAutoPlay, autoPlayInterval);
              }}
              className="absolute left-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground backdrop-blur transition hover:bg-background"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => {
                pauseAutoPlay();
                nudge(1);
                window.setTimeout(resumeAutoPlay, autoPlayInterval);
              }}
              className="absolute right-3 top-1/2 z-[200] -translate-y-1/2 rounded-full bg-background/70 p-2 text-foreground backdrop-blur transition hover:bg-background"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {showCaption && active?.title && (
        active.href ? (
          <Link
            key={selected}
            to={active.href}
            className="mt-1 flex w-full items-center justify-between gap-3 px-4 py-1 opacity-100 no-underline transition-opacity duration-300 hover:opacity-80 sm:px-6"
          >
            <p className="min-w-0 truncate text-left text-base font-semibold tracking-tight text-foreground sm:text-lg">
              <SansDigitsText text={active.title} digitClassName="font-sans tabular-nums lining-nums" />
            </p>
            {active.subtitle && (
              <p className="shrink-0 text-right font-sans text-base font-semibold tabular-nums lining-nums text-foreground sm:text-lg">
                {active.subtitle}
              </p>
            )}
          </Link>
        ) : (
          <div
            key={selected}
            className="mt-1 flex w-full items-center justify-between gap-3 px-4 py-1 opacity-100 transition-opacity duration-300 sm:px-6"
          >
            <p className="min-w-0 truncate text-left text-base font-semibold tracking-tight text-foreground sm:text-lg">
              <SansDigitsText text={active.title} digitClassName="font-sans tabular-nums lining-nums" />
            </p>
            {active.subtitle && (
              <p className="shrink-0 text-right font-sans text-base font-semibold tabular-nums lining-nums text-foreground sm:text-lg">
                {active.subtitle}
              </p>
            )}
            {active.meta && active.meta.length > 0 && (
              <dl className="mt-10 w-full max-w-[230px] text-[12px]">
                {active.meta.map((row) => (
                  <div key={row.label} className="flex justify-between py-[5px]">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium text-foreground">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )
      )}

      {showPagination && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={cn(
                'size-2 rounded-full bg-foreground transition-opacity',
                index === selected ? 'opacity-100' : 'opacity-30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
