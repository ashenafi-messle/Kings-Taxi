'use client';

import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Hash,
  FileCheck,
  Clock,
} from 'lucide-react';

export interface ReviewableDocument {
  id: string;
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  publicId?: string;
  previewUrl?: string;
  downloadUrl?: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REQUIRES_RESUBMISSION';
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  expiryDate?: string;
  createdAt?: string;
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
  DRIVING_LICENSE: "Driver's Commercial License",
  DRIVER_LICENSE: "Driver's Commercial License",
  NATIONAL_ID: 'National ID / Kebele Identification',
  POLICE_CLEARANCE: 'Federal / Police Clearance Certificate',
  CRIMINAL_RECORD_CLEARANCE: 'Criminal Record Clearance Certificate',
  PROFILE_PHOTO: 'Driver Profile Photograph',
  ROAD_TRANSPORT_BADGE: 'Road Transport / Commercial Badge',
  MEDICAL_CERTIFICATE: 'Medical Health Certificate',

  // Vehicle documents
  REGISTRATION_CERTIFICATE: 'Vehicle Registration Certificate (Libre)',
  VEHICLE_TITLE_LIBRE: 'Vehicle Title Deed (Ownership Libre)',
  INSURANCE_CERTIFICATE: 'Commercial Transport Insurance Policy',
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'RESUBMIT' | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (documents.length > 0 && (!selectedDocId || !documents.some((d) => d.id === selectedDocId))) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, selectedDocId]);

  if (!isOpen) return null;

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setZoomScale(1);
    setRotationDegree(0);
    setImageLoading(true);
    setImageError(false);
    setActionType(null);
    setRejectionReason('');
    setReviewNotes('');
    setValidationError(null);
  };

  const handleZoom = (delta: number) => {
    setZoomScale((prev) => Math.min(Math.max(0.5, prev + delta), 3.5));
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
      setValidationError('Please provide a specific rejection reason for the driver.');
      return;
    }

    if (actionType === 'RESUBMIT' && !reviewNotes.trim()) {
      setValidationError('Please provide instructions explaining why resubmission is requested.');
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

  // Determine file type and endpoints
  const isPdf =
    activeDoc?.fileFormat?.toLowerCase() === 'pdf' ||
    activeDoc?.fileName?.toLowerCase().endsWith('.pdf') ||
    activeDoc?.fileUrl?.toLowerCase().includes('.pdf');

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || '' : '';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://kings-taxi.onrender.com/api/v1';

  // Build authorized URLs with token for seamless iframe/stream access
  const effectivePreviewUrl = activeDoc?.previewUrl
    ? (activeDoc.previewUrl.startsWith('http')
        ? activeDoc.previewUrl
        : `${apiBase.replace(/\/api\/v1$/, '')}${activeDoc.previewUrl}${token ? `?token=${encodeURIComponent(token)}` : ''}`)
    : activeDoc?.id
    ? `${apiBase}/admin/documents/${activeDoc.id}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`
    : activeDoc?.fileUrl || '';

  const effectiveDownloadUrl = activeDoc?.downloadUrl
    ? (activeDoc.downloadUrl.startsWith('http')
        ? activeDoc.downloadUrl
        : `${apiBase.replace(/\/api\/v1$/, '')}${activeDoc.downloadUrl}${token ? `?token=${encodeURIComponent(token)}` : ''}`)
    : activeDoc?.id
    ? `${apiBase}/admin/documents/${activeDoc.id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`
    : activeDoc?.fileUrl || '';

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(26, 24, 20, 0.72)', zIndex: 1050 }}
      tabIndex={-1}
      role="dialog"
    >
      <div
        className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${
          isFullscreen ? 'modal-fullscreen p-3' : 'modal-xl'
        }`}
        role="document"
      >
        <div
          className="modal-content border-0 shadow-lg"
          style={{ backgroundColor: 'var(--kt-card-bg, #FFFDF7)', borderRadius: isFullscreen ? '0' : '14px' }}
        >
          {/* Header */}
          <div
            className="modal-header border-bottom px-4 py-3"
            style={{ borderColor: 'var(--kt-border, #E8DFCE)', backgroundColor: 'var(--kt-cream-bg, #F8F5EB)' }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-dark"
                style={{ width: 42, height: 42, backgroundColor: '#EAC76A', flexShrink: 0 }}
              >
                <ShieldCheck size={22} className="text-dark" />
              </div>
              <div>
                <div className="d-flex align-items-center gap-2">
                  <span className="badge bg-dark text-white text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                    {entityType} COMPLIANCE REVIEW
                  </span>
                  <span className="text-muted small">&bull;</span>
                  <span className="fw-semibold text-dark text-sm">{entityName}</span>
                  <span className="text-muted small font-monospace">({entityIdentifier})</span>
                </div>
                <div className="small text-muted mt-0.5">
                  Verify authentic credentials, inspect official stamps, and record compliance decisions.
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1.5"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                <span className="d-none d-sm-inline">{isFullscreen ? 'Standard' : 'Expand'}</span>
              </button>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
          </div>

          {/* Body */}
          <div className="modal-body p-0">
            <div className="row g-0" style={{ minHeight: isFullscreen ? 'calc(100vh - 140px)' : '580px' }}>
              {/* Left sidebar: Document category list */}
              <div
                className="col-12 col-md-4 col-lg-3 border-end p-3 d-flex flex-column"
                style={{ borderColor: 'var(--kt-border, #E8DFCE)', backgroundColor: '#FAF7F0' }}
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-uppercase fw-bold text-muted small" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                    Document Checklist
                  </span>
                  <span className="badge bg-secondary-subtle text-secondary small px-2 py-1">
                    {documents.filter((d) => d.status === 'APPROVED').length} / {documents.length} Approved
                  </span>
                </div>

                {documents.length === 0 ? (
                  <div className="p-4 text-center text-muted small bg-white rounded border">
                    <FileText size={28} className="text-muted opacity-50 mb-2 mx-auto" />
                    <p className="mb-0">No documents on file for this {entityType.toLowerCase()}.</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '380px' }}>
                    {documents.map((doc) => {
                      const isSelected = doc.id === (activeDoc?.id || '');
                      const label = DOCUMENT_LABELS[doc.documentType] || doc.documentType.replace(/_/g, ' ');
                      let badgeClass = 'bg-secondary-subtle text-secondary';
                      let statusText = 'Pending';
                      let icon = <Clock size={13} className="text-muted" />;

                      if (doc.status === 'APPROVED') {
                        badgeClass = 'bg-success text-white';
                        statusText = 'Approved';
                        icon = <CheckCircle2 size={13} className="text-white" />;
                      } else if (doc.status === 'REJECTED') {
                        badgeClass = 'bg-danger text-white';
                        statusText = 'Rejected';
                        icon = <XCircle size={13} className="text-white" />;
                      } else if (doc.status === 'REQUIRES_RESUBMISSION') {
                        badgeClass = 'bg-warning text-dark';
                        statusText = 'Resubmit';
                        icon = <RefreshCw size={13} className="text-dark" />;
                      }

                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => handleSelectDoc(doc.id)}
                          className={`btn text-start p-2.5 rounded-3 border d-flex justify-content-between align-items-center transition-all ${
                            isSelected
                              ? 'bg-white shadow-sm border-gold fw-semibold'
                              : 'bg-white border-light text-muted hover-shadow'
                          }`}
                          style={{
                            borderLeft: isSelected ? '4px solid #D4AF37' : undefined,
                            borderColor: isSelected ? '#EAC76A' : 'var(--kt-border, #E8DFCE)',
                          }}
                        >
                          <div className="overflow-hidden me-2">
                            <div className="text-dark small text-truncate fw-medium">{label}</div>
                            <div className="text-muted d-flex align-items-center gap-1 mt-0.5" style={{ fontSize: '0.72rem' }}>
                              <span>{doc.fileFormat?.toUpperCase() || 'DOCUMENT'}</span>
                              {doc.documentNumber && <span>&bull; #{doc.documentNumber}</span>}
                            </div>
                          </div>
                          <span className={`badge ${badgeClass} text-uppercase d-flex align-items-center gap-1`} style={{ fontSize: '0.65rem' }}>
                            {icon}
                            {statusText}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Overall status card */}
                <div className="card mt-auto border p-3 rounded-3 shadow-none bg-white" style={{ borderColor: 'var(--kt-border, #E8DFCE)' }}>
                  <div className="small text-muted mb-1 text-uppercase fw-semibold" style={{ fontSize: '0.68rem' }}>
                    Overall Verification Status
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-bold text-obsidian">{currentOverallStatus || 'PENDING'}</span>
                    <span
                      className={`badge ${
                        currentOverallStatus === 'APPROVED' || currentOverallStatus === 'VERIFIED'
                          ? 'bg-success'
                          : currentOverallStatus === 'REJECTED'
                          ? 'bg-danger'
                          : 'bg-warning text-dark'
                      }`}
                    >
                      {currentOverallStatus || 'PENDING'}
                    </span>
                  </div>
                  <div className="text-muted mt-2" style={{ fontSize: '0.72rem', lineHeight: '1.3' }}>
                    Status automatically recalculates when all mandatory documents are approved.
                  </div>
                </div>
              </div>

              {/* Center & Right Area: Document Preview & Decision Details */}
              <div className="col-12 col-md-8 col-lg-9 p-3 p-lg-4 d-flex flex-column">
                {activeDoc ? (
                  <>
                    {/* Top bar for active document */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom">
                      <div>
                        <h6 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                          <FileCheck size={18} className="text-gold" />
                          {DOCUMENT_LABELS[activeDoc.documentType] || activeDoc.documentType.replace(/_/g, ' ')}
                        </h6>
                        <div className="small text-muted d-flex flex-wrap align-items-center gap-2 mt-1">
                          {activeDoc.documentNumber && (
                            <span className="d-flex align-items-center gap-1">
                              <Hash size={13} />
                              <strong>{activeDoc.documentNumber}</strong>
                            </span>
                          )}
                          {activeDoc.expiryDate && (
                            <span className="d-flex align-items-center gap-1">
                              <Calendar size={13} />
                              Expires: {new Date(activeDoc.expiryDate).toLocaleDateString()}
                            </span>
                          )}
                          <span>&bull; Size: {formatFileSize(activeDoc.fileSize)}</span>
                          <span>&bull; Format: {activeDoc.fileFormat?.toUpperCase() || (isPdf ? 'PDF' : 'IMAGE')}</span>
                        </div>
                      </div>

                      {/* Document Viewer Controls */}
                      <div className="d-flex align-items-center gap-2">
                        {!isPdf && (
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => handleZoom(-0.2)}
                              title="Zoom Out"
                            >
                              <ZoomOut size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary fw-medium font-monospace"
                              onClick={handleResetView}
                              title="Reset Zoom"
                              style={{ minWidth: '55px' }}
                            >
                              {Math.round(zoomScale * 100)}%
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={() => handleZoom(0.2)}
                              title="Zoom In"
                            >
                              <ZoomIn size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-secondary"
                              onClick={handleRotate}
                              title="Rotate 90° Clockwise"
                            >
                              <RotateCw size={14} />
                            </button>
                          </div>
                        )}

                        <a
                          href={effectiveDownloadUrl}
                          download={activeDoc.fileName || 'document'}
                          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                          title="Download document file"
                        >
                          <Download size={14} />
                          <span className="d-none d-sm-inline">Download</span>
                        </a>

                        <a
                          href={effectivePreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                          title="Open document in a dedicated browser tab"
                        >
                          <ExternalLink size={14} />
                          <span className="d-none d-sm-inline">New Tab</span>
                        </a>
                      </div>
                    </div>

                    {/* Preview Screen */}
                    <div
                      className="flex-grow-1 d-flex align-items-center justify-content-center rounded-3 border bg-dark-subtle overflow-hidden position-relative mb-3"
                      style={{
                        minHeight: isFullscreen ? '480px' : '380px',
                        maxHeight: isFullscreen ? 'calc(100vh - 280px)' : '460px',
                        backgroundColor: '#1E1E1E',
                      }}
                    >
                      {imageLoading && (
                        <div className="position-absolute d-flex flex-column align-items-center justify-content-center text-light z-1">
                          <div className="spinner-border spinner-border-sm text-gold mb-2" role="status" />
                          <span className="small opacity-75">Loading authorized document preview...</span>
                        </div>
                      )}

                      {isPdf ? (
                        <iframe
                          src={effectivePreviewUrl}
                          title="PDF Document Preview"
                          className="w-100 h-100 border-0"
                          style={{ minHeight: isFullscreen ? '520px' : '380px' }}
                          onLoad={() => setImageLoading(false)}
                          onError={() => {
                            setImageLoading(false);
                            setImageError(true);
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex align-items-center justify-content-center w-100 h-100 p-2"
                          style={{ overflow: 'auto' }}
                        >
                          {imageError ? (
                            <div className="text-center text-white-50 p-4">
                              <AlertTriangle size={32} className="text-warning mb-2 mx-auto" />
                              <p className="small mb-2">Preview unavailable directly in frame.</p>
                              <a
                                href={effectiveDownloadUrl}
                                className="btn btn-sm btn-gold text-dark fw-semibold"
                                download
                              >
                                Download to Inspect
                              </a>
                            </div>
                          ) : (
                            <img
                              src={effectivePreviewUrl}
                              alt={activeDoc.documentType}
                              className="img-fluid rounded transition-all"
                              onLoad={() => setImageLoading(false)}
                              onError={() => {
                                setImageLoading(false);
                                setImageError(true);
                              }}
                              style={{
                                transform: `scale(${zoomScale}) rotate(${rotationDegree}deg)`,
                                transition: 'transform 0.2s ease',
                                maxHeight: isFullscreen ? 'calc(100vh - 300px)' : '420px',
                                objectFit: 'contain',
                                cursor: zoomScale > 1 ? 'grab' : 'default',
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Rejection / Resubmission alert if already recorded */}
                    {activeDoc.rejectionReason && (
                      <div className="alert alert-danger py-2 px-3 small mb-2 d-flex align-items-start gap-2">
                        <XCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Rejection Notice:</strong> {activeDoc.rejectionReason}
                          {activeDoc.reviewedBy && (
                            <span className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>
                              (Reviewed by: {activeDoc.reviewedBy} on {activeDoc.reviewedAt ? new Date(activeDoc.reviewedAt).toLocaleDateString() : ''})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {activeDoc.reviewNotes && (
                      <div className="alert alert-info py-2 px-3 small mb-2 d-flex align-items-start gap-2">
                        <AlertTriangle size={16} className="text-info mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Compliance Notes:</strong> {activeDoc.reviewNotes}
                        </div>
                      </div>
                    )}

                    {/* Action Form or Review Buttons */}
                    {actionType ? (
                      <div className="card border bg-light p-3 rounded-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="fw-bold mb-0 text-dark">
                            {actionType === 'APPROVE' && 'Confirm Document Approval'}
                            {actionType === 'REJECT' && 'Reject Document (Reason Required)'}
                            {actionType === 'RESUBMIT' && 'Request Document Resubmission'}
                          </h6>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-muted p-0 text-decoration-none"
                            onClick={() => {
                              setActionType(null);
                              setValidationError(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>

                        {validationError && (
                          <div className="alert alert-danger py-1.5 px-2.5 small mb-2">{validationError}</div>
                        )}

                        {actionType === 'APPROVE' && (
                          <div className="small text-muted mb-3">
                            You are about to verify and approve this document. Ensure validity dates and identification details are authentic and unexpired.
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
                          <label className="form-label small text-muted mb-1">Internal Review Notes (Optional)</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Optional internal note for compliance audit trail..."
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
                                : 'btn-warning text-dark'
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
                          <span className="small text-muted">Current Decision:</span>
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
                            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                            onClick={() => setActionType('REJECT')}
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning text-dark d-flex align-items-center gap-1"
                            onClick={() => setActionType('RESUBMIT')}
                          >
                            <RefreshCw size={14} />
                            Resubmit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-success d-flex align-items-center gap-1 fw-semibold"
                            onClick={() => setActionType('APPROVE')}
                          >
                            <CheckCircle2 size={14} />
                            Approve Document
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-5">
                    <FileText size={42} className="text-muted opacity-50 mb-3" />
                    <p className="mb-0">Select a document from the checklist on the left to inspect and review.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            className="modal-footer px-4 py-2.5 border-top d-flex justify-content-between align-items-center"
            style={{ borderColor: 'var(--kt-border, #E8DFCE)', backgroundColor: 'var(--kt-cream-bg, #F8F5EB)' }}
          >
            <div className="text-muted small" style={{ fontSize: '0.75rem' }}>
              Kings Taxi Super Admin Compliance Suite &bull; Gondar, Ethiopia
            </div>
            <button type="button" className="btn btn-secondary btn-sm px-4" onClick={onClose}>
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
