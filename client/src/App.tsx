import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LuxuryShowcaseLoader } from './components/loading';
import { CustomerShell } from './layouts/CustomerShell';
import { AccountLayout } from './layouts/AccountLayout';
import { AdminShell } from './layouts/AdminShell';
import { AnalyticsListener } from './components/AnalyticsListener';
import { ScrollRestoration } from './components/ScrollRestoration';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const WishlistPage = lazy(() => import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage })));
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })),
);
const CartPage = lazy(() => import('./pages/CartPage').then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const OrderCompletionPage = lazy(() =>
  import('./pages/OrderCompletionPage').then((m) => ({ default: m.OrderCompletionPage })),
);
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AccountPage = lazy(() => import('./pages/account/AccountPage').then((m) => ({ default: m.AccountPage })));
const OrdersPage = lazy(() => import('./pages/account/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() =>
  import('./pages/account/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })),
);
const OrderItemDetailPage = lazy(() =>
  import('./pages/account/OrderItemDetailPage').then((m) => ({ default: m.OrderItemDetailPage })),
);
const SavedAddressesPage = lazy(() =>
  import('./pages/account/SavedAddressesPage').then((m) => ({ default: m.SavedAddressesPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/admin/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const AdminProductsPage = lazy(() =>
  import('./pages/admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })),
);
const AdminOrdersPage = lazy(() =>
  import('./pages/admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })),
);
const AdminReviewsPage = lazy(() =>
  import('./pages/admin/AdminReviewsPage').then((m) => ({ default: m.AdminReviewsPage })),
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })),
);
const ContactUsPage = lazy(() =>
  import('./pages/ContactUsPage').then((m) => ({ default: m.ContactUsPage })),
);

function RouteFallback({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return <LuxuryShowcaseLoader variant="fullscreen" tone={tone} aria-label="Loading page" />;
}

function ProtectedCustomer({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <LuxuryShowcaseLoader variant="fullscreen" tone="light" aria-label="Loading account" />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function ProtectedAdmin({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <LuxuryShowcaseLoader variant="fullscreen" tone="dark" aria-label="Loading admin" />;
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function App() {
  return (
    <>
      <AnalyticsListener />
      <ScrollRestoration />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<CustomerShell />}>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route
              path="checkout"
              element={
                <ProtectedCustomer>
                  <CheckoutPage />
                </ProtectedCustomer>
              }
            />
            <Route
              path="checkout/complete"
              element={
                <ProtectedCustomer>
                  <OrderCompletionPage />
                </ProtectedCustomer>
              }
            />
            <Route path="login" element={<LoginPage />} />
            <Route path="contact" element={<ContactUsPage />} />
            <Route
              path="account/*"
              element={
                <ProtectedCustomer>
                  <AccountLayout />
                </ProtectedCustomer>
              }
            >
              <Route index element={<AccountPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId/items/:productId" element={<OrderItemDetailPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
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
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="reviews" element={<AdminReviewsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
