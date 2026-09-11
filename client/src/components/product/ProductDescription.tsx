import { useLayoutEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { shopSurface } from '../../constants/shopSurface';

const DESCRIPTION_LINES = 3;

const toggleButtonSx = {
  ...shopSurface.pdpTypography.body,
  color: 'primary.main',
  fontWeight: 600,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  p: 0,
  whiteSpace: 'nowrap',
  '&:hover': { textDecoration: 'underline' },
} as const;

type ProductDescriptionProps = {
  description: string;
};

export function ProductDescription({ description }: ProductDescriptionProps) {
  const text = description.trim();
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      setIsTruncated(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  if (!text) return null;

  return (
    <Box sx={{ position: 'relative', mb: 3 }}>
      <Typography
        ref={textRef}
        sx={{
          ...shopSurface.pdpTypography.body,
          color: 'text.secondary',
          whiteSpace: 'pre-line',
          ...(expanded
            ? {}
            : {
                display: '-webkit-box',
                WebkitLineClamp: DESCRIPTION_LINES,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }),
        }}
      >
        {text}
      </Typography>
      {!expanded && isTruncated ? (
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            display: 'inline-flex',
            alignItems: 'baseline',
            pl: 3,
            background: `linear-gradient(to right, transparent, ${shopSurface.cream} 40%)`,
          }}
        >
          <Typography component="button" type="button" onClick={() => setExpanded(true)} sx={toggleButtonSx}>
            More
          </Typography>
        </Box>
      ) : null}
      {expanded && isTruncated ? (
        <Typography
          component="button"
          type="button"
          onClick={() => setExpanded(false)}
          sx={{ ...toggleButtonSx, mt: 0.75, display: 'inline-block' }}
        >
          Less
        </Typography>
      ) : null}
    </Box>
  );
}
