import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Team Track 360 - Sports Team Management',
  description: 'Comprehensive sports team management platform for coaches, athletes, and parents',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
