import type { ReactNode } from 'react';
import Dialog, { type DialogProps } from '@mui/material/Dialog';
import Fade from '@mui/material/Fade';
import { alpha, useTheme } from '@mui/material/styles';

export type PremiumModalProps = DialogProps & {
  children: ReactNode;
};

/**
 * Dialog shell with premium glass paper, long ease fade, and deep shadow.
 * Keeps MUI transition for correct mount/unmount semantics.
 */
export function PremiumModal({ children, PaperProps, TransitionComponent = Fade, TransitionProps, ...rest }: PremiumModalProps) {
  const theme = useTheme();
  return (
    <Dialog
      TransitionComponent={TransitionComponent}
      TransitionProps={{
        timeout: { enter: 420, exit: 240 },
        ...TransitionProps,
      }}
      PaperProps={{
        ...PaperProps,
        sx: [
          {
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
            background: `linear-gradient(165deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(
              '#121214',
              0.96,
            )} 55%, ${alpha('#0c0c0e', 0.98)} 100%)`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 28px 90px ${alpha('#000', 0.65)}, 0 0 0 1px ${alpha('#fff', 0.03)} inset`,
            overflow: 'hidden',
          },
          ...(Array.isArray(PaperProps?.sx) ? PaperProps!.sx! : PaperProps?.sx ? [PaperProps.sx] : []),
        ],
      }}
      {...rest}
    >
      {children}
    </Dialog>
  );
}
