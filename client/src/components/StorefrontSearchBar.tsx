import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputBase from '@mui/material/InputBase';
import CircularProgress from '@mui/material/CircularProgress';
import { apiFetch } from '../api/client';
import { shopSurface } from '../constants/shopSurface';
import { IconClose, IconSearch } from '../icons';
import type { ProductSummary } from '../types/product';
import { formatInrFromPaise } from '../utils/format';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK, resolveMediaUrl } from '../utils/productImage';
import { useCategories } from '../context/CategoriesContext';

type Variant = 'light' | 'dark';

type StorefrontSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  variant?: Variant;
  placeholder?: string;
  scrollTargetId?: string;
};

const variantStyles: Record<
  Variant,
  {
    shell: object;
    input: object;
    icon: string;
    placeholder: string;
    panel: object;
    hint: string;
    accent: string;
  }
> = {
  light: {
    shell: {
      bgcolor: 'rgba(255, 255, 255, 0.88)',
      border: '1px solid rgba(5, 11, 24, 0.1)',
      boxShadow: '0 10px 30px rgba(5, 11, 24, 0.08)',
    },
    input: { color: shopSurface.ink },
    icon: shopSurface.inkMuted,
    placeholder: shopSurface.inkMuted,
    panel: {
      bgcolor: '#ffffff',
      border: '1px solid rgba(5, 11, 24, 0.1)',
      boxShadow: '0 18px 40px rgba(5, 11, 24, 0.12)',
    },
    hint: shopSurface.inkMuted,
    accent: shopSurface.ink,
  },
  dark: {
    shell: {
      bgcolor: 'rgba(20, 20, 21, 0.82)',
      border: '1px solid rgba(214, 179, 106, 0.28)',
      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
      backdropFilter: 'blur(14px)',
    },
    input: { color: '#F5F0E6' },
    icon: '#B8A88E',
    placeholder: '#8A8175',
    panel: {
      bgcolor: '#1A1A1C',
      border: '1px solid rgba(214, 179, 106, 0.22)',
      boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45)',
    },
    hint: '#8A8175',
    accent: '#D6B36A',
  },
};

export function StorefrontSearchBar({
  value,
  onChange,
  onSubmit,
  variant = 'light',
  placeholder = 'Search watches, bracelets, rings, materials…',
  scrollTargetId,
}: StorefrontSearchBarProps) {
  const listId = useId();
  const navigate = useNavigate();
  const { labelFor } = useCategories();
  const styles = variantStyles[variant];
  const rootRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const q = draft.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const data = await apiFetch<{ products: ProductSummary[] }>(
            `/api/products?q=${encodeURIComponent(q)}`,
          );
          setSuggestions(data.products.slice(0, 6));
        } catch {
          setSuggestions([]);
        } finally {
          setLoading(false);
        }
      })();
    }, 220);

    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function commitSearch(nextValue: string) {
    const trimmed = nextValue.trim();
    onChange(trimmed);
    onSubmit(trimmed);
    setOpen(false);
    setActiveIndex(-1);
    if (scrollTargetId) {
      window.requestAnimationFrame(() => {
        document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  function selectProduct(product: ProductSummary) {
    setOpen(false);
    setActiveIndex(-1);
    onChange('');
    navigate(`/products/${product.id}`);
  }

  function handleSubmit() {
    commitSearch(draft);
  }

  const showPanel = open && draft.trim().length >= 2;

  return (
    <Box ref={rootRef} sx={{ position: 'relative', width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderRadius: 999,
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          ...styles.shell,
          ...(open && {
            borderColor: variant === 'dark' ? 'rgba(214, 179, 106, 0.55)' : 'rgba(5, 11, 24, 0.22)',
            boxShadow:
              variant === 'dark'
                ? '0 0 0 1px rgba(214, 179, 106, 0.18), 0 16px 40px rgba(0, 0, 0, 0.4)'
                : '0 12px 32px rgba(5, 11, 24, 0.12)',
          }),
        }}
      >
        <IconSearch sx={{ color: styles.icon, fontSize: 22, flexShrink: 0 }} />
        <InputBase
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (suggestions.length > 0) {
                setActiveIndex((index) => (index + 1) % suggestions.length);
              }
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              if (suggestions.length > 0) {
                setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
              }
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              if (activeIndex >= 0 && suggestions[activeIndex]) {
                selectProduct(suggestions[activeIndex]);
                return;
              }
              handleSubmit();
              return;
            }
            if (event.key === 'Escape') {
              setOpen(false);
              setActiveIndex(-1);
            }
          }}
          placeholder={placeholder}
          inputProps={{
            'aria-label': 'Search products',
            'aria-controls': showPanel ? listId : undefined,
            'aria-expanded': showPanel,
            'aria-autocomplete': 'list',
            role: 'combobox',
          }}
          sx={{
            flex: 1,
            fontFamily: shopSurface.font.body,
            fontSize: { xs: '0.95rem', sm: '1rem' },
            ...styles.input,
            '& input::placeholder': {
              color: styles.placeholder,
              opacity: 1,
            },
          }}
        />
        {loading ? (
          <CircularProgress size={18} sx={{ color: styles.icon, flexShrink: 0 }} />
        ) : null}
        {draft ? (
          <IconButton
            size="small"
            aria-label="Clear search"
            onClick={() => {
              setDraft('');
              onChange('');
              onSubmit('');
              setSuggestions([]);
              setOpen(false);
            }}
            sx={{ color: styles.icon }}
          >
            <IconClose fontSize="small" />
          </IconButton>
        ) : null}
      </Box>

      {showPanel ? (
        <Box
          id={listId}
          role="listbox"
          sx={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            right: 0,
            zIndex: 20,
            borderRadius: 2.5,
            overflow: 'hidden',
            ...styles.panel,
          }}
        >
          {suggestions.length === 0 && !loading ? (
            <Box sx={{ px: 2, py: 1.75 }}>
              <Typography sx={{ fontFamily: shopSurface.font.body, fontSize: '0.92rem', color: styles.hint }}>
                No matching pieces yet. Try a product name, material, or category.
              </Typography>
            </Box>
          ) : (
            suggestions.map((product, index) => {
              const image = resolveMediaUrl(product.images[0]) || PRODUCT_IMAGE_FALLBACK;
              const selected = index === activeIndex;
              return (
                <Box
                  key={product.id}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectProduct(product)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 1.25,
                    py: 1,
                    cursor: 'pointer',
                    bgcolor: selected
                      ? variant === 'dark'
                        ? 'rgba(214, 179, 106, 0.12)'
                        : 'rgba(5, 11, 24, 0.05)'
                      : 'transparent',
                    borderBottom:
                      index < suggestions.length - 1
                        ? `1px solid ${variant === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(5,11,24,0.06)'}`
                        : 'none',
                  }}
                >
                  <Box
                    component="img"
                    src={image}
                    alt=""
                    onError={handleProductImageError}
                    sx={{
                      width: 44,
                      height: 55,
                      objectFit: 'cover',
                      borderRadius: 1,
                      flexShrink: 0,
                      bgcolor: '#E8E8E8',
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: shopSurface.font.display,
                        fontSize: '0.98rem',
                        color: variant === 'dark' ? '#F5F0E6' : shopSurface.ink,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: shopSurface.font.body,
                        fontSize: '0.78rem',
                        color: styles.hint,
                        mt: 0.25,
                      }}
                    >
                      {labelFor(product.category)}
                      {product.subcategory ? ` · ${product.subcategory}` : ''}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      ...shopSurface.amount,
                      fontSize: '0.82rem',
                      color: styles.accent,
                      flexShrink: 0,
                    }}
                  >
                    {formatInrFromPaise(product.price)}
                  </Typography>
                </Box>
              );
            })
          )}
          {suggestions.length > 0 ? (
            <Box
              onClick={handleSubmit}
              sx={{
                px: 2,
                py: 1.1,
                borderTop: `1px solid ${variant === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(5,11,24,0.06)'}`,
                cursor: 'pointer',
                bgcolor: variant === 'dark' ? 'rgba(214, 179, 106, 0.08)' : 'rgba(5, 11, 24, 0.03)',
              }}
            >
              <Typography
                sx={{
                  fontFamily: shopSurface.font.body,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: styles.accent,
                }}
              >
                View all results for “{draft.trim()}”
              </Typography>
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
