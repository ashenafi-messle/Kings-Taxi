'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { mockNotifications } from '../../../services/mockData/notifications.mock';
import { AdminNotification } from '../../../types';
import { formatRelativeTime } from '../../../utils/dateUtils';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([...mockNotifications]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleMarkOneRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <PageHeader
        title="System Notifications & Alerts"
        description="Real-time alerts for live rides, hotel reservations, driver document expiries, and dispute dispatches"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Notifications' },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5"
                onClick={handleMarkAllRead}
              >
                <Check size={14} />
                <span>Mark All as Read</span>
              </button>
            )}
          </div>
        }
      />

      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${filter === 'ALL' ? 'btn-gold' : 'btn-outline-secondary'}`}
              onClick={() => setFilter('ALL')}
            >
              All Notifications ({notifications.length})
            </button>
            <button
              type="button"
              className={`btn ${filter === 'UNREAD' ? 'btn-gold' : 'btn-outline-secondary'}`}
              onClick={() => setFilter('UNREAD')}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-5 text-muted small">No notifications found.</div>
          ) : (
            <div className="list-group list-group-flush">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className={`list-group-item p-3 border-light d-flex align-items-start justify-content-between gap-3 ${
                    !item.isRead ? 'bg-gold-subtle' : ''
                  }`}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div className="p-2 rounded-circle bg-light border mt-0.5">
                      {item.severity === 'SUCCESS' ? (
                        <CheckCircle2 size={16} className="text-success" />
                      ) : item.severity === 'WARNING' ? (
                        <AlertTriangle size={16} className="text-warning" />
                      ) : (
                        <Info size={16} className="text-primary" />
                      )}
                    </div>

                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-bold text-obsidian text-sm">{item.title}</span>
                        <span className="badge bg-light text-dark border text-xs">
                          {item.categoryLabel}
                        </span>
                        {!item.isRead && (
                          <span
                            className="rounded-circle bg-gold"
                            style={{ width: 8, height: 8 }}
                          />
                        )}
                      </div>
                      <p className="text-muted small mb-1">{item.message}</p>
                      <span className="text-muted text-xs">{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    {item.linkUrl && (
                      <Link
                        href={item.linkUrl}
                        className="btn btn-outline-gold btn-sm d-flex align-items-center gap-1 py-1 px-2.5 text-xs"
                      >
                        <span>Open</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                    {!item.isRead && (
                      <button
                        type="button"
                        className="btn btn-light btn-sm p-1 border text-muted"
                        title="Mark as read"
                        onClick={() => handleMarkOneRead(item.id)}
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
