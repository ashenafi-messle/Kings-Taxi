'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Building2,
  FileText,
  MapPin,
  Phone,
  Mail,
  ShieldAlert,
  Percent,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatCard } from '../../../components/common/StatCard';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { HotelService } from '../../../services/hotelService';
import { HotelPartner } from '../../../types';

export default function HotelPartnersPage() {
  const [partners, setPartners] = useState<HotelPartner[]>([]);
  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    pendingPartners: 0,
    totalHotels: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<HotelPartner | null>(null);
  const [verifyAction, setVerifyAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New partner form state
  const [formData, setFormData] = useState({
    businessName: '',
    tradeName: '',
    contactPerson: '',
    email: '',
    phone: '',
    businessAddress: '',
    city: 'Gondar',
    businessLicenseNumber: '',
    taxIdentificationNumber: '',
    bankName: 'Commercial Bank of Ethiopia',
    bankAccountNumber: '',
    bankAccountName: '',
    commissionRate: 10.0,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [partnersRes, statsRes] = await Promise.all([
        HotelService.getPartners({
          status: statusFilter,
          verificationStatus: verificationFilter,
          city: cityFilter,
          limit: 100,
        }),
        HotelService.getPartnerStats(),
      ]);

      setPartners(partnersRes.items);
      setStats(statsRes);
    } catch (err) {
      console.error('Failed to load hotel partners:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, verificationFilter, cityFilter]);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await HotelService.createPartner(formData);
      setIsCreateModalOpen(false);
      setFormData({
        businessName: '',
        tradeName: '',
        contactPerson: '',
        email: '',
        phone: '',
        businessAddress: '',
        city: 'Gondar',
        businessLicenseNumber: '',
        taxIdentificationNumber: '',
        bankName: 'Commercial Bank of Ethiopia',
        bankAccountNumber: '',
        bankAccountName: '',
        commissionRate: 10.0,
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create partner:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;
    if (verifyAction === 'REJECTED' && !rejectionReason.trim()) {
      alert('A reason is required when rejecting verification.');
      return;
    }

    setIsSubmitting(true);
    try {
      await HotelService.verifyPartner(selectedPartner.id, verifyAction, rejectionReason);
      setIsVerifyModalOpen(false);
      setSelectedPartner(null);
      setRejectionReason('');
      fetchData();
    } catch (err) {
      console.error('Failed to update verification status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<HotelPartner>[] = [
    {
      key: 'businessName',
      header: 'Partner & Contact',
      sortable: true,
      render: (p) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-3 bg-light border p-2 d-flex align-items-center justify-content-center text-gold"
            style={{ width: 42, height: 42 }}
          >
            <Briefcase size={22} />
          </div>
          <div>
            <div className="fw-bold text-obsidian text-sm">
              {p.businessName}
              {p.tradeName && <span className="text-muted text-xs ms-1">({p.tradeName})</span>}
            </div>
            <div className="text-muted text-xs d-flex align-items-center gap-1.5 mt-0.5">
              <span className="badge bg-light text-dark font-monospace border">{p.partnerCode}</span>
              <span>•</span>
              <span>{p.contactPerson}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location & Contact',
      render: (p) => (
        <div>
          <div className="text-sm d-flex align-items-center gap-1">
            <MapPin size={13} className="text-muted" />
            <span>{p.city}, {p.country}</span>
          </div>
          <div className="text-muted text-xs d-flex align-items-center gap-1 mt-0.5 font-monospace">
            <Phone size={11} />
            <span>{p.phone}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'taxIdentificationNumber',
      header: 'TIN & License',
      render: (p) => (
        <div>
          <div className="text-xs">
            <span className="text-muted">TIN: </span>
            <span className="fw-medium font-monospace">{p.taxIdentificationNumber || 'N/A'}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            <span>Lic: </span>
            <span className="font-monospace">{p.businessLicenseNumber || 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'commissionRate',
      header: 'Commission & Banking',
      render: (p) => (
        <div>
          <div className="text-sm fw-bold text-success d-flex align-items-center gap-1">
            <Percent size={13} />
            <span>{p.commissionRate}% Commission</span>
          </div>
          <div className="text-muted text-xs font-monospace mt-0.5">
            {p.bankName ? `${p.bankName}` : 'No Bank Assigned'}
          </div>
        </div>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Verification',
      sortable: true,
      render: (p) => {
        let badgeVariant: 'warning' | 'success' | 'danger' = 'warning';
        if (p.verificationStatus === 'APPROVED') badgeVariant = 'success';
        if (p.verificationStatus === 'REJECTED') badgeVariant = 'danger';

        return (
          <div>
            <span className={`badge bg-${badgeVariant}-subtle text-${badgeVariant} border px-2 py-1 text-xs fw-semibold`}>
              {p.verificationStatus}
            </span>
            {p.rejectionReason && (
              <div className="text-danger text-xs mt-1 text-truncate" style={{ maxWidth: 160 }} title={p.rejectionReason}>
                {p.rejectionReason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (p) => <StatusBadge status={p.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {p.verificationStatus === 'PENDING' && (
            <button
              onClick={() => {
                setSelectedPartner(p);
                setVerifyAction('APPROVED');
                setIsVerifyModalOpen(true);
              }}
              className="btn btn-outline-success btn-sm px-2 py-1 text-xs d-flex align-items-center gap-1"
              title="Review & Verify Partner Account"
            >
              <CheckCircle size={14} />
              <span>Verify</span>
            </button>
          )}
          {p.verificationStatus !== 'PENDING' && (
            <button
              onClick={() => {
                setSelectedPartner(p);
                setVerifyAction(p.verificationStatus === 'APPROVED' ? 'REJECTED' : 'APPROVED');
                setIsVerifyModalOpen(true);
              }}
              className="btn btn-light btn-sm px-2 py-1 text-xs text-muted"
              title="Change Verification Status"
            >
              Update
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hotel Partners & Accounts"
        description="Corporate hospitality partner registrations, Ethiopian business license verification, TIN compliance, and revenue share commissions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Partner Hotels', href: '/hotels' },
          { label: 'Hotel Partners' },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/hotels" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5">
              <Building2 size={15} />
              <span>View Properties</span>
            </Link>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
            >
              <Plus size={16} />
              <span>Register Partner</span>
            </button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Partners"
            value={stats.totalPartners}
            icon={Briefcase}
            accentColor="gold"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Partners"
            value={stats.activePartners}
            icon={CheckCircle}
            accentColor="emerald"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending Verification"
            value={stats.pendingPartners}
            icon={ShieldAlert}
            accentColor="amber"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Registered Properties"
            value={stats.totalHotels}
            icon={Building2}
            accentColor="slate"
          />
        </div>
      </div>

      {/* Main Partner Table */}
      <DataTable
        columns={columns}
        data={partners}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search by business name, TIN, email, partner code..."
        searchKeys={['businessName', 'tradeName', 'contactPerson', 'email', 'partnerCode']}
        filters={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FilterDropdown
              label="Account Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
            <FilterDropdown
              label="Verification"
              value={verificationFilter}
              onChange={setVerificationFilter}
              options={[
                { value: 'ALL', label: 'All Verification' },
                { value: 'PENDING', label: 'Pending Review' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
            <FilterDropdown
              label="City"
              value={cityFilter}
              onChange={setCityFilter}
              options={[
                { value: 'ALL', label: 'All Cities' },
                { value: 'Gondar', label: 'Gondar' },
                { value: 'Bahir Dar', label: 'Bahir Dar' },
                { value: 'Lalibela', label: 'Lalibela' },
                { value: 'Addis Ababa', label: 'Addis Ababa' },
              ]}
            />
          </div>
        }
      />

      {/* Register Partner Modal */}
      {isCreateModalOpen && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light border-bottom">
                <h5 className="modal-title fw-bold text-obsidian d-flex align-items-center gap-2">
                  <Briefcase size={20} className="text-gold" />
                  <span>Register Hotel Partner Entity</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsCreateModalOpen(false)} />
              </div>
              <form onSubmit={handleCreatePartner}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Business Legal Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Gondar Heritage Lodges Ltd"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Commercial Trade Name (DBA)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Goha Palace"
                        value={formData.tradeName}
                        onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Primary Contact Person *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Alemayehu Tadesse"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Email Address *</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        placeholder="e.g. partner@hotel.et"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-control font-monospace"
                        required
                        placeholder="e.g. +251 91 100 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">City / Region *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Gondar, Amhara"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label text-xs fw-semibold text-muted">Physical Business Address *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g. Goha Hill Road, Royal Castles Zone"
                        value={formData.businessAddress}
                        onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Tax Identification Number (TIN)</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="10-digit Ethiopian TIN"
                        value={formData.taxIdentificationNumber}
                        onChange={(e) => setFormData({ ...formData, taxIdentificationNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Business License Number</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. BL-AMH-2026-091"
                        value={formData.businessLicenseNumber}
                        onChange={(e) => setFormData({ ...formData, businessLicenseNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Settlement Bank Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Commercial Bank of Ethiopia"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Settlement Bank Account Number</label>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="e.g. 1000123456789"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label text-xs fw-semibold text-muted">Platform Commission Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="50"
                        className="form-control"
                        value={formData.commissionRate}
                        onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light border-top">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-gold btn-sm fw-semibold" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering...' : 'Register Hotel Partner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Verify Partner Modal */}
      {isVerifyModalOpen && selectedPartner && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-light border-bottom">
                <h5 className="modal-title fw-bold text-obsidian d-flex align-items-center gap-2">
                  <ShieldAlert size={20} className="text-gold" />
                  <span>Partner Verification Review</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsVerifyModalOpen(false)} />
              </div>
              <form onSubmit={handleVerifySubmit}>
                <div className="modal-body p-4">
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="fw-bold text-obsidian">{selectedPartner.businessName}</div>
                    <div className="text-muted text-xs font-monospace mt-1">Code: {selectedPartner.partnerCode}</div>
                    <div className="text-muted text-xs mt-0.5">Contact: {selectedPartner.contactPerson} ({selectedPartner.phone})</div>
                    <div className="text-muted text-xs mt-0.5">TIN: {selectedPartner.taxIdentificationNumber || 'Not provided'}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-xs fw-semibold text-muted">Verification Decision *</label>
                    <div className="d-flex gap-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="verifyDecision"
                          id="decisionApprove"
                          value="APPROVED"
                          checked={verifyAction === 'APPROVED'}
                          onChange={() => setVerifyAction('APPROVED')}
                        />
                        <label className="form-check-label text-sm fw-semibold text-success" htmlFor="decisionApprove">
                          Approve Partner (Active)
                        </label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="verifyDecision"
                          id="decisionReject"
                          value="REJECTED"
                          checked={verifyAction === 'REJECTED'}
                          onChange={() => setVerifyAction('REJECTED')}
                        />
                        <label className="form-check-label text-sm fw-semibold text-danger" htmlFor="decisionReject">
                          Reject Verification
                        </label>
                      </div>
                    </div>
                  </div>

                  {verifyAction === 'REJECTED' && (
                    <div className="mb-3">
                      <label className="form-label text-xs fw-semibold text-danger">Rejection Reason *</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        required
                        placeholder="Provide specific regulatory reason (e.g. Expired business license, invalid TIN)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <div className="modal-footer bg-light border-top">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setIsVerifyModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-${verifyAction === 'APPROVED' ? 'success' : 'danger'} btn-sm fw-semibold`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : `Confirm ${verifyAction === 'APPROVED' ? 'Approval' : 'Rejection'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
