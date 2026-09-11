import { StrictMode } from 'react';
import './index.css';
import { scheduleIdleTask } from './utils/scheduleIdleTask';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { ToastProvider } from './context/ToastContext';
import { App } from './App';

scheduleIdleTask(() => {
  void import('./fonts');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <CategoriesProvider>
            <CartProvider>
              <WishlistProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </WishlistProvider>
            </CartProvider>
          </CategoriesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
