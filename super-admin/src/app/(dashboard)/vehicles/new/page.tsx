'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Car, ArrowLeft, Save, AlertCircle, Shield } from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { VehicleService } from '../../../../services/vehicleService';
import { DocumentUploadField, DocumentUploadValue } from '../../../../components/common/DocumentUploadField';

export default function NewVehiclePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    plateNumber: '',
    make: 'Toyota',
    model: '',
    year: 2022,
    color: 'White',
    category: 'STANDARD_SEDAN',
    capacity: 4,
    insuranceExpiry: '2027-08-30',
  });
  const [regDoc, setRegDoc] = useState<DocumentUploadValue | null>(null);
  const [titleDoc, setTitleDoc] = useState<DocumentUploadValue | null>(null);
  const [insuranceDoc, setInsuranceDoc] = useState<DocumentUploadValue | null>(null);
  const [boloDoc, setBoloDoc] = useState<DocumentUploadValue | null>(null);
  const [permitDoc, setPermitDoc] = useState<DocumentUploadValue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'year' || name === 'capacity' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.plateNumber.trim()) {
      setError('Commercial plate number is required.');
      return;
    }
    if (!formData.model.trim()) {
      setError('Vehicle model is required.');
      return;
    }

    setIsLoading(true);
    try {
      const docs: any[] = [];
      if (regDoc) {
        docs.push({
          id: `vdoc_${Date.now()}_1`,
          documentType: 'REGISTRATION_CERTIFICATE',
          documentNumber: regDoc.documentNumber,
          fileUrl: regDoc.fileUrl,
          fileName: regDoc.fileName,
          fileFormat: regDoc.fileFormat,
          fileSize: regDoc.fileSize,
          expiryDate: regDoc.expiryDate,
          status: 'PENDING_REVIEW',
        });
      }
      if (titleDoc) {
        docs.push({
          id: `vdoc_${Date.now()}_2`,
          documentType: 'VEHICLE_TITLE_LIBRE',
          documentNumber: titleDoc.documentNumber,
          fileUrl: titleDoc.fileUrl,
          fileName: titleDoc.fileName,
          fileFormat: titleDoc.fileFormat,
          fileSize: titleDoc.fileSize,
          expiryDate: titleDoc.expiryDate,
          status: 'PENDING_REVIEW',
        });
      }
      if (insuranceDoc) {
        docs.push({
          id: `vdoc_${Date.now()}_3`,
          documentType: 'INSURANCE_CERTIFICATE',
          documentNumber: insuranceDoc.documentNumber,
          fileUrl: insuranceDoc.fileUrl,
          fileName: insuranceDoc.fileName,
          fileFormat: insuranceDoc.fileFormat,
          fileSize: insuranceDoc.fileSize,
          expiryDate: insuranceDoc.expiryDate || formData.insuranceExpiry,
          status: 'PENDING_REVIEW',
        });
      }
      if (boloDoc) {
        docs.push({
          id: `vdoc_${Date.now()}_4`,
          documentType: 'ANNUAL_INSPECTION_BOLO',
          documentNumber: boloDoc.documentNumber,
          fileUrl: boloDoc.fileUrl,
          fileName: boloDoc.fileName,
          fileFormat: boloDoc.fileFormat,
          fileSize: boloDoc.fileSize,
          expiryDate: boloDoc.expiryDate,
          status: 'PENDING_REVIEW',
        });
      }
      if (permitDoc) {
        docs.push({
          id: `vdoc_${Date.now()}_5`,
          documentType: 'VEHICLE_COMMERCIAL_PERMIT',
          documentNumber: permitDoc.documentNumber,
          fileUrl: permitDoc.fileUrl,
          fileName: permitDoc.fileName,
          fileFormat: permitDoc.fileFormat,
          fileSize: permitDoc.fileSize,
          expiryDate: permitDoc.expiryDate,
          status: 'PENDING_REVIEW',
        });
      }

      await VehicleService.createVehicle({
        ...formData,
        isVerified: false,
        verificationStatus: 'PENDING',
        documents: docs,
      } as any);
      router.push('/vehicles');
    } catch (err: any) {
      setError(err.message || 'Failed to register vehicle.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Register Fleet Vehicle"
        description="Add a new commercial vehicle, set capacity, service category, and compliance dates"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Fleet & Vehicles', href: '/vehicles' },
          { label: 'Register Vehicle' },
        ]}
        actions={
          <Link href="/vehicles" className="btn btn-outline-secondary btn-sm">
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
                <Car size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Vehicle Registration Details</h3>
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
                      Commercial Plate Number *
                    </label>
                    <input
                      type="text"
                      name="plateNumber"
                      required
                      value={formData.plateNumber}
                      onChange={handleChange}
                      placeholder="e.g. 3-B99214-ET"
                      className="form-control form-control-sm py-2 shadow-none font-monospace"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Service Category *
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="form-select form-select-sm py-2 shadow-none"
                    >
                      <option value="STANDARD_SEDAN">Standard Sedan</option>
                      <option value="LUXURY_VIP">Luxury VIP</option>
                      <option value="TOURISM_4WD">Tourism 4WD (Simien / Heritage)</option>
                      <option value="MINIVAN_GROUP">Minivan Group Shuttle</option>
                      <option value="COMFORT_VAN">Comfort Van</option>
                      <option value="EXECUTIVE">Executive</option>
                      <option value="SUV">SUV Premium</option>
                      <option value="MINIBUS">Minibus</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">Make *</label>
                    <input
                      type="text"
                      name="make"
                      required
                      value={formData.make}
                      onChange={handleChange}
                      placeholder="Toyota / Hyundai / Land Cruiser"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Model *
                    </label>
                    <input
                      type="text"
                      name="model"
                      required
                      value={formData.model}
                      onChange={handleChange}
                      placeholder="Corolla / Prado / Elantra"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Manufacturing Year
                    </label>
                    <input
                      type="number"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      min="2005"
                      max="2026"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">Color</label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      placeholder="White / Silver / Black"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Passenger Seats
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      min="1"
                      max="20"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Insurance Expiry Date
                    </label>
                    <input
                      type="date"
                      name="insuranceExpiry"
                      value={formData.insuranceExpiry}
                      onChange={handleChange}
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>
                </div>

                {/* Vehicle Compliance & Registration Documents Section */}
                <div className="mt-4 pt-3 border-top border-light">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Shield size={18} className="text-gold" />
                    <h4 className="h6 fw-bold text-obsidian mb-0">
                      Vehicle Compliance & Registration Documents (Cloudinary)
                    </h4>
                  </div>
                  <p className="text-muted small mb-3">
                    Upload official vehicle ownership, inspection, and insurance credentials in PDF or high-resolution image format.
                  </p>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="Registration Certificate (Libre)"
                        documentType="REGISTRATION_CERTIFICATE"
                        required={true}
                        helperText="Official Ministry of Transport vehicle registration card."
                        value={regDoc}
                        onChange={setRegDoc}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="Vehicle Title Deed (Ownership)"
                        documentType="VEHICLE_TITLE_LIBRE"
                        required={true}
                        helperText="Vehicle title ownership certificate."
                        value={titleDoc}
                        onChange={setTitleDoc}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="Commercial Insurance Certificate"
                        documentType="INSURANCE_CERTIFICATE"
                        required={true}
                        helperText="Valid third-party or comprehensive commercial taxi insurance policy."
                        value={insuranceDoc}
                        onChange={setInsuranceDoc}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <DocumentUploadField
                        label="Annual Technical Inspection (Bolo)"
                        documentType="ANNUAL_INSPECTION_BOLO"
                        required={true}
                        helperText="Roadworthiness and technical safety inspection certificate."
                        value={boloDoc}
                        onChange={setBoloDoc}
                      />
                    </div>
                    <div className="col-12">
                      <DocumentUploadField
                        label="Commercial Transport Operating Permit"
                        documentType="VEHICLE_COMMERCIAL_PERMIT"
                        required={false}
                        helperText="Optional city transport authority operating badge or yellow taxi permit."
                        value={permitDoc}
                        onChange={setPermitDoc}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top border-light d-flex align-items-center justify-content-end gap-2">
                  <Link href="/vehicles" className="btn btn-outline-secondary btn-sm px-3">
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
                    <span>Save Vehicle</span>
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
