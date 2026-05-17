import Button, { type ButtonProps } from '@mui/material/Button';

export type MotionButtonProps = ButtonProps;

/**
 * Primary actions with GPU-friendly hover / active feedback (CSS transforms).
 */
export function MotionButton({ children, sx, ...rest }: MotionButtonProps) {
  return (
    <Button
      {...rest}
      sx={[
        {
          cursor: 'pointer',
          transition:
            'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
          '&:hover': {
            transform: 'translateY(-1px) scale(1.01)',
            boxShadow: (t) => t.shadows[6],
          },
          '&:active': { transform: 'scale(0.98)' },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Button>
  );
}
