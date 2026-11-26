'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Wifi, WifiOff, AlertCircle, CheckCircle2, Clock, Inbox } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { supportService } from '../../../services/supportService';
import { SupportOverviewStats, SupportTicket } from '../../../types/support.types';
import { formatRelativeTime } from '../../../utils/dateUtils';

export default function SupportTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [overview, setOverview] = useState<SupportOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const fetchTicketsAndStats = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        supportService.getTickets({
          status: statusFilter,
          priority: priorityFilter,
          category: categoryFilter,
          unassignedOnly,
          unreadOnly,
          limit: 100,
        }),
        supportService.getOverview().catch(() => null),
      ]);
      setTickets(ticketsRes.items);
      if (statsRes) setOverview(statsRes);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, unassignedOnly, unreadOnly]);

  useEffect(() => {
    fetchTicketsAndStats();
  }, [fetchTicketsAndStats]);

  useEffect(() => {
    const socket = supportService.connectSupportSocket({
      onConnectionChange: (connected) => setSocketConnected(connected),
      onTicketCreated: () => fetchTicketsAndStats(),
      onTicketUpdated: () => fetchTicketsAndStats(),
      onMessageCreated: () => fetchTicketsAndStats(),
      onStatusChanged: () => fetchTicketsAndStats(),
      onPriorityChanged: () => fetchTicketsAndStats(),
      onTicketAssigned: () => fetchTicketsAndStats(),
      onUnreadCountUpdated: () => fetchTicketsAndStats(),
    });

    return () => {
      socket?.disconnect();
    };
  }, [fetchTicketsAndStats]);

  const columns: Column<SupportTicket>[] = [
    {
      key: 'ticketReference',
      header: 'Ticket Ref',
      sortable: true,
      render: (t) => (
        <div>
          <div className="d-flex align-items-center gap-1.5">
            <span className="fw-bold font-monospace text-sm text-obsidian">{t.ticketReference}</span>
            {(t.unreadCount || 0) > 0 && (
              <span className="badge rounded-pill bg-danger text-white" style={{ fontSize: '0.68rem' }}>
                {t.unreadCount} unread
              </span>
            )}
          </div>
          <div className="text-muted text-xs">{formatRelativeTime(t.lastMessageAt || t.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject & Category',
      sortable: true,
      render: (t) => (
        <div>
          <div className="fw-semibold text-obsidian text-sm text-truncate" style={{ maxWidth: 280 }}>
            {t.subject}
          </div>
          <div className="d-flex align-items-center gap-1.5 mt-0.5">
            <span className="badge bg-light text-dark border text-xs">{t.categoryLabel}</span>
            {(t.attachmentCount || 0) > 0 && (
              <span className="badge bg-light text-secondary border text-xs">
                {t.attachmentCount} image{(t.attachmentCount || 0) > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: 'Passenger',
      sortable: true,
      render: (t) => (
        <div>
          <div className="fw-medium text-obsidian text-sm">{t.requesterName}</div>
          <div className="text-muted text-xs font-monospace">{t.requesterPhone}</div>
        </div>
      ),
    },
    {
      key: 'assignedAdminName',
      header: 'Assigned To',
      sortable: true,
      render: (t) => (
        <span className={`text-xs ${t.assignedAdminName ? 'fw-semibold text-obsidian' : 'text-muted fst-italic'}`}>
          {t.assignedAdminName || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (t) => <StatusBadge status={t.priority} size="sm" />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/support/${t.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="Open Ticket Conversation"
          >
            <MessageSquare size={16} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Support Tickets & Live Help Desk"
        description="Real-time passenger support tickets, ride & booking inquiries, attachments, and escalation workflow"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Support & Inquiries' },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <span
              className={`badge d-inline-flex align-items-center gap-1.5 px-2.5 py-1.5 ${
                socketConnected ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'
              }`}
            >
              {socketConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{socketConnected ? 'Live Updates On' : 'Reconnecting'}</span>
            </span>
          </div>
        }
      />

      {overview && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
              <div className="d-flex align-items-center justify-content-between text-muted text-xs mb-1">
                <span>Total Tickets</span>
                <Inbox size={14} />
              </div>
              <div className="h4 fw-bold text-obsidian mb-0">{overview.total}</div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
              <div className="d-flex align-items-center justify-content-between text-muted text-xs mb-1">
                <span>Open</span>
                <AlertCircle size={14} className="text-warning" />
              </div>
              <div className="h4 fw-bold text-obsidian mb-0">{overview.open}</div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
              <div className="d-flex align-items-center justify-content-between text-muted text-xs mb-1">
                <span>In Progress</span>
                <Clock size={14} className="text-primary" />
              </div>
              <div className="h4 fw-bold text-obsidian mb-0">
                {overview.inProgress + overview.waitingForPassenger}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
              <div className="text-muted text-xs mb-1">Unassigned</div>
              <div className="h4 fw-bold text-obsidian mb-0">{overview.unassigned}</div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
              <div className="text-muted text-xs mb-1">Unread Messages</div>
              <div className="h4 fw-bold text-danger mb-0">{overview.unreadPassengerMessages}</div>
            </div>
          </div>
          <div className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm rounded-3 p-3 h-100">
              <div className="d-flex align-items-center justify-content-between text-muted text-xs mb-1">
                <span>Resolved</span>
                <CheckCircle2 size={14} className="text-success" />
              </div>
              <div className="h4 fw-bold text-success mb-0">{overview.resolved}</div>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mb-3" role="alert">
          <span>{errorMsg}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={fetchTicketsAndStats}>
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={tickets}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search by ticket ref, subject, passenger..."
        searchKeys={['ticketReference', 'subject', 'requesterName', 'requesterPhone', 'requesterEmail']}
        onRowClick={(item) => router.push(`/support/${item.id}`)}
        filters={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FilterDropdown
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Status' },
                { value: 'OPEN', label: 'Open' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'WAITING_FOR_PASSENGER', label: 'Waiting for Passenger' },
                { value: 'RESOLVED', label: 'Resolved' },
                { value: 'CLOSED', label: 'Closed' },
              ]}
            />
            <FilterDropdown
              label="Priority"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
            <FilterDropdown
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'RIDE_ISSUE', label: 'Ride Issue' },
                { value: 'BOOKING_ISSUE', label: 'Booking Issue' },
                { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
                { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
                { value: 'DRIVER_BEHAVIOR', label: 'Driver Behavior' },
                { value: 'SAFETY_CONCERN', label: 'Safety Concern' },
                { value: 'APP_TECHNICAL_ISSUE', label: 'App / Technical' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
            <button
              type="button"
              onClick={() => setUnassignedOnly((v) => !v)}
              className={`btn btn-sm ${unassignedOnly ? 'btn-gold fw-semibold' : 'btn-outline-secondary'}`}
            >
              Unassigned Only
            </button>
            <button
              type="button"
              onClick={() => setUnreadOnly((v) => !v)}
              className={`btn btn-sm ${unreadOnly ? 'btn-danger fw-semibold' : 'btn-outline-secondary'}`}
            >
              Unread Only
            </button>
          </div>
        }
      />
    </div>
  );
}
