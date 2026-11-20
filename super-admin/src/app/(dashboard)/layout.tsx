'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { AuthService } from '../../services/authService';
import { Sparkles } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Authenticate session and restore sidebar collapsed state
  useEffect(() => {
    setMounted(true);
    const session = AuthService.getStoredSession();

    // Enforce authentication: redirect unauthenticated sessions to /login
    if (!session.token || !session.user) {
      setIsAuthenticated(false);
      router.replace('/login');
      return;
    }

    setIsAuthenticated(true);

    const saved = localStorage.getItem('kt_sidebar_collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
  }, [router]);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('kt_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  };

  // Prevent dashboard content flashing before authentication verification
  if (isAuthenticated !== true) {
    return (
      <div
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-4"
        style={{ backgroundColor: '#F8F5EB' }}
      >
        <div
          className="spinner-border text-gold mb-3"
          style={{ width: '2.5rem', height: '2.5rem', color: '#E9B83F' }}
          role="status"
        />
        <div className="fw-bold text-obsidian text-sm" style={{ letterSpacing: '0.04em' }}>
          VERIFYING ADMINISTRATOR SESSION
        </div>
        <div className="text-secondary text-xs mt-1">Connecting to Kings Taxi central operations...</div>
      </div>
    );
  }

  return (
    <div className="min-vh-100" style={{ backgroundColor: '#F8F5EB' }}>
      {/* Sidebar (Desktop Permanent Collapsible & Mobile Offcanvas Drawer) */}
      <AdminSidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        isCollapsed={mounted ? isCollapsed : false}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div
        className={`dashboard-main-wrapper d-flex flex-column min-vh-100 ${
          mounted && isCollapsed ? 'sidebar-collapsed' : ''
        }`}
        style={{
          minWidth: 0,
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <AdminHeader
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
          isCollapsed={mounted ? isCollapsed : false}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Live Operations Telemetry Banner (Warm Palette) */}
        <div
          className="py-1.5 px-3 d-flex align-items-center justify-content-between"
          style={{
            backgroundColor: '#F2E9D5',
            color: '#252525',
            borderBottom: '1px solid #E8E3D8',
            fontSize: '0.78125rem',
          }}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden text-truncate">
            <Sparkles size={15} className="text-gold flex-shrink-0" />
            <span className="text-truncate">
              <strong>Kings Taxi Operations:</strong> Central Backend Live (Render • PostgreSQL on VPS • Gondar, Ethiopia).
            </span>
          </div>
          <div className="d-none d-md-flex align-items-center gap-3 text-secondary flex-shrink-0">
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-0.5 text-xs fw-semibold">
              ● PRODUCTION CONNECTED
            </span>
            <span>Version 2.0</span>
          </div>
        </div>

        {/* Main Page View Container */}
        <main className="flex-grow-1 p-2 p-sm-3 p-md-4" style={{ minWidth: 0 }}>
          <div className="container-fluid p-0" style={{ minWidth: 0 }}>
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer
          className="py-2.5 px-3 border-top mt-auto"
          style={{
            backgroundColor: '#FFFDF7',
            borderColor: '#E8E3D8',
            fontSize: '0.75rem',
            color: '#77736A',
          }}
        >
          <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2">
            <span>&copy; {new Date().getFullYear()} Kings Taxi Transportation & Tourism Logistics.</span>
            <span className="text-muted">Enterprise Super Admin Operations Terminal</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
