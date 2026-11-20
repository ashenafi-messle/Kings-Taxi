'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  User,
  Settings,
  LogOut,
  Radio,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { AuthService } from '../../services/authService';

export interface AdminHeaderProps {
  onToggleMobileSidebar: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileSidebar,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<{ name: string; email: string; role: string } | null>(null);

  React.useEffect(() => {
    const session = AuthService.getStoredSession();
    if (session.user) {
      setCurrentAdmin({
        name: session.user.name,
        email: session.user.email,
        role: session.user.role || 'SUPER_ADMIN',
      });
    }
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'SA';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  return (
    <header
      className="border-bottom sticky-top shadow-xs px-2 px-sm-3 py-2"
      style={{
        height: '68px',
        backgroundColor: '#FFFDF7',
        borderColor: '#E8E3D8',
        zIndex: 1020,
      }}
    >
      <div className="d-flex align-items-center justify-content-between h-100">
        {/* Left Side: Mobile Hamburger & Desktop Toggle + Status */}
        <div className="d-flex align-items-center gap-2">
          {/* Mobile Menu Hamburger (< 992px) */}
          <button
            type="button"
            className="btn btn-light d-lg-none p-2 border-0 shadow-none rounded-2"
            onClick={onToggleMobileSidebar}
            aria-label="Open mobile menu"
            style={{ backgroundColor: '#F2E9D5', color: '#252525' }}
          >
            <Menu size={20} />
          </button>

          {/* Desktop Sidebar Collapse Toggle (>= 992px) */}
          <button
            type="button"
            className="btn btn-light d-none d-lg-inline-flex align-items-center justify-content-center p-2 border-0 shadow-none rounded-2"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ backgroundColor: '#F2E9D5', color: '#252525' }}
          >
            {isCollapsed ? <PanelLeft size={19} className="text-gold" /> : <PanelLeftClose size={19} className="text-gold" />}
          </button>

          {/* Operational Status Pill */}
          <div
            className="d-none d-sm-flex align-items-center gap-2 px-2.5 py-1 rounded-pill border"
            style={{
              backgroundColor: '#F2E9D5',
              borderColor: '#E8E3D8',
            }}
          >
            <span
              className="d-inline-block rounded-circle"
              style={{
                width: 8,
                height: 8,
                backgroundColor: '#15803D',
                boxShadow: '0 0 0 2px rgba(21, 128, 61, 0.25)',
              }}
            />
            <span className="small fw-semibold text-obsidian" style={{ fontSize: '0.78rem' }}>
              Platform Active
            </span>
            <span className="text-muted small d-none d-md-inline" style={{ fontSize: '0.75rem' }}>
              • Gondar HQ
            </span>
          </div>
        </div>

        {/* Right Side: Global Search + Notifications + Profile */}
        <div className="d-flex align-items-center gap-2">
          {/* Quick Search (Visible on md+) */}
          <div className="position-relative d-none d-md-block" style={{ width: 220 }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ps-2.5 text-muted">
              <Search size={14} />
            </span>
            <input
              type="text"
              className="form-control form-control-sm ps-4 pe-2 py-1.5 shadow-none"
              placeholder="Search platform..."
              style={{
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                backgroundColor: '#F8F5EB',
                borderColor: '#E8E3D8',
              }}
            />
          </div>

          {/* Live Monitoring Quick Link */}
          <Link
            href="/ride-monitoring"
            className="btn btn-outline-gold btn-sm d-none d-sm-flex align-items-center gap-1.5 py-1 px-2.5 fw-semibold"
            style={{ fontSize: '0.78rem' }}
          >
            <Radio size={14} className="text-gold" />
            <span>Live Radar</span>
          </Link>

          {/* Notifications Dropdown */}
          <div className="position-relative">
            <button
              type="button"
              className="btn btn-light position-relative p-2 rounded-circle border-0 shadow-none"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              aria-label="Notifications"
              style={{ backgroundColor: '#F2E9D5' }}
            >
              <Bell size={18} style={{ color: '#252525' }} />
              <span
                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                style={{ fontSize: '0.625rem', padding: '0.2rem 0.4rem' }}
              >
                3
              </span>
            </button>

            {showNotifications && (
              <div
                className="position-absolute end-0 mt-2 rounded-3 shadow-lg p-0"
                style={{
                  width: '320px',
                  maxWidth: '90vw',
                  backgroundColor: '#FFFDF7',
                  border: '1px solid #E8E3D8',
                  zIndex: 1050,
                }}
              >
                <div
                  className="d-flex align-items-center justify-content-between p-3 border-bottom"
                  style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
                >
                  <span className="fw-bold text-obsidian small">Operational Alerts</span>
                  <Link
                    href="/notifications"
                    className="text-gold text-decoration-none small fw-semibold"
                    onClick={() => setShowNotifications(false)}
                  >
                    View all
                  </Link>
                </div>

                <div className="list-group list-group-flush" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <div className="list-group-item list-group-item-action p-2.5 border-bottom" style={{ backgroundColor: 'transparent', borderColor: '#F0EBE1' }}>
                    <div className="d-flex gap-2">
                      <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="fw-semibold text-obsidian" style={{ fontSize: '0.8125rem' }}>
                          Driver Document Pending
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Yonas Mengistu submitted new vehicle inspection papers for review.
                        </div>
                        <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                          10m ago
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="list-group-item list-group-item-action p-2.5 border-bottom" style={{ backgroundColor: 'transparent', borderColor: '#F0EBE1' }}>
                    <div className="d-flex gap-2">
                      <CheckCircle2 size={16} className="text-success flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="fw-semibold text-obsidian" style={{ fontSize: '0.8125rem' }}>
                          VIP Hotel Booking Confirmed
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Goha Hotel: Royal Suite booked for 4 nights (ETB 52,000).
                        </div>
                        <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                          32m ago
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="list-group-item list-group-item-action p-2.5" style={{ backgroundColor: 'transparent' }}>
                    <div className="d-flex gap-2">
                      <Radio size={16} className="text-gold flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="fw-semibold text-obsidian" style={{ fontSize: '0.8125rem' }}>
                          Telebirr Settlement Processed
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Daily automated driver payout batch completed without errors.
                        </div>
                        <div className="text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                          1h ago
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="position-relative">
            <button
              type="button"
              className="btn btn-light d-flex align-items-center gap-2 p-1 pe-2 rounded-pill border shadow-none"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              style={{
                backgroundColor: '#F2E9D5',
                borderColor: '#E8E3D8',
              }}
            >
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold shadow-xs"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: '#E9B83F',
                  fontSize: '0.78rem',
                }}
              >
                {getInitials(currentAdmin?.name)}
              </div>
              <div className="d-none d-lg-block text-start" style={{ lineHeight: 1.15 }}>
                <div className="fw-bold text-obsidian" style={{ fontSize: '0.78rem' }}>
                  {currentAdmin?.name || 'Super Admin'}
                </div>
                <div className="text-muted" style={{ fontSize: '0.65rem' }}>
                  {currentAdmin?.role || 'Super Admin'}
                </div>
              </div>
            </button>

            {showProfileMenu && (
              <div
                className="position-absolute end-0 mt-2 rounded-3 shadow-lg p-2"
                style={{
                  width: '210px',
                  backgroundColor: '#FFFDF7',
                  border: '1px solid #E8E3D8',
                  zIndex: 1050,
                }}
              >
                <div className="px-2 py-1.5 border-bottom mb-1" style={{ borderColor: '#E8E3D8' }}>
                  <div className="fw-bold text-obsidian small">{currentAdmin?.name || 'Administrator'}</div>
                  <div className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>
                    {currentAdmin?.email || 'admin@kingstaxi.et'}
                  </div>
                </div>

                <Link
                  href="/administrators"
                  className="dropdown-item d-flex align-items-center gap-2 py-1.5"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <User size={15} />
                  <span>Admin Team</span>
                </Link>

                <Link
                  href="/settings"
                  className="dropdown-item d-flex align-items-center gap-2 py-1.5"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <Settings size={15} />
                  <span>Platform Settings</span>
                </Link>

                <div className="dropdown-divider my-1" />

                <button
                  type="button"
                  className="dropdown-item d-flex align-items-center gap-2 py-1.5 text-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
