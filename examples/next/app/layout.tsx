import type { ReactNode } from 'react';
import '@facadeur/ui/styles/tokens.css';
import '@facadeur/ui/styles/components.css';
import './globals.css';

export const metadata = {
  title: 'facadeur — generated components',
  description: 'Next.js app rendering React components generated from facadeur documents.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
