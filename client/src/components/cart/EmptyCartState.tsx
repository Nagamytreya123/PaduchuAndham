import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconBag, IconChevronLeft, IconChevronRight, IconHeart, IconReviews } from '../../icons';
import { editorialSurface } from '../../constants/editorialSurface';
import {
  BRACELET_CATEGORY_TILE_IMAGE,
  COMBO_CATEGORY_TILE_IMAGE,
  JEWELLERY_CATEGORY_TILE_IMAGES,
  WATCH_CATEGORY_TILE_IMAGE,
} from '../../constants/categoryTileImages';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ACCENT_GOLD = '#C5A059';

const DISCOVERY_CATEGORIES = [
  {
    title: 'Jewellery',
    subtitle: 'Curated pieces',
    image: JEWELLERY_CATEGORY_TILE_IMAGES.Necklaces,
    to: '/shop?category=Jewellery',
  },
  {
    title: 'Watches',
    subtitle: 'Precision time',
    image: WATCH_CATEGORY_TILE_IMAGE,
    to: '/shop?category=Watches',
  },
  {
    title: 'Bracelets',
    subtitle: 'Fine details',
    image: BRACELET_CATEGORY_TILE_IMAGE,
    to: '/shop?category=Bracelets',
  },
  {
    title: 'Combos',
    subtitle: 'Complete sets',
    image: COMBO_CATEGORY_TILE_IMAGE,
    to: '/shop?category=Combos',
  },
] as const;

const FLOATER_ICONS = [
  { node: <IconReviews sx={{ fontSize: '2rem' }} />, top: -16, left: -32, delay: '0.2s' },
  { node: <IconHeart sx={{ fontSize: '2.25rem' }} />, top: '25%', right: -48, delay: '1s' },
  { node: <IconBag sx={{ fontSize: '2rem' }} />, bottom: -16, left: '45%', delay: '1.5s' },
];

type Particle = { id: number; left: number; color: string; icon: 'star' | 'heart' | 'bag' };

function ParticleIcon({ kind }: { kind: Particle['icon'] }) {
  if (kind === 'heart') return <IconHeart sx={{ fontSize: '1.25rem' }} />;
  if (kind === 'bag') return <IconBag sx={{ fontSize: '1.25rem' }} />;
  return <IconReviews sx={{ fontSize: '1.25rem' }} />;
}

export function EmptyCartState() {
  const reduced = useReducedMotion();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleId = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const colors = [ACCENT_GOLD, '#2D5A27', editorialSurface.onPrimary];
    const icons: Particle['icon'][] = ['star', 'heart', 'bag'];
    let count = 0;
    const interval = window.setInterval(() => {
      const id = particleId.current++;
      const next: Particle = {
        id,
        left: (Math.random() - 0.5) * 60,
        color: colors[Math.floor(Math.random() * colors.length)]!,
        icon: icons[Math.floor(Math.random() * icons.length)]!,
      };
      setParticles((prev) => [...prev.slice(-8), next]);
      window.setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, 4000);
      count += 1;
      if (count >= 8) window.clearInterval(interval);
    }, 400);
    return () => window.clearInterval(interval);
  }, [reduced]);

  function scrollCarousel(delta: number) {
    carouselRef.current?.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
  }

  const fadeUp = reduced
    ? { initial: false, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        color: editorialSurface.onSurface,
        fontFamily: editorialSurface.font.body,
        '@keyframes emptyCartFloat': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        '@keyframes emptyCartBreathing': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 24px 48px rgba(0,0,0,0.12)' },
          '50%': { transform: 'scale(1.02)', boxShadow: `0 28px 56px rgba(197, 160, 89, 0.18)` },
        },
        '@keyframes emptyCartParticleUp': {
          '0%': { transform: 'translateY(0) scale(0.5)', opacity: 0 },
          '20%': { opacity: 1 },
          '80%': { opacity: 1 },
          '100%': { transform: 'translateY(-120px) scale(0)', opacity: 0 },
        },
        '@keyframes emptyCartAmbient': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(10px, -15px)' },
          '66%': { transform: 'translate(-10px, 10px)' },
        },
      }}
    >
      {/* Ambient background */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: 400,
            height: 400,
            top: -80,
            left: -80,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(197, 160, 89, 0.22) 0%, transparent 70%)`,
            animation: reduced ? 'none' : 'emptyCartAmbient 15s ease-in-out infinite',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: 300,
            height: 300,
            bottom: '25%',
            right: -40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(45, 90, 39, 0.1) 0%, transparent 70%)',
            animation: reduced ? 'none' : 'emptyCartAmbient 15s ease-in-out infinite',
            animationDelay: '-5s',
          }}
        />
      </Box>

      <Box
        component="section"
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          px: { xs: 1, sm: 2 },
          pt: { xs: 2, sm: 4 },
          pb: { xs: 6, sm: 8 },
        }}
      >
        {/* Bag stage */}
        <Box
          sx={{
            position: 'relative',
            width: { xs: 288, md: 384 },
            height: { xs: 288, md: 384 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: { xs: 4, md: 6 },
          }}
        >
          {!reduced &&
            FLOATER_ICONS.map((item, i) => (
              <Box
                key={i}
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: item.top,
                  left: item.left,
                  right: item.right,
                  bottom: item.bottom,
                  color: `${ACCENT_GOLD}66`,
                  opacity: 0.45,
                  animation: 'emptyCartFloat 6s ease-in-out infinite',
                  animationDelay: item.delay,
                }}
              >
                {item.node}
              </Box>
            ))}

          <Box
            component={motion.div}
            initial={reduced ? false : { opacity: 0, x: -80, rotate: -8 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 1.1, ease: [0.34, 1.56, 0.64, 1] }}
            sx={{
              position: 'relative',
              width: { xs: 224, md: 288 },
              height: { xs: 256, md: 320 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pb: 4,
              bgcolor: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.55)',
              borderRadius: '2px',
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
              overflow: 'visible',
              animation: reduced ? 'none' : 'emptyCartBreathing 4s ease-in-out 2.5s infinite',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '33%',
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)',
                pointerEvents: 'none',
              },
            }}
          >
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                top: -48,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 128,
                height: 128,
                border: '2px solid rgba(255,255,255,0.35)',
                borderRadius: '50%',
              }}
            />
            <Box sx={{ position: 'relative', zIndex: 1, color: '#D6B36A' }}>
              <IconBag sx={{ fontSize: { xs: '5.5rem', md: '7rem' } }} />
            </Box>
            {!reduced && (
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: '25%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                }}
              >
                {particles.map((p) => (
                  <Box
                    key={p.id}
                    sx={{
                      position: 'absolute',
                      left: p.left,
                      color: p.color,
                      animation: 'emptyCartParticleUp 4s ease-out forwards',
                    }}
                  >
                    <ParticleIcon kind={p.icon} />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduced ? 0 : 0.35 }}>
          <Typography
            component="h1"
            sx={{
              fontFamily: editorialSurface.font.headline,
              fontWeight: 300,
              fontSize: { xs: '2.25rem', md: '3.25rem' },
              letterSpacing: '-0.02em',
              color: editorialSurface.onSurface,
              mb: 2,
            }}
          >
            Your Cart Awaits
          </Typography>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduced ? 0 : 0.5 }}>
          <Typography
            sx={{
              fontFamily: editorialSurface.font.body,
              fontSize: { xs: '1rem', md: '1.125rem' },
              lineHeight: 1.65,
              color: editorialSurface.onSurfaceVariant,
              maxWidth: 420,
              mx: 'auto',
              mb: 4,
            }}
          >
            Looks like you haven&apos;t added any items yet. Explore our curated collection and discover
            something exceptional.
          </Typography>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: reduced ? 0 : 0.65 }}>
          <Button
            component={RouterLink}
            to="/shop"
            sx={{
              position: 'relative',
              px: 5,
              py: 2,
              bgcolor: editorialSurface.primary,
              color: editorialSurface.onPrimary,
              borderRadius: 0,
              fontFamily: editorialSurface.font.body,
              fontWeight: 500,
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              overflow: 'hidden',
              boxShadow: reduced ? 'none' : `0 0 0 0 rgba(197, 160, 89, 0.25)`,
              animation: reduced ? 'none' : 'emptyCartPulse 3s ease-in-out infinite',
              '@keyframes emptyCartPulse': {
                '0%, 100%': { boxShadow: '0 0 0 0 rgba(197, 160, 89, 0.2)' },
                '50%': { boxShadow: '0 0 20px 5px rgba(197, 160, 89, 0.35)' },
              },
              '&:hover': {
                bgcolor: '#000000',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                inset: 0,
                bgcolor: `${ACCENT_GOLD}33`,
                transform: 'translateY(100%)',
                transition: 'transform 0.45s ease',
              },
              '&:hover::after': {
                transform: 'translateY(0)',
              },
            }}
          >
            <Box component="span" sx={{ position: 'relative', zIndex: 1 }}>
              Continue shopping
            </Box>
          </Button>
        </motion.div>
      </Box>

      {/* Category discovery */}
      <Box
        component="section"
        sx={{
          position: 'relative',
          zIndex: 1,
          mt: { xs: 4, md: 8 },
          pb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            mb: 2.5,
            px: { xs: 0, md: 0 },
          }}
        >
          <Box>
            <Typography
              sx={{
                ...editorialSurface.label,
                color: editorialSurface.outline,
                letterSpacing: '0.3em',
                mb: 0.75,
                display: 'block',
              }}
            >
              Curation
            </Typography>
            <Typography
              sx={{
                fontFamily: editorialSurface.font.headline,
                fontWeight: 300,
                fontSize: { xs: '1.75rem', md: '2rem' },
                color: editorialSurface.onSurface,
              }}
            >
              Explore categories
            </Typography>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <IconButton
              aria-label="Scroll categories left"
              onClick={() => scrollCarousel(-324)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0,
                border: `1px solid ${editorialSurface.outlineVariant}`,
                color: editorialSurface.onSurface,
              }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              aria-label="Scroll categories right"
              onClick={() => scrollCarousel(324)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 0,
                border: `1px solid ${editorialSurface.outlineVariant}`,
                color: editorialSurface.onSurface,
              }}
            >
              <IconChevronRight />
            </IconButton>
          </Box>
        </Box>

        <Box
          ref={carouselRef}
          sx={{
            display: 'flex',
            gap: 3,
            overflowX: 'auto',
            pb: 2,
            mx: { xs: -2, sm: -3 },
            px: { xs: 2, sm: 3 },
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {DISCOVERY_CATEGORIES.map((cat) => (
            <Box
              key={cat.title}
              component={RouterLink}
              to={cat.to}
              sx={{
                flex: '0 0 auto',
                width: { xs: 260, sm: 300 },
                height: { xs: 360, sm: 420 },
                position: 'relative',
                overflow: 'hidden',
                scrollSnapAlign: 'start',
                textDecoration: 'none',
                color: 'inherit',
                '&:hover img': { transform: 'scale(1.08)' },
                '&:hover .empty-cart-overlay': { bgcolor: 'rgba(0,0,0,0.38)' },
                '&:hover .empty-cart-cat-line': { width: '100%' },
              }}
            >
              <Box
                component="img"
                src={cat.image}
                alt=""
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'transform 1s ease',
                }}
              />
              <Box
                className="empty-cart-overlay"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.22)',
                  transition: 'background-color 0.45s ease',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  p: 3,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: editorialSurface.font.headline,
                    fontSize: '1.5rem',
                    color: '#ffffff',
                    mb: 0.5,
                  }}
                >
                  {cat.title}
                </Typography>
                <Typography
                  sx={{
                    ...editorialSurface.label,
                    fontSize: '0.6875rem',
                    color: 'rgba(255,255,255,0.72)',
                    letterSpacing: '0.18em',
                  }}
                >
                  {cat.subtitle}
                </Typography>
                <Box
                  className="empty-cart-cat-line"
                  sx={{
                    height: '1px',
                    width: 0,
                    bgcolor: 'rgba(255,255,255,0.5)',
                    mt: 1.5,
                    transition: 'width 0.5s ease',
                  }}
                />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
