'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard,
  Navigation,
  History,
  Users,
  Car,
  UserCheck,
  Building2,
  Briefcase,
  CalendarCheck,
  Landmark,
  Compass,
  HelpCircle,
  Bell,
  UserCog,
  Settings,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { AuthService } from '../../services/authService';

export interface AdminSidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: 'gold' | 'danger' | 'success';
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupTitle: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Live Ride Monitor', href: '/ride-monitoring', icon: Navigation, badge: 'LIVE', badgeVariant: 'gold' },
      { label: 'Ride History', href: '/ride-history', icon: History },
    ],
  },
  {
    groupTitle: 'FLEET & MOBILITY',
    items: [
      { label: 'Drivers', href: '/drivers', icon: Users },
      { label: 'Fleet & Vehicles', href: '/vehicles', icon: Car },
      { label: 'Passengers', href: '/passengers', icon: UserCheck },
    ],
  },
  {
    groupTitle: 'TOURISM & HOSPITALITY',
    items: [
      { label: 'Hotel Partners', href: '/hotel-partners', icon: Briefcase },
      { label: 'Partner Hotels', href: '/hotels', icon: Building2 },
      { label: 'Hotel Bookings', href: '/hotel-bookings', icon: CalendarCheck },
      { label: 'Heritage Sites', href: '/heritage', icon: Landmark },
      { label: 'Heritage Tours', href: '/heritage-bookings', icon: Compass },
    ],
  },
  {
    groupTitle: 'PLATFORM MANAGEMENT',
    items: [
      { label: 'Support & Disputes', href: '/support', icon: HelpCircle, badge: '3', badgeVariant: 'danger' },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Administrators', href: '/administrators', icon: UserCog },
      { label: 'System Settings', href: '/settings', icon: Settings },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const pathname = usePathname();

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const handleLogout = async () => {
    await AuthService.logout();
    window.location.href = '/login';
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Reusable Nav Link Item
  const renderNavItem = (item: NavItem, collapsed: boolean, isMobile: boolean) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <div key={item.href} className={collapsed && !isMobile ? 'nav-tooltip-container' : ''}>
        <Link
          href={item.href}
          onClick={() => {
            if (isMobile) onCloseMobile();
          }}
          title={collapsed && !isMobile ? item.label : undefined}
          className={`d-flex align-items-center text-decoration-none transition-all ${
            collapsed && !isMobile
              ? 'justify-content-center p-2 rounded-3 mx-auto'
              : 'justify-content-between px-3 py-2 rounded-3 mx-1'
          }`}
          style={{
            backgroundColor: active ? 'rgba(233, 184, 63, 0.22)' : 'transparent',
            borderLeft: !collapsed || isMobile ? (active ? '3px solid #D99B19' : '3px solid transparent') : 'none',
            color: active ? '#252525' : '#77736A',
            fontWeight: active ? 700 : 500,
            fontSize: '0.875rem',
            width: collapsed && !isMobile ? '46px' : 'auto',
            height: collapsed && !isMobile ? '46px' : 'auto',
          }}
        >
          <div className="d-flex align-items-center gap-2.5">
            <Icon
              size={19}
              className={active ? 'text-gold' : 'text-secondary'}
              style={{ flexShrink: 0 }}
            />
            {(!collapsed || isMobile) && (
              <span className="text-truncate" style={{ maxWidth: '160px' }}>
                {item.label}
              </span>
            )}
          </div>

          {(!collapsed || isMobile) && item.badge && (
            <span
              className={`badge px-1.5 py-0.5 rounded-pill ${
                item.badgeVariant === 'gold'
                  ? 'bg-gold text-dark fw-bold'
                  : item.badgeVariant === 'danger'
                  ? 'bg-danger text-white'
                  : 'bg-success text-white'
              }`}
              style={{ fontSize: '0.65rem' }}
            >
              {item.badge}
            </span>
          )}
        </Link>

        {/* Hover Tooltip for Collapsed Desktop Mode */}
        {collapsed && !isMobile && (
          <div className="nav-tooltip">
            {item.label}
            {item.badge && ` (${item.badge})`}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP PERMANENT COLLAPSIBLE SIDEBAR (>= 992px)       */}
      {/* ======================================================== */}
      <aside
        className="d-none d-lg-flex flex-column"
        style={{
          width: isCollapsed ? '76px' : '260px',
          backgroundColor: '#FFFDF7',
          borderRight: '1px solid #E8E3D8',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1030,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Brand Header (Clickable Collapse / Expand Toggle) */}
        <div
          role="button"
          tabIndex={0}
          onClick={onToggleCollapse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleCollapse();
            }
          }}
          className={`d-flex align-items-center border-bottom user-select-none transition-all ${
            isCollapsed ? 'justify-content-center p-3' : 'justify-content-between px-3 py-3'
          }`}
          style={{
            height: '68px',
            borderColor: '#E8E3D8',
            cursor: 'pointer',
            backgroundColor: isCollapsed ? '#F8F5EB' : '#FFFDF7',
          }}
          title={isCollapsed ? 'Click logo to expand sidebar' : 'Click brand header to collapse sidebar'}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden w-100">
            <div
              className="position-relative overflow-hidden rounded-3 shadow-xs"
              style={{
                width: 38,
                height: 38,
                border: '1.5px solid #E9B83F',
                flexShrink: 0,
              }}
            >
              <Image
                src="/branding/kings-taxi-official-auth-logo.jpg"
                alt="Kings Taxi Crown"
                fill
                sizes="38px"
                style={{ objectFit: 'cover' }}
              />
            </div>

            {!isCollapsed && (
              <div className="overflow-hidden flex-grow-1">
                <div
                  className="fw-bold tracking-wider text-obsidian d-flex align-items-center justify-content-between"
                  style={{ fontSize: '0.95rem', letterSpacing: '0.04em' }}
                >
                  <span>KINGS TAXI</span>
                  <ChevronLeft size={16} className="text-muted" style={{ opacity: 0.7 }} />
                </div>
                <div className="d-flex align-items-center gap-1">
                  <span
                    className="badge px-1.5 py-0.5 text-uppercase fw-bold"
                    style={{
                      backgroundColor: '#E9B83F',
                      color: '#252525',
                      fontSize: '0.625rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    SUPER ADMIN
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#77736A' }}>• HQ</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="flex-grow-1 overflow-y-auto py-3 px-1 custom-scrollbar">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="mb-3">
              {!isCollapsed ? (
                <div
                  className="px-3 mb-1 text-uppercase fw-bold"
                  style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', color: '#77736A' }}
                >
                  {group.groupTitle}
                </div>
              ) : (
                <div className="d-flex justify-content-center my-2">
                  <div style={{ width: '24px', height: '1px', backgroundColor: '#E8E3D8' }} />
                </div>
              )}
              <nav className="nav flex-column gap-1">
                {group.items.map((item) => renderNavItem(item, isCollapsed, false))}
              </nav>
            </div>
          ))}
        </div>

        {/* User Card & Logout at bottom */}
        <div
          className="p-3 border-top d-flex align-items-center justify-content-between"
          style={{ borderColor: '#E8E3D8', backgroundColor: '#F2E9D5' }}
        >
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold shadow-xs"
              style={{
                width: 36,
                height: 36,
                backgroundColor: '#E9B83F',
                flexShrink: 0,
                fontSize: '0.875rem',
              }}
            >
              AM
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <div className="text-obsidian fw-bold text-truncate small">Ashenafi Messle</div>
                <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>
                  Super Admin
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              className="btn btn-link text-secondary hover-gold p-1.5 border-0"
              title="Log out"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE RESPONSIVE OFFCANVAS DRAWER (< 992px)          */}
      {/* ======================================================== */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-lg-none"
            style={{
              backgroundColor: 'rgba(37, 37, 37, 0.45)',
              backdropFilter: 'blur(3px)',
              zIndex: 1045,
            }}
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Off-canvas Drawer */}
          <div
            className="mobile-drawer-animate position-fixed top-0 start-0 h-100 d-flex flex-column d-lg-none"
            style={{
              width: '280px',
              maxWidth: '85vw',
              backgroundColor: '#FFFDF7',
              borderRight: '1px solid #E8E3D8',
              zIndex: 1050,
              boxShadow: '4px 0 24px rgba(37, 37, 37, 0.15)',
            }}
          >
            {/* Mobile Header with Brand & Close Button */}
            <div
              className="d-flex align-items-center justify-content-between px-3 py-3 border-bottom"
              style={{ height: '68px', borderColor: '#E8E3D8' }}
            >
              <Link
                href="/"
                className="d-flex align-items-center gap-2 text-decoration-none"
                onClick={onCloseMobile}
              >
                <div
                  className="position-relative overflow-hidden rounded-3 shadow-xs"
                  style={{ width: 36, height: 36, border: '1.5px solid #E9B83F' }}
                >
                  <Image
                    src="/branding/kings-taxi-official-auth-logo.jpg"
                    alt="Kings Taxi Logo"
                    fill
                    sizes="36px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <span className="fw-bold tracking-wider text-obsidian" style={{ fontSize: '0.95rem' }}>
                    KINGS TAXI
                  </span>
                  <div className="d-flex align-items-center gap-1">
                    <span
                      className="badge px-1.5 py-0.5 text-uppercase fw-bold"
                      style={{
                        backgroundColor: '#E9B83F',
                        color: '#252525',
                        fontSize: '0.625rem',
                      }}
                    >
                      SUPER ADMIN
                    </span>
                  </div>
                </div>
              </Link>

              <button
                type="button"
                className="btn btn-light rounded-circle p-1.5 border-0 shadow-none"
                onClick={onCloseMobile}
                aria-label="Close sidebar"
                style={{ backgroundColor: '#F2E9D5', color: '#252525' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Nav Menu */}
            <div className="flex-grow-1 overflow-y-auto py-3 px-2 custom-scrollbar">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="mb-3">
                  <div
                    className="px-3 mb-1 text-uppercase fw-bold"
                    style={{ fontSize: '0.6875rem', letterSpacing: '0.08em', color: '#77736A' }}
                  >
                    {group.groupTitle}
                  </div>
                  <nav className="nav flex-column gap-1">
                    {group.items.map((item) => renderNavItem(item, false, true))}
                  </nav>
                </div>
              ))}
            </div>

            {/* User Profile & Logout at Mobile Bottom */}
            <div
              className="p-3 border-top d-flex align-items-center justify-content-between"
              style={{ borderColor: '#E8E3D8', backgroundColor: '#F2E9D5' }}
            >
              <div className="d-flex align-items-center gap-2 overflow-hidden">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold shadow-xs"
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: '#E9B83F',
                    flexShrink: 0,
                    fontSize: '0.875rem',
                  }}
                >
                  AM
                </div>
                <div className="overflow-hidden">
                  <div className="text-obsidian fw-bold text-truncate small">Ashenafi Messle</div>
                  <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>
                    Super Admin
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-link text-secondary hover-gold p-1.5 border-0"
                title="Log out"
                onClick={handleLogout}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
