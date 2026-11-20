'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="text-center py-5">
      <div className="spinner-border text-gold" role="status" />
    </div>
  );
}
