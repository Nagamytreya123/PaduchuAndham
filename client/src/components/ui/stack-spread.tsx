// Built using Hyperiux Vault: https://vault.hyperiux.com

import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const SCATTER_START = 0.12;
const SCATTER_END = 0.9;

const PARALLAX_X = 2.6;
const PARALLAX_Y = 2.2;
const PARALLAX_SPRING = { stiffness: 90, damping: 22, mass: 0.6 };
const parallaxDepth = (i: number, total: number) =>
  total <= 1 ? 1 : 0.55 + (i / (total - 1)) * 0.75;

const RESPONSIVE = {
  desktop: {
    scale: null as number | null,
    small: false,
    colX: null as number | null,
    card: null as { w: number; h: number } | null,
  },
  small: {
    scale: 0.72,
    small: true,
    colX: 22,
    card: { w: 40, h: 20 },
  },
};

function useResponsive() {
  const [r, setR] = useState(RESPONSIVE.desktop);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const read = () => setR(mq.matches ? RESPONSIVE.small : RESPONSIVE.desktop);
    read();
    mq.addEventListener('change', read);
    return () => mq.removeEventListener('change', read);
  }, []);
  return r;
}

function usePointerParallax(active: boolean, enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, PARALLAX_SPRING);
  const y = useSpring(rawY, PARALLAX_SPRING);

  useEffect(() => {
    if (!enabled) return;

    if (!active) {
      rawX.set(0);
      rawY.set(0);
      return;
    }

    const onMove = (event: PointerEvent) => {
      rawX.set((event.clientX / window.innerWidth) * 2 - 1);
      rawY.set((event.clientY / window.innerHeight) * 2 - 1);
    };
    const onLeave = () => {
      rawX.set(0);
      rawY.set(0);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [active, enabled, rawX, rawY]);

  return { x, y };
}

export interface StackSpreadItem {
  src: string;
  alt?: string;
  href?: string;
}

export interface StackSpreadTarget {
  x: number;
  y: number;
  rotate: number;
  scale?: number;
  w: number;
  h: number;
}

export interface StackSpreadCard {
  item: StackSpreadItem;
  target: StackSpreadTarget;
  targetSm?: { x: number; y: number };
  stackRotate?: number;
  stackOffset?: { x: number; y: number };
  z?: number;
}

function Card({
  card,
  progress,
  reduce,
  clusterRotation,
  scaleMul,
  isSmall,
  colX,
  fixedCard,
  stackScale,
  cardRadius,
  pointer,
  depth,
}: {
  card: StackSpreadCard;
  progress: MotionValue<number>;
  reduce: boolean | null;
  clusterRotation: boolean;
  scaleMul: number | null;
  isSmall: boolean;
  colX: number | null;
  fixedCard: { w: number; h: number } | null;
  stackScale: number;
  cardRadius: number;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  depth: number;
}) {
  const { item, target } = card;

  const flat = reduce === true;
  const stackRotate = flat ? 0 : clusterRotation ? card.stackRotate ?? 0 : 0;
  const stackOffset = card.stackOffset ?? { x: 0, y: 0 };
  const restScale = scaleMul ?? target.scale ?? 1;

  const sm = isSmall && card.targetSm ? card.targetSm : null;
  const endX = sm
    ? colX != null
      ? Math.sign(sm.x) * colX
      : sm.x
    : target.x;
  const endY = sm ? sm.y : target.y;
  const endRotate = flat || isSmall ? 0 : target.rotate;

  const translate = useTransform(
    [progress, pointer.x, pointer.y],
    ([p, px, py]: number[]) => {
      const tx = stackOffset.x + (endX - stackOffset.x) * p;
      const ty = stackOffset.y + (endY - stackOffset.y) * p;
      const drift = depth * p;
      const dx = tx - px * PARALLAX_X * drift;
      const dy = ty - py * PARALLAX_Y * drift;
      return `calc(-50% + ${dx}vw) calc(-50% + ${dy}vh)`;
    },
  );
  const rotate = useTransform(progress, [0, 1], [stackRotate, endRotate]);
  const scale = useTransform(progress, [0, 1], [stackScale, restScale]);

  return (
    <motion.div
      className={`absolute left-1/2 top-1/2 will-change-transform${item.href ? ' pointer-events-auto' : ''}`}
      style={{
        width: `${fixedCard ? fixedCard.w : target.w}vw`,
        height: `${fixedCard ? fixedCard.h : target.h}vh`,
        zIndex: card.z ?? 1,
        translate,
        rotate,
        scale,
      }}
    >
      <CardFace item={item} cardRadius={cardRadius} />
    </motion.div>
  );
}

function CardFace({
  item,
  cardRadius,
}: {
  item: StackSpreadItem;
  cardRadius: number;
}) {
  const image = (
    <img
      src={item.src}
      alt={item.alt ?? ''}
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );

  if (item.href) {
    return (
      <Link
        to={item.href}
        aria-label={item.alt ? `View ${item.alt}` : 'View product'}
        className="relative block h-full w-full overflow-hidden transition-opacity hover:opacity-95 max-md:rounded-[4vw]"
        style={{ borderRadius: `${cardRadius}px`, textDecoration: 'none' }}
      >
        {image}
      </Link>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden max-md:rounded-[4vw]"
      style={{ borderRadius: `${cardRadius}px` }}
    >
      {image}
    </div>
  );
}

interface StackSpreadStageProps {
  cards: StackSpreadCard[];
  scrollLength?: number;
  bgColor?: string;
  clusterRotation?: boolean;
  stackScale?: number;
  cardRadius?: number;
  textColor?: string;
  textFadeStart?: number;
  showScrollHint?: boolean;
  headline?: string;
  headlineLead?: string;
  headlineHighlight?: string;
  shopTo?: string;
  accentColor?: string;
}

function StackSpreadStage({
  cards,
  scrollLength = 350,
  bgColor = '#ececeb',
  clusterRotation = true,
  stackScale = 0.82,
  cardRadius = 8,
  textColor = '#141414',
  textFadeStart = 0.3,
  showScrollHint = true,
  headline = 'Elegance That Responds.',
  headlineLead,
  headlineHighlight,
  shopTo,
  accentColor = '#E8487A',
}: StackSpreadStageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scale: scaleMul, small: isSmall, colX, card: fixedCard } =
    useResponsive();

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ['start start', 'end end'],
  });

  const progress = useTransform(
    scrollYProgress,
    [0, SCATTER_START, SCATTER_END, 1],
    [0, 0, 1, 1],
  );

  const [spread, setSpread] = useState(false);
  useMotionValueEvent(progress, 'change', (p) => {
    setSpread((was) => (was ? p > 0.985 : p >= 0.999));
  });
  const parallaxEnabled = reduce !== true && !isSmall;
  const pointer = usePointerParallax(spread, parallaxEnabled);

  const noScale = reduce === true;
  const copyOpacity = useTransform(progress, [textFadeStart, textFadeStart + 0.35], [0, 1]);
  const copyScale = useTransform(progress, [textFadeStart, 0.9], [0.85, 1]);
  const hintOpacity = useTransform(progress, (p) => (p < SCATTER_START ? 1 : 0));

  const headlineParts = headline.split(' That ');
  const parsedHeadlineLead = headlineParts[0] ?? headline;
  const headlineTail = headlineParts.length > 1 ? `That ${headlineParts.slice(1).join(' That ')}` : '';

  function handleScrollHintClick() {
    window.scrollBy({ top: window.innerHeight * 0.18, behavior: 'smooth' });
  }

  return (
    <motion.section
      ref={wrapRef}
      className="relative w-full"
      style={{
        height: `${scrollLength}vh`,
        backgroundColor: bgColor,
      }}
    >
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ backgroundColor: bgColor }}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 z-20 flex -translate-y-[3vh] flex-col items-center justify-center px-6 text-center max-md:-translate-y-4 max-md:px-8"
          style={{
            opacity: copyOpacity,
            scale: noScale ? 1 : copyScale,
          }}
        >
          <h2
            className="mt-0 w-full whitespace-pre-line font-display text-[4.5vw] font-normal leading-none tracking-tight max-md:text-[10vw]"
            style={{ color: textColor }}
          >
            {headlineHighlight ? (
              <>
                {headlineLead ?? 'Explore our'}
                {' '}
                <span style={{ color: accentColor }}>{headlineHighlight}</span>
              </>
            ) : headlineTail ? (
              <>
                {parsedHeadlineLead}
                <span className="opacity-60"> That </span>
                {headlineTail.replace(/^That /, '')}
              </>
            ) : (
              headline
            )}
          </h2>
          {shopTo ? (
            <Link
              to={shopTo}
              className="pointer-events-auto relative z-10 inline-flex min-h-10 items-center justify-center rounded-full px-6 py-2 text-[1vw] font-medium tracking-wide no-underline transition-opacity hover:no-underline hover:opacity-90 max-md:min-h-9 max-md:px-5 max-md:text-sm"
              style={{
                backgroundColor: accentColor,
                color: '#FFFFFF',
                textDecoration: 'none',
              }}
            >
              Shop Now
            </Link>
          ) : null}
        </motion.div>

        <div className="pointer-events-none absolute inset-0 z-10">
          {cards.map((card, i) => (
            <Card
              key={i}
              card={card}
              progress={progress}
              reduce={reduce}
              clusterRotation={clusterRotation}
              scaleMul={scaleMul}
              isSmall={isSmall}
              colX={colX}
              fixedCard={fixedCard}
              stackScale={stackScale}
              cardRadius={cardRadius}
              pointer={pointer}
              depth={parallaxEnabled ? parallaxDepth(i, cards.length) : 0}
            />
          ))}
        </div>

        {showScrollHint && (
          <motion.div
            className="absolute inset-x-0 z-40 flex justify-center max-md:top-[72%] md:bottom-8"
            style={{ opacity: hintOpacity }}
          >
            <button
              type="button"
              onClick={handleScrollHintClick}
              className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] shadow-sm backdrop-blur-sm transition-opacity hover:opacity-90 sm:text-sm"
              style={{
                color: textColor,
                backgroundColor: 'rgba(255, 255, 255, 0.72)',
                border: `1px solid rgba(5, 11, 24, 0.08)`,
              }}
              aria-label="Scroll to explore"
            >
              <span>Scroll</span>
              <ChevronDown
                className="animate-bounce"
                size={18}
                strokeWidth={2.25}
                aria-hidden="true"
              />
            </button>
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}

export interface StackSpreadProps {
  cards: StackSpreadCard[];
  scrollLength?: number;
  bgColor?: string;
  clusterRotation?: boolean;
  stackScale?: number;
  cardRadius?: number;
  textColor?: string;
  textFadeStart?: number;
  showScrollHint?: boolean;
  headline?: string;
  headlineLead?: string;
  headlineHighlight?: string;
  shopTo?: string;
  accentColor?: string;
}

export default function StackSpread({
  cards,
  scrollLength = 350,
  bgColor = '#ececeb',
  clusterRotation = true,
  stackScale = 0.82,
  cardRadius = 8,
  textColor = '#141414',
  textFadeStart = 0.3,
  showScrollHint = true,
  headline,
  headlineLead,
  headlineHighlight,
  shopTo,
  accentColor,
}: StackSpreadProps) {
  return (
    <StackSpreadStage
      cards={cards}
      scrollLength={scrollLength}
      bgColor={bgColor}
      clusterRotation={clusterRotation}
      stackScale={stackScale}
      cardRadius={cardRadius}
      textColor={textColor}
      textFadeStart={textFadeStart}
      showScrollHint={showScrollHint}
      headline={headline}
      headlineLead={headlineLead}
      headlineHighlight={headlineHighlight}
      shopTo={shopTo}
      accentColor={accentColor}
    />
  );
}
