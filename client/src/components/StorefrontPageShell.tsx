import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import { StorefrontHeader } from './StorefrontHeader';
import { shopSurface } from '../constants/shopSurface';

type Props = {
  children: ReactNode;
  /** Inner content max width (px) */
  maxWidth?: number;
};

/** Cream editorial page frame — matches Home / Shop (header + padded main). */
export function StorefrontPageShell({ children, maxWidth = 720 }: Props) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: shopSurface.cream,
        color: shopSurface.ink,
        pb: { xs: 10, sm: 4 },
      }}
    >
      <StorefrontHeader />
      <Box
        component="main"
        sx={{
          width: '100%',
          maxWidth,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pt: { xs: 2.5, sm: 3 },
          pb: 4,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
