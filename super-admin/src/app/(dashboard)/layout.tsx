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

  // Restore sidebar collapsed preference on client mount and verify mandatory security status
  useEffect(() => {
    setMounted(true);
    const session = AuthService.getStoredSession();
    if (session.user?.mustChangePassword) {
      router.push('/change-password');
      return;
    }

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
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header */}
        <AdminHeader
          onToggleMobileSidebar={() => setIsMobileOpen(!isMobileOpen)}
          isCollapsed={mounted ? isCollapsed : false}
          onToggleCollapse={handleToggleCollapse}
        />

        {/* Demonstration Mode Banner (Warm Palette) */}
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
              <strong>Kings Taxi Super Admin:</strong> Real-Time Operations Telemetry Simulation Active (Gondar, Ethiopia • Currency: ETB).
            </span>
          </div>
          <div className="d-none d-md-flex align-items-center gap-3 text-secondary flex-shrink-0">
            <span className="demo-data-badge">DEMO MODE</span>
            <span>Version 1.1</span>
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
          className="border-top py-3 px-3 px-md-4 text-center text-md-start"
          style={{
            backgroundColor: '#FFFDF7',
            borderColor: '#E8E3D8',
          }}
        >
          <div className="d-flex flex-column flex-md-row align-items-center justify-content-between text-muted text-xs">
            <div>
              © {new Date().getFullYear()} Kings Taxi Mobility & Tourism Platform. All rights reserved.
            </div>
            <div className="d-flex align-items-center gap-2 gap-md-3 mt-2 mt-md-0">
              <span>Central Operations: Piassa, Gondar, Ethiopia</span>
              <span>•</span>
              <span>Currency: Ethiopian Birr (ETB)</span>
            </div>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .dashboard-main-wrapper {
          margin-left: 0;
        }
        @media (min-width: 992px) {
          .dashboard-main-wrapper {
            margin-left: 260px;
          }
          .dashboard-main-wrapper.sidebar-collapsed {
            margin-left: 76px;
          }
        }
      `}</style>
    </div>
  );
}
