'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HelpCircle, Eye, AlertTriangle, MessageSquare, User, Clock } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { supportService } from '../../../services/supportService';
import { SupportTicket } from '../../../types';
import { formatDate, formatRelativeTime } from '../../../utils/dateUtils';

export default function SupportTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await supportService.getTickets({
        status: statusFilter,
        priority: priorityFilter,
        limit: 100,
      });
      setTickets(res.items);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const columns: Column<SupportTicket>[] = [
    {
      key: 'ticketReference',
      header: 'Ticket Ref',
      sortable: true,
      render: (t) => (
        <div>
          <span className="fw-bold font-monospace text-sm text-obsidian">{t.ticketReference}</span>
          <div className="text-muted text-xs">{formatRelativeTime(t.createdAt)}</div>
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
          <span className="badge bg-light text-dark border text-xs">{t.categoryLabel}</span>
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: 'Requester',
      sortable: true,
      render: (t) => (
        <div>
          <div className="fw-medium text-obsidian text-sm">{t.requesterName}</div>
          <div className="text-muted text-xs">
            {t.requesterRole} • {t.requesterPhone}
          </div>
        </div>
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
        title="Support Tickets & Inquiries"
        description="Passenger fare adjustments, driver document verifications, booking rescheduling and route dispute resolutions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Support & Inquiries' },
        ]}
      />

      <DataTable
        columns={columns}
        data={tickets}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search by ticket ref, subject, requester..."
        searchKeys={['ticketReference', 'subject', 'requesterName', 'requesterEmail']}
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
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'HIGH', label: 'High' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'LOW', label: 'Low' },
              ]}
            />
          </div>
        }
      />
    </div>
  );
}
