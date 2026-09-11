import * as React from 'react';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
  type MotionValue,
} from 'motion/react';

import { cn } from '@/lib/utils';
import { formatInrFromPaise } from '@/utils/format';
import { SansDigitsText } from '@/components/SansDigitsText';
import { handleProductImageError } from '@/utils/productImage';
import { Badge } from '@/components/ui/badge';

export interface CarouselSlide {
  image: string;
  title: string;
  description?: string;
  badge?: string;
  pricePaise?: number;
  compareAtPaise?: number;
  discountPercent?: number;
  productId?: string;
}

interface CarouselConfig {
  distanceDivisor: number;
  velocityDivisor: number;
  sensitivity: number;
  xMultiplier: number;
  yMultiplier: number;
  rotationMultiplier: number;
  scaleReduction: number;
}

const getCarouselConfig = (width: number): CarouselConfig => {
  if (width < 640) {
    return {
      distanceDivisor: 120,
      velocityDivisor: 500,
      sensitivity: 180,
      xMultiplier: 90,
      yMultiplier: 20,
      rotationMultiplier: 8,
      scaleReduction: 0.06,
    };
  }
  if (width < 1024) {
    return {
      distanceDivisor: 160,
      velocityDivisor: 650,
      sensitivity: 220,
      xMultiplier: 130,
      yMultiplier: 30,
      rotationMultiplier: 10,
      scaleReduction: 0.09,
    };
  }
  return {
    distanceDivisor: 200,
    velocityDivisor: 800,
    sensitivity: 250,
    xMultiplier: 170,
    yMultiplier: 40,
    rotationMultiplier: 12,
    scaleReduction: 0.12,
  };
};

type CarouselStackedProps = {
  slides: CarouselSlide[];
  className?: string;
  heading?: string;
};

const CarouselStacked = ({ slides, className, heading = 'Best Sellers' }: CarouselStackedProps) => {
  const scrollProgress = useMotionValue(0);
  const startProgress = React.useRef(0);
  const [windowWidth, setWindowWidth] = React.useState(0);

  const total = slides.length;

  React.useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const config = React.useMemo(() => getCarouselConfig(windowWidth), [windowWidth]);

  const handleDragStart = () => {
    startProgress.current = scrollProgress.get();
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const dragDistance = info.offset.x;
    const velocity = info.velocity.x;

    const distanceShift = -dragDistance / config.distanceDivisor;
    const velocityShift = -velocity / config.velocityDivisor;

    let totalShift = Math.round(distanceShift + velocityShift);
    totalShift = Math.max(-3, Math.min(3, totalShift));

    const target = Math.round(startProgress.current) + totalShift;

    animate(scrollProgress, target, {
      type: 'spring',
      stiffness: 200,
      damping: 30,
      mass: 1,
    });
  };

  if (slides.length === 0) return null;

  return (
    <div
      className={cn(
        'flex w-full select-none flex-col items-center justify-center overflow-hidden bg-background',
        className,
      )}
    >
      {heading ? (
        <h3 className="mb-4 font-display text-lg font-medium uppercase tracking-[0.12em] text-brand-ink sm:text-xl">
          {heading}
        </h3>
      ) : null}
      <div className="relative flex h-80 w-full max-w-7xl items-center justify-center overflow-hidden rounded-[15px] bg-[#f0d78c42] sm:h-[28rem] lg:h-[32rem]">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragStart={handleDragStart}
          onDrag={(_, info) => {
            const delta = -info.delta.x / config.sensitivity;
            scrollProgress.set(scrollProgress.get() + delta);
          }}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 z-50 cursor-grab active:cursor-grabbing"
        />

        {slides.map((slide, i) => (
          <Card
            key={slide.productId ?? `${slide.title}-${i}`}
            slide={slide}
            index={i}
            total={total}
            progress={scrollProgress}
            config={config}
          />
        ))}
      </div>
    </div>
  );
};

interface CardProps {
  slide: CarouselSlide;
  index: number;
  total: number;
  progress: MotionValue<number>;
  config: CarouselConfig;
}

const Card = ({ slide, index, total, progress, config }: CardProps) => {
  const showCompare =
    slide.compareAtPaise != null &&
    slide.pricePaise != null &&
    slide.compareAtPaise > slide.pricePaise;

  const offset = useTransform(progress, (p) => {
    let diff = (index - p) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  });

  const x = useTransform(offset, (o) => o * config.xMultiplier);
  const rotate = useTransform(offset, (o) => {
    const absO = Math.abs(o);
    if (absO < 0.05) return 0;
    return o * config.rotationMultiplier;
  });
  const y = useTransform(offset, (o) => {
    const absO = Math.abs(o);
    if (absO < 0.05) return 0;
    return absO * config.yMultiplier;
  });
  const scale = useTransform(offset, (o) => 1 - Math.abs(o) * config.scaleReduction);
  const opacity = useTransform(
    offset,
    [-total / 2, -total / 2 + 0.5, 0, total / 2 - 0.5, total / 2],
    [0, 1, 1, 1, 0],
  );
  const zIndex = useTransform(offset, (o) => Math.round(100 - Math.abs(o) * 10));

  return (
    <motion.div
      style={{
        x,
        rotate,
        y,
        scale,
        opacity,
        zIndex,
      }}
      className={cn(
        'group pointer-events-none absolute overflow-hidden rounded-2xl bg-muted',
        'h-56 w-44 sm:h-80 sm:w-56 lg:h-96 lg:w-64',
      )}
    >
      <img
        src={slide.image}
        alt={slide.title}
        onError={handleProductImageError}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
      />

      <motion.div
        style={{
          opacity: useTransform(offset, [-2, -0.5, 0, 0.5, 2], [0.5, 0.2, 0, 0.2, 0.5]),
        }}
        className="pointer-events-none absolute inset-0 bg-black"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {slide.discountPercent != null ? (
        <Badge className="absolute left-3 top-3 rounded-full border-0 bg-[rgba(196,165,116,0.95)] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[#1a1410] shadow-md sm:left-5 sm:top-5 sm:px-3 sm:py-1 sm:text-xs lg:left-6 lg:top-6">
          {slide.discountPercent}% off
        </Badge>
      ) : null}

      {slide.badge ? (
        <Badge className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-widest text-black backdrop-blur-md sm:right-5 sm:top-5 sm:px-3 sm:py-1 sm:text-xs lg:right-6 lg:top-6">
          {slide.badge}
        </Badge>
      ) : null}

      <div className="absolute bottom-5 left-3 right-3 text-center text-white sm:bottom-8 sm:left-5 sm:right-5 sm:text-left lg:bottom-10 lg:left-6 lg:right-6">
        <motion.p
          style={{
            opacity: useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]),
          }}
          className="mb-1 text-sm font-bold leading-tight drop-shadow-md sm:text-lg lg:text-xl"
        >
          <SansDigitsText text={slide.title} digitClassName="font-sans tabular-nums lining-nums" />
        </motion.p>
        {slide.pricePaise != null ? (
          <motion.div
            style={{
              opacity: useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]),
            }}
            className="flex items-baseline justify-center gap-2 sm:justify-start"
          >
            <span className="font-sans text-sm font-semibold tabular-nums lining-nums text-[#c4a574] sm:text-base">
              {formatInrFromPaise(slide.pricePaise)}
            </span>
            {showCompare ? (
              <span className="font-sans text-xs tabular-nums lining-nums text-white/55 line-through sm:text-sm">
                {formatInrFromPaise(slide.compareAtPaise!)}
              </span>
            ) : null}
          </motion.div>
        ) : slide.description ? (
          <motion.p
            style={{
              opacity: useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]),
            }}
            className="hidden text-xs font-medium italic leading-snug text-white/70 line-clamp-2 sm:block"
          >
            {slide.description}
          </motion.p>
        ) : null}
      </div>
    </motion.div>
  );
};

export default CarouselStacked;
