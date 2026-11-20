'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCog, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { adminService } from '../../../../services/adminService';

export default function NewAdminPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'OPERATIONS_ADMIN',
    department: 'Fleet & Dispatch Operations',
    phone: '+251 9',
    status: 'ACTIVE' as const,
    permissions: ['drivers_read_write', 'rides_monitoring'],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Admin name is required.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }

    setIsLoading(true);
    try {
      await adminService.createAdmin(formData as any);
      router.push('/administrators');
    } catch (err: any) {
      setError(err.message || 'Failed to create administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create Administrator"
        description="Grant portal access privileges, assign operational role and departmental responsibilities"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Administrators', href: '/administrators' },
          { label: 'New Admin' },
        ]}
        actions={
          <Link href="/administrators" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" />
            <span>Cancel</span>
          </Link>
        }
      />

      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-3">
              <div className="d-flex align-items-center gap-2">
                <UserCog size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Administrator Details</h3>
              </div>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2.5 px-3 mb-4 rounded-3 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Bethlehem Tilahun"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Official Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@kingstaxi.et"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Portal Role *
                    </label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="form-select form-select-sm py-2 shadow-none"
                    >
                      <option value="OPERATIONS_ADMIN">Operations Admin</option>
                      <option value="DRIVER_MANAGER">Driver & Fleet Manager</option>
                      <option value="PASSENGER_SUPPORT_ADMIN">Passenger Support Admin</option>
                      <option value="HOTEL_MANAGER">Hospitality & Hotel Manager</option>
                      <option value="TOURISM_MANAGER">Heritage & Tourism Manager</option>
                      <option value="SUPER_ADMIN">Executive Super Admin</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="e.g. Passenger Experience"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+251 91 000 0000"
                      className="form-control form-control-sm py-2 shadow-none font-monospace"
                    />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top border-light d-flex align-items-center justify-content-end gap-2">
                  <Link href="/administrators" className="btn btn-outline-secondary btn-sm px-3">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-gold btn-sm px-4 fw-semibold d-flex align-items-center gap-1.5"
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      <Save size={15} />
                    )}
                    <span>Create Administrator</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
