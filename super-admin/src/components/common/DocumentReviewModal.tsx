'use client';

import React, { useState } from 'react';

export interface ReviewableDocument {
  id: string;
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  expiryDate?: string;
}

interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'DRIVER' | 'VEHICLE';
  entityName: string;
  entityIdentifier: string; // e.g. "DRV-1042" or "3-A42159-ET"
  currentOverallStatus?: string;
  documents: ReviewableDocument[];
  onReviewDocument: (
    documentId: string,
    review: {
      status: 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
      rejectionReason?: string;
      reviewNotes?: string;
    }
  ) => Promise<void> | void;
}

const DOCUMENT_LABELS: Record<string, string> = {
  // Driver documents
  DRIVING_LICENSE: "Driver's License",
  DRIVER_LICENSE: "Driver's License",
  NATIONAL_ID: 'National ID / Kebele Card',
  POLICE_CLEARANCE: 'Police Clearance Certificate',
  CRIMINAL_RECORD_CLEARANCE: 'Police Clearance Certificate',
  PROFILE_PHOTO: 'Driver Profile Photograph',
  ROAD_TRANSPORT_BADGE: 'Road Transport / Commercial Badge',
  MEDICAL_CERTIFICATE: 'Medical Health Certificate',

  // Vehicle documents
  REGISTRATION_CERTIFICATE: 'Vehicle Registration Certificate (Libre)',
  VEHICLE_TITLE_LIBRE: 'Vehicle Title Deed (Ownership)',
  INSURANCE_CERTIFICATE: 'Commercial Transport Insurance',
  ANNUAL_INSPECTION_BOLO: 'Technical Inspection Certificate (Bolo)',
  VEHICLE_COMMERCIAL_PERMIT: 'Commercial Transport Operating Permit',
};

export const DocumentReviewModal: React.FC<DocumentReviewModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityName,
  entityIdentifier,
  currentOverallStatus,
  documents,
  onReviewDocument,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(
    documents[0]?.id || ''
  );
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [rotationDegree, setRotationDegree] = useState<number>(0);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'RESUBMIT' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setZoomScale(1);
    setRotationDegree(0);
    setActionType(null);
    setRejectionReason('');
    setReviewNotes('');
    setValidationError(null);
  };

  const handleZoom = (delta: number) => {
    setZoomScale((prev) => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const handleRotate = () => {
    setRotationDegree((prev) => (prev + 90) % 360);
  };

  const handleResetView = () => {
    setZoomScale(1);
    setRotationDegree(0);
  };

  const handleSubmitReview = async () => {
    if (!activeDoc) return;
    setValidationError(null);

    if (actionType === 'REJECT' && !rejectionReason.trim()) {
      setValidationError('Please specify a rejection reason. This will be provided to the driver/owner.');
      return;
    }

    if (actionType === 'RESUBMIT' && !reviewNotes.trim()) {
      setValidationError('Please provide clear notes explaining why resubmission is requested.');
      return;
    }

    const newStatus =
      actionType === 'APPROVE'
        ? 'APPROVED'
        : actionType === 'REJECT'
        ? 'REJECTED'
        : 'REQUIRES_RESUBMISSION';

    try {
      setIsSubmitting(true);
      await onReviewDocument(activeDoc.id, {
        status: newStatus,
        rejectionReason: actionType === 'REJECT' ? rejectionReason.trim() : undefined,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      // Clear action panel
      setActionType(null);
      setRejectionReason('');
      setReviewNotes('');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to update document status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPdf = activeDoc?.fileFormat === 'pdf' || activeDoc?.fileUrl?.toLowerCase().includes('.pdf');

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(26, 24, 20, 0.65)', zIndex: 1050 }}
      tabIndex={-1}
      role="dialog"
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
        <div
          className="modal-content border-0 shadow-lg"
          style={{ backgroundColor: 'var(--kt-card-bg, #FFFDF7)', borderRadius: '12px' }}
        >
          {/* Header */}
          <div
            className="modal-header border-bottom px-4 py-3"
            style={{ borderColor: 'var(--kt-border, #E8DFCE)', backgroundColor: 'var(--kt-cream-bg, #F8F5EB)' }}
          >
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-dark text-white text-uppercase" style={{ fontSize: '0.75rem' }}>
                  {entityType} VERIFICATION
                </span>
                <h5 className="modal-title fw-bold mb-0 text-dark">
                  Document Review & Compliance — {entityName}
                </h5>
                <span className="text-muted small">({entityIdentifier})</span>
              </div>
              <div className="small text-muted mt-1">
                Verify official credentials, cross-reference registration details, and validate authenticity.
              </div>
            </div>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>

          {/* Body */}
          <div className="modal-body p-0">
            <div className="row g-0" style={{ minHeight: '520px' }}>
              {/* Left sidebar: Document category list */}
              <div
                className="col-12 col-md-4 border-end p-3"
                style={{ borderColor: 'var(--kt-border, #E8DFCE)', backgroundColor: '#FAF7F0' }}
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-uppercase fw-bold text-muted small">Required Documents</span>
                  <span className="badge bg-secondary-subtle text-secondary small">
                    {documents.filter((d) => d.status === 'APPROVED').length} / {documents.length} Approved
                  </span>
                </div>

                {documents.length === 0 ? (
                  <div className="p-3 text-center text-muted small bg-white rounded border">
                    No documents uploaded yet for this {entityType.toLowerCase()}.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {documents.map((doc) => {
                      const isSelected = doc.id === (activeDoc?.id || '');
                      const label = DOCUMENT_LABELS[doc.documentType] || doc.documentType;
                      let badgeClass = 'bg-secondary-subtle text-secondary';
                      let statusText = 'Pending';
                      if (doc.status === 'APPROVED') {
                        badgeClass = 'bg-success-subtle text-success';
                        statusText = 'Approved';
                      } else if (doc.status === 'REJECTED') {
                        badgeClass = 'bg-danger-subtle text-danger';
                        statusText = 'Rejected';
                      } else if (doc.status === 'REQUIRES_RESUBMISSION') {
                        badgeClass = 'bg-warning-subtle text-warning';
                        statusText = 'Resubmit';
                      }

                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectDoc(doc.id)}
                          className={`btn text-start p-2 rounded border d-flex justify-content-between align-items-center transition-all ${
                            isSelected
                              ? 'bg-white shadow-sm border-primary fw-semibold'
                              : 'bg-white border-light text-muted'
                          }`}
                          style={{
                            borderLeft: isSelected ? '4px solid var(--kt-gold, #E9B83F)' : undefined,
                          }}
                        >
                          <div className="overflow-hidden me-2">
                            <div className="text-dark small text-truncate">{label}</div>
                            {doc.documentNumber && (
                              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                #{doc.documentNumber}
                              </div>
                            )}
                          </div>
                          <span className={`badge ${badgeClass} text-uppercase`} style={{ fontSize: '0.68rem' }}>
                            {statusText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Overall status card */}
                <div className="card mt-4 border bg-white p-3">
                  <div className="small fw-bold text-muted text-uppercase mb-1">Overall Entity Status</div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-semibold text-dark">{currentOverallStatus || 'PENDING'}</span>
                    <span
                      className={`badge ${
                        currentOverallStatus === 'VERIFIED' || currentOverallStatus === 'APPROVED'
                          ? 'bg-success'
                          : currentOverallStatus === 'REJECTED'
                          ? 'bg-danger'
                          : 'bg-warning text-dark'
                      }`}
                    >
                      {currentOverallStatus || 'PENDING'}
                    </span>
                  </div>
                  <div className="small text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                    Note: Status automatically recalculates upon approving or rejecting mandatory documents.
                  </div>
                </div>
              </div>

              {/* Right preview & review panel */}
              <div className="col-12 col-md-8 p-3 d-flex flex-column">
                {activeDoc ? (
                  <>
                    {/* Top document info bar */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center border-bottom pb-2 mb-3">
                      <div>
                        <h6 className="fw-bold mb-0 text-dark">
                          {DOCUMENT_LABELS[activeDoc.documentType] || activeDoc.documentType}
                        </h6>
                        <div className="small text-muted">
                          {activeDoc.documentNumber && <span>No: <strong>{activeDoc.documentNumber}</strong> &bull; </span>}
                          {activeDoc.expiryDate && <span>Expires: {new Date(activeDoc.expiryDate).toLocaleDateString()} &bull; </span>}
                          <span>Format: {activeDoc.fileFormat?.toUpperCase() || 'IMAGE'}</span>
                        </div>
                      </div>

                      {/* Document Viewer Controls */}
                      {!isPdf && (
                        <div className="btn-group btn-group-sm">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handleZoom(-0.2)}
                            title="Zoom Out"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={handleResetView}
                            title="Reset View"
                          >
                            {Math.round(zoomScale * 100)}%
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handleZoom(0.2)}
                            title="Zoom In"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={handleRotate}
                            title="Rotate 90°"
                          >
                            ↻
                          </button>
                        </div>
                      )}

                      <a
                        href={activeDoc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-primary ms-2"
                      >
                        ↗ Open Original
                      </a>
                    </div>

                    {/* Preview Area */}
                    <div
                      className="flex-grow-1 d-flex align-items-center justify-content-center rounded border bg-dark-subtle overflow-hidden position-relative mb-3"
                      style={{ minHeight: '340px', maxHeight: '420px' }}
                    >
                      {isPdf ? (
                        <iframe
                          src={activeDoc.fileUrl}
                          title="PDF Document Preview"
                          className="w-100 h-100 border-0"
                          style={{ minHeight: '340px' }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center w-100 h-100 p-2"
                          style={{ overflow: 'auto' }}
                        >
                          <img
                            src={activeDoc.fileUrl}
                            alt={activeDoc.documentType}
                            className="img-fluid rounded transition-all"
                            style={{
                              transform: `scale(${zoomScale}) rotate(${rotationDegree}deg)`,
                              transition: 'transform 0.2s ease',
                              maxHeight: '380px',
                              objectFit: 'contain',
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Rejection / Resubmission alert if already rejected */}
                    {activeDoc.rejectionReason && (
                      <div className="alert alert-danger py-2 px-3 small mb-2">
                        <strong>Rejection Reason:</strong> {activeDoc.rejectionReason}
                      </div>
                    )}
                    {activeDoc.reviewNotes && (
                      <div className="alert alert-info py-2 px-3 small mb-2">
                        <strong>Review Notes:</strong> {activeDoc.reviewNotes}
                      </div>
                    )}

                    {/* Action Form or Review Buttons */}
                    {actionType ? (
                      <div className="card border bg-light p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold mb-0 text-dark">
                            {actionType === 'APPROVE' && 'Confirm Document Approval'}
                            {actionType === 'REJECT' && 'Reject Document (Reason Required)'}
                            {actionType === 'RESUBMIT' && 'Request Document Resubmission'}
                          </h6>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-muted p-0"
                            onClick={() => {
                              setActionType(null);
                              setValidationError(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>

                        {validationError && (
                          <div className="alert alert-danger py-1 px-2 small mb-2">{validationError}</div>
                        )}

                        {actionType === 'APPROVE' && (
                          <div className="small text-muted mb-3">
                            You are about to verify and approve this document. Ensure validity dates and identification details are authentic.
                          </div>
                        )}

                        {actionType === 'REJECT' && (
                          <div className="mb-2">
                            <label className="form-label small fw-bold text-danger mb-1">
                              Mandatory Rejection Reason *
                            </label>
                            <textarea
                              className="form-control form-control-sm"
                              rows={2}
                              placeholder="e.g. Expired document, blurry photo, unreadable license number, or invalid seal..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                            />
                          </div>
                        )}

                        {actionType === 'RESUBMIT' && (
                          <div className="mb-2">
                            <label className="form-label small fw-bold text-warning-emphasis mb-1">
                              Instructions for Resubmission *
                            </label>
                            <textarea
                              className="form-control form-control-sm"
                              rows={2}
                              placeholder="e.g. Please upload a clear color photo showing both the front and back of the license..."
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                            />
                          </div>
                        )}

                        <div className="mb-2">
                          <label className="form-label small text-muted mb-1">Internal Admin Notes (Optional)</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Optional internal note for audit trail..."
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                          />
                        </div>

                        <div className="d-flex justify-content-end gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setActionType(null)}
                            disabled={isSubmitting}
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              actionType === 'APPROVE'
                                ? 'btn-success'
                                : actionType === 'REJECT'
                                ? 'btn-danger'
                                : 'btn-warning'
                            }`}
                            onClick={handleSubmitReview}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'Saving...' : `Confirm ${actionType}`}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top">
                        <div className="d-flex align-items-center gap-2">
                          <span className="small text-muted">Status:</span>
                          <span
                            className={`badge ${
                              activeDoc.status === 'APPROVED'
                                ? 'bg-success'
                                : activeDoc.status === 'REJECTED'
                                ? 'bg-danger'
                                : activeDoc.status === 'REQUIRES_RESUBMISSION'
                                ? 'bg-warning text-dark'
                                : 'bg-secondary'
                            }`}
                          >
                            {activeDoc.status}
                          </span>
                          {activeDoc.reviewedBy && (
                            <span className="small text-muted" style={{ fontSize: '0.75rem' }}>
                              by {activeDoc.reviewedBy}
                            </span>
                          )}
                        </div>

                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setActionType('REJECT')}
                          >
                            ✕ Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning text-dark"
                            onClick={() => setActionType('RESUBMIT')}
                          >
                            ↺ Request Resubmission
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-success"
                            onClick={() => setActionType('APPROVE')}
                          >
                            ✓ Approve Document
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    Select a document on the left to inspect and review.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="modal-footer px-4 py-2 border-top"
            style={{ borderColor: 'var(--kt-border, #E8DFCE)', backgroundColor: 'var(--kt-cream-bg, #F8F5EB)' }}
          >
            <button type="button" className="btn btn-secondary btn-sm px-4" onClick={onClose}>
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
