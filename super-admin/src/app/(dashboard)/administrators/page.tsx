'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserCog, Plus, Shield, Mail, Phone, Calendar, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { adminService } from '../../../services/adminService';
import { AdminUser } from '../../../types';
import { formatDate, formatRelativeTime } from '../../../utils/dateUtils';

export default function AdministratorsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load administrators:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'Administrator',
      sortable: true,
      render: (a) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center text-dark fw-bold"
            style={{
              width: 38,
              height: 38,
              backgroundColor: '#D6A83E',
              fontSize: '0.8125rem',
              flexShrink: 0,
            }}
          >
            {a.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <div className="fw-bold text-obsidian text-sm">{a.name}</div>
            <div className="text-muted text-xs">{a.department || 'Operations Team'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email & Contact',
      render: (a) => (
        <div>
          <div className="text-sm fw-medium">{a.email}</div>
          <div className="text-muted text-xs font-monospace">{a.phone || 'N/A'}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      render: (a) => (
        <span
          className={`badge text-xs ${
            a.role === 'SUPER_ADMIN' ? 'bg-gold text-dark fw-bold' : 'bg-light text-dark border'
          }`}
        >
          {a.role.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (a) => <StatusBadge status={a.status} size="sm" />,
    },
    {
      key: 'lastLoginAt',
      header: 'Last Active',
      render: (a) => (
        <span className="text-muted text-xs">
          {a.lastLoginAt ? formatRelativeTime(a.lastLoginAt) : 'Never'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Administrators & Role Privileges"
        description="Manage admin console operators, operational departments, role access permissions and audit logins"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Administrators' },
        ]}
        actions={
          <Link
            href="/administrators/new"
            className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
          >
            <Plus size={16} />
            <span>Create Admin User</span>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        data={admins}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search admin by name, email, department..."
        searchKeys={['name', 'email', 'department']}
      />
    </div>
  );
}
