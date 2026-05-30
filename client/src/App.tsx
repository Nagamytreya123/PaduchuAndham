import type { ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './context/AuthContext';
import { CustomerShell } from './layouts/CustomerShell';
import { AccountLayout } from './layouts/AccountLayout';
import { AdminShell } from './layouts/AdminShell';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { WishlistPage } from './pages/WishlistPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { LoginPage } from './pages/LoginPage';
import { AccountPage } from './pages/account/AccountPage';
import { OrdersPage } from './pages/account/OrdersPage';
import { SavedAddressesPage } from './pages/account/SavedAddressesPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminJewelleryCombosPage } from './pages/admin/AdminJewelleryCombosPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminReviewsPage } from './pages/admin/AdminReviewsPage';
import { JewelleryComboDetailPage } from './pages/JewelleryComboDetailPage';

function ProtectedCustomer({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress color="inherit" />
      </Box>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function ProtectedAdmin({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route element={<CustomerShell />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="wishlist" element={<WishlistPage />} />
        <Route path="products/:id" element={<ProductDetailPage />} />
        <Route path="jewellery-combos/:id" element={<JewelleryComboDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route
          path="checkout"
          element={
            <ProtectedCustomer>
              <CheckoutPage />
            </ProtectedCustomer>
          }
        />
        <Route path="login" element={<LoginPage />} />
        <Route
          path="account"
          element={
            <ProtectedCustomer>
              <AccountLayout />
            </ProtectedCustomer>
          }
        >
          <Route index element={<AccountPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="addresses" element={<SavedAddressesPage />} />
        </Route>
      </Route>

      <Route
        path="admin"
        element={
          <ProtectedAdmin>
            <AdminShell />
          </ProtectedAdmin>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="jewellery-combos" element={<AdminJewelleryCombosPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
