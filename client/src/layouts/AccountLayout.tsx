import { Outlet } from 'react-router-dom';
import { StorefrontPageShell } from '../components/StorefrontPageShell';

export function AccountLayout() {
  return (
    <StorefrontPageShell maxWidth={520}>
      <Outlet />
    </StorefrontPageShell>
  );
}
