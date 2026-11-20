'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Obsolete First-Login Password Change Page.
 * Automatically forwards to Settings / Dashboard as mandatory first-login password page has been removed.
 */
export default function ObsoleteChangePasswordPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return (
    <div
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-4"
      style={{ backgroundColor: '#F8F5EB' }}
    >
      <div className="spinner-border text-gold mb-3" style={{ width: '2.5rem', height: '2.5rem', color: '#E9B83F' }} role="status" />
      <div className="text-secondary small">Redirecting to administrator console...</div>
    </div>
  );
}
