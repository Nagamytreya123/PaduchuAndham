import React, { useState, useEffect, useRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export interface GalleryItem {
  common: string;
  binomial: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by: string;
  };
}

interface GalleryLayout {
  cardWidth: number;
  cardHeight: number;
  radius: number;
  perspective: number;
}

interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  /** Optional override for ring radius; otherwise derived from container width. */
  radius?: number;
  /** Controls the speed of auto-rotation when not scrolling. */
  autoRotateSpeed?: number;
}

function computeGalleryLayout(
  containerWidth: number,
  _itemCount: number,
  radiusOverride?: number,
): GalleryLayout {
  const padding = containerWidth < 640 ? 10 : 20;
  const available = Math.max(containerWidth - padding * 2, 200);

  let cardWidth: number;
  if (containerWidth < 640) {
    cardWidth = Math.round(Math.min(available * 0.48, 185));
  } else if (containerWidth < 1024) {
    cardWidth = Math.round(Math.min(available * 0.36, 380));
  } else {
    cardWidth = Math.round(Math.min(available * 0.42, 540));
  }

  cardWidth = Math.max(cardWidth, containerWidth < 640 ? 145 : 220);
  const cardHeight = Math.round(cardWidth * 1.25);

  // Wider ring than card width so rotation reads as a circle, not a tight cube.
  const ringRatio = containerWidth < 640 ? 1.2 : containerWidth < 1024 ? 1.55 : 2;
  const radius = radiusOverride ?? Math.round(cardWidth * ringRatio);
  const perspective = Math.round(Math.max(900, radius * 3.2));

  return { cardWidth, cardHeight, radius, perspective };
}

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius, autoRotateSpeed = 0.1, ...props }, ref) => {
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const [layout, setLayout] = useState<GalleryLayout>(() =>
      computeGalleryLayout(375, items.length, radius),
    );
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const node = containerRef.current;
      if (!node) return;

      const updateLayout = () => {
        setLayout(computeGalleryLayout(node.clientWidth, items.length, radius));
      };

      updateLayout();
      const observer = new ResizeObserver(updateLayout);
      observer.observe(node);
      return () => observer.disconnect();
    }, [items.length, radius]);

    useEffect(() => {
      const handleScroll = () => {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        const scrollRotation = scrollProgress * 360;
        setRotation(scrollRotation);

        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    useEffect(() => {
      const autoRotate = () => {
        if (!isScrolling) {
          setRotation((prev) => prev + autoRotateSpeed);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };

      animationFrameRef.current = requestAnimationFrame(autoRotate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isScrolling, autoRotateSpeed]);

    if (items.length === 0) return null;

    const anglePerItem = 360 / items.length;

    const { cardWidth, cardHeight, radius: ringRadius, perspective } = layout;

    return (
      <div
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        role="region"
        aria-label="Circular 3D Gallery"
        className={cn('relative flex h-full w-full items-center justify-center', className)}
        style={{ perspective: `${perspective}px` }}
        {...props}
      >
        <div
          className="relative h-full w-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = rotation % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(
              relativeAngle > 180 ? 360 - relativeAngle : relativeAngle,
            );
            const opacity = Math.max(0.3, 1 - normalizedAngle / 180);

            return (
              <div
                key={item.photo.url}
                role="group"
                aria-label={item.common}
                className="absolute"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  transform: `rotateY(${itemAngle}deg) translateZ(${ringRadius}px)`,
                  left: '50%',
                  top: '50%',
                  marginLeft: -cardWidth / 2,
                  marginTop: -cardHeight / 2,
                  opacity,
                  transition: 'opacity 0.3s linear',
                }}
              >
                <div className="group relative h-full w-full overflow-hidden rounded-md border-2 border-white/20 bg-black shadow-xl sm:rounded-lg sm:shadow-2xl">
                  <img
                    src={item.photo.url}
                    alt={item.photo.text}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: item.photo.pos || 'center' }}
                  />
                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-2.5 text-white sm:p-4">
                    <h2 className="text-xs font-bold leading-tight sm:text-xl">{item.common}</h2>
                    <p className="font-sans text-[0.7rem] font-semibold tabular-nums lining-nums not-italic opacity-90 sm:text-sm">
                      {item.binomial}
                    </p>
                    <p className="mt-1 hidden text-xs opacity-70 sm:mt-2 sm:block">
                      Photo by: {item.photo.by}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

CircularGallery.displayName = 'CircularGallery';

export { CircularGallery };
