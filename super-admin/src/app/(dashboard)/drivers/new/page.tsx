'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowLeft, Save, AlertCircle, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { DriverService } from '../../../../services/driverService';
import { DocumentUploadField, DocumentUploadValue } from '../../../../components/common/DocumentUploadField';

export default function NewDriverPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+251 9',
    email: '',
    licenseNumber: '',
    city: 'Gondar',
    assignedVehiclePlate: '',
  });
  const [licenseDoc, setLicenseDoc] = useState<DocumentUploadValue | null>(null);
  const [nationalIdDoc, setNationalIdDoc] = useState<DocumentUploadValue | null>(null);
  const [policeDoc, setPoliceDoc] = useState<DocumentUploadValue | null>(null);
  const [badgeDoc, setBadgeDoc] = useState<DocumentUploadValue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Driver full name is required.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setError('Please provide a valid Ethiopian phone number.');
      return;
    }
    if (!formData.licenseNumber.trim()) {
      setError('Driver commercial license number is required.');
      return;
    }

    setIsLoading(true);
    try {
      const docs: any[] = [];
      if (licenseDoc) {
        docs.push({
          id: `doc_${Date.now()}_1`,
          documentType: 'DRIVING_LICENSE',
          documentNumber: licenseDoc.documentNumber || formData.licenseNumber,
          fileUrl: licenseDoc.fileUrl,
          fileName: licenseDoc.fileName,
          fileFormat: licenseDoc.fileFormat,
          fileSize: licenseDoc.fileSize,
          expiryDate: licenseDoc.expiryDate,
          status: 'PENDING_REVIEW',
          isVerified: false,
        });
      }
      if (nationalIdDoc) {
        docs.push({
          id: `doc_${Date.now()}_2`,
          documentType: 'NATIONAL_ID',
          documentNumber: nationalIdDoc.documentNumber,
          fileUrl: nationalIdDoc.fileUrl,
          fileName: nationalIdDoc.fileName,
          fileFormat: nationalIdDoc.fileFormat,
          fileSize: nationalIdDoc.fileSize,
          expiryDate: nationalIdDoc.expiryDate,
          status: 'PENDING_REVIEW',
          isVerified: false,
        });
      }
      if (policeDoc) {
        docs.push({
          id: `doc_${Date.now()}_3`,
          documentType: 'POLICE_CLEARANCE',
          documentNumber: policeDoc.documentNumber,
          fileUrl: policeDoc.fileUrl,
          fileName: policeDoc.fileName,
          fileFormat: policeDoc.fileFormat,
          fileSize: policeDoc.fileSize,
          expiryDate: policeDoc.expiryDate,
          status: 'PENDING_REVIEW',
          isVerified: false,
        });
      }
      if (badgeDoc) {
        docs.push({
          id: `doc_${Date.now()}_4`,
          documentType: 'ROAD_TRANSPORT_BADGE',
          documentNumber: badgeDoc.documentNumber,
          fileUrl: badgeDoc.fileUrl,
          fileName: badgeDoc.fileName,
          fileFormat: badgeDoc.fileFormat,
          fileSize: badgeDoc.fileSize,
          expiryDate: badgeDoc.expiryDate,
          status: 'PENDING_REVIEW',
          isVerified: false,
        });
      }

      await DriverService.createDriver({
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email || undefined,
        licenseNumber: formData.licenseNumber,
        city: formData.city,
        assignedVehiclePlate: formData.assignedVehiclePlate || undefined,
        verificationStatus: 'PENDING',
        documents: docs,
      });

      router.push('/drivers');
    } catch (err: any) {
      setError(err.message || 'Failed to onboard new driver.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Onboard New Fleet Driver"
        description="Register a new commercial taxi driver, assign vehicle plate, and initialize verification workflow"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Drivers', href: '/drivers' },
          { label: 'New Driver' },
        ]}
        actions={
          <Link href="/drivers" className="btn btn-outline-secondary btn-sm">
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
                <UserPlus size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Driver Registration Form</h3>
              </div>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger d-flex align-items-start gap-2.5 py-3 px-3 mb-4 rounded-3 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-danger" />
                  <div className="flex-grow-1">
                    <div className="fw-semibold text-danger mb-1">
                      {error.includes('already registered')
                        ? 'Driver Already Registered (Conflict 409)'
                        : 'Registration Failed'}
                    </div>
                    <div className="text-secondary small">{error}</div>
                    {error.includes('already registered') && (
                      <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top border-danger border-opacity-25">
                        <Link href="/drivers" className="btn btn-sm btn-outline-danger py-1 px-2 text-xs">
                          Search Existing Drivers
                        </Link>
                        <span className="text-xs text-muted">
                          Driver phone numbers and emails must be unique in Kings Taxi. Please enter a new phone number or email.
                        </span>
                      </div>
                    )}
                  </div>
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
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. Dawit Hailemariam"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+251 91 234 5678"
                      className={`form-control form-control-sm py-2 shadow-none font-monospace ${
                        error.includes('phone') ? 'is-invalid border-danger' : ''
                      }`}
                    />
                    {error.includes('phone') && (
                      <div className="invalid-feedback text-xs d-block mt-1">
                        This phone number is already registered to an existing driver.
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="driver@example.com"
                      className={`form-control form-control-sm py-2 shadow-none ${
                        error.includes('email') ? 'is-invalid border-danger' : ''
                      }`}
                    />
                    {error.includes('email') && (
                      <div className="invalid-feedback text-xs d-block mt-1">
                        This email address is already registered to an existing driver.
                      </div>
                    )}
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Commercial Driving License Number *
                    </label>
                    <input
                      type="text"
                      name="licenseNumber"
                      required
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="ET-AMH-DL-98210"
                      className="form-control form-control-sm py-2 shadow-none font-monospace"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Primary Operating City *
                    </label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="form-select form-select-sm py-2 shadow-none"
                    >
                      <option value="Gondar">Gondar</option>
                      <option value="Addis Ababa">Addis Ababa</option>
                      <option value="Bahir Dar">Bahir Dar</option>
                      <option value="Lalibela">Lalibela</option>
                      <option value="Hawassa">Hawassa</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Assign Vehicle Plate (Optional)
                    </label>
                    <input
                      type="text"
                      name="assignedVehiclePlate"
                      value={formData.assignedVehiclePlate}
                      onChange={handleChange}
                      placeholder="3-A99012-ET"
                      className="form-control form-control-sm py-2 shadow-none font-monospace"
                    />
                  </div>
                </div>

                {/* Driver Verification Documents Upload Section */}
                <div className="mt-4 pt-3 border-top border-light">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <ShieldCheck size={18} className="text-gold" />
                    <h4 className="h6 fw-bold text-obsidian mb-0">
                      Verification Documents (Cloudinary Storage)
                    </h4>
                  </div>
                  <p className="text-muted small mb-3">
                    Upload official credentials in JPG, PNG, or PDF format. Attached files will be stored in Cloudinary under the driver directory and queued for compliance verification.
                  </p>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="Commercial Driving License"
                        documentType="DRIVING_LICENSE"
                        required={true}
                        helperText="Clear photo or PDF scan of front & back showing expiration date."
                        value={licenseDoc}
                        onChange={setLicenseDoc}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="National ID / Kebele Card"
                        documentType="NATIONAL_ID"
                        required={true}
                        helperText="Government-issued citizen identification card."
                        value={nationalIdDoc}
                        onChange={setNationalIdDoc}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="Police Background Clearance"
                        documentType="POLICE_CLEARANCE"
                        required={true}
                        helperText="Police department certificate of clean criminal background."
                        value={policeDoc}
                        onChange={setPoliceDoc}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="Road Transport Commercial Badge"
                        documentType="ROAD_TRANSPORT_BADGE"
                        required={false}
                        helperText="Commercial transport operator badge issued by city transport bureau."
                        value={badgeDoc}
                        onChange={setBadgeDoc}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top border-light d-flex align-items-center justify-content-end gap-2">
                  <Link href="/drivers" className="btn btn-outline-secondary btn-sm px-3">
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
                    <span>Save Driver Profile</span>
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
