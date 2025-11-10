'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show navigation on login or root page
  const showNavigation = pathname !== '/login' && pathname !== '/';

  return (
    <>
      {showNavigation && <Navigation />}
      {children}
    </>
  );
}
