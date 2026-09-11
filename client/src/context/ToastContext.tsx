import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

type ToastCtx = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((next: string) => {
    const trimmed = next.trim();
    if (!trimmed) return;
    setMessage(trimmed);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={message != null}
        autoHideDuration={2800}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 88, sm: 24 } }}
      >
        <Alert
          onClose={() => setMessage(null)}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            fontWeight: 600,
            bgcolor: '#c8ffca',
            color: '#1a3d1c',
            '& .MuiAlert-icon': { color: '#2d6a31' },
            '& .MuiAlert-action .MuiIconButton-root': { color: '#1a3d1c' },
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside ToastProvider');
  return ctx;
}
