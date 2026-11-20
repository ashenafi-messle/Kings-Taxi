import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kings Taxi — Super Admin Operations Portal',
  description:
    'Central operational management interface for Kings Taxi mobility and tourism platform. Monitoring fleet, live GPS rides, hotel inventory, and heritage destinations across Gondar and Ethiopia.',
  icons: {
    icon: '/branding/kings-taxi-official-auth-logo.jpg',
    apple: '/branding/kt-crown-app-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
