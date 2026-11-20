'use client';

import React, { useState, useRef } from 'react';

export interface DocumentUploadValue {
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  fileName?: string;
  fileFormat?: string;
  fileSize?: number;
  expiryDate?: string;
}

interface DocumentUploadFieldProps {
  label: string;
  documentType: string;
  required?: boolean;
  helperText?: string;
  value?: DocumentUploadValue | null;
  onChange: (value: DocumentUploadValue | null) => void;
  showExpiryDate?: boolean;
  showDocumentNumber?: boolean;
}

export const DocumentUploadField: React.FC<DocumentUploadFieldProps> = ({
  label,
  documentType,
  required = false,
  helperText,
  value,
  onChange,
  showExpiryDate = true,
  showDocumentNumber = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docNumber, setDocNumber] = useState(value?.documentNumber || '');
  const [expiry, setExpiry] = useState(value?.expiryDate || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10MB limit.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Invalid format. Please upload JPG, PNG, WebP, or PDF.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const fileFormat = file.type.includes('pdf') ? 'pdf' : file.type.split('/')[1] || 'jpg';

      setTimeout(() => {
        setUploading(false);
        onChange({
          documentType,
          documentNumber: docNumber,
          fileUrl: dataUrl,
          fileName: file.name,
          fileFormat,
          fileSize: file.size,
          expiryDate: expiry,
        });
      }, 400);
    };

    reader.onerror = () => {
      setUploading(false);
      setErrorMessage('Failed to read file.');
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateNumber = (num: string) => {
    setDocNumber(num);
    if (value) {
      onChange({ ...value, documentNumber: num });
    }
  };

  const updateExpiry = (exp: string) => {
    setExpiry(exp);
    if (value) {
      onChange({ ...value, expiryDate: exp });
    }
  };

  const isPdf = value?.fileFormat === 'pdf' || value?.fileUrl?.toLowerCase().includes('.pdf');

  return (
    <div className="card mb-3 border" style={{ backgroundColor: 'var(--kt-card-bg, #FFFDF7)', borderColor: 'var(--kt-border, #E8DFCE)' }}>
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className="form-label fw-bold mb-0 text-dark" style={{ fontSize: '0.95rem' }}>
            {label} {required && <span className="text-danger">*</span>}
          </label>
          {value ? (
            <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1">
              ✓ Document Attached
            </span>
          ) : (
            <span className="badge rounded-pill bg-light text-muted border px-2 py-1">
              Pending Upload
            </span>
          )}
        </div>

        {helperText && <p className="small text-muted mb-2">{helperText}</p>}

        {errorMessage && (
          <div className="alert alert-danger py-1 px-2 small mb-2" role="alert">
            {errorMessage}
          </div>
        )}

        {/* Upload Dropzone */}
        {!value && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-3 text-center rounded border border-2 border-dashed cursor-pointer transition-all ${
              isDragging ? 'border-primary bg-primary-subtle' : 'border-secondary-subtle bg-light'
            }`}
            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="d-none"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
            />
            {uploading ? (
              <div className="py-2">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
                <span className="small text-muted">Processing document...</span>
              </div>
            ) : (
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted mb-1"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div className="small fw-semibold text-dark">
                  Drag & drop file here or <span className="text-primary">browse</span>
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Supports PDF, JPG, PNG, WebP up to 10MB
                </div>
              </div>
            )}
          </div>
        )}

        {/* Uploaded File Preview & Metadata */}
        {value && (
          <div>
            <div className="d-flex align-items-center justify-content-between p-2 rounded border bg-light mb-2">
              <div className="d-flex align-items-center gap-2 overflow-hidden">
                {isPdf ? (
                  <div
                    className="d-flex align-items-center justify-content-center rounded bg-danger text-white fw-bold"
                    style={{ width: '42px', height: '42px', fontSize: '0.75rem', flexShrink: 0 }}
                  >
                    PDF
                  </div>
                ) : (
                  <img
                    src={value.fileUrl}
                    alt={label}
                    className="rounded object-fit-cover border"
                    style={{ width: '42px', height: '42px', flexShrink: 0 }}
                  />
                )}
                <div className="text-truncate">
                  <div className="small fw-semibold text-truncate">{value.fileName || `${documentType}.file`}</div>
                  <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                    {value.fileSize ? `${(value.fileSize / 1024).toFixed(1)} KB` : 'Attached'}
                  </div>
                </div>
              </div>
              <div className="d-flex gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary py-1 px-2"
                  onClick={() => fileInputRef.current?.click()}
                  title="Replace document"
                >
                  Replace
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="d-none"
                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                  onChange={(e) => e.target.files?.[0] && handleFileProcess(e.target.files[0])}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger py-1 px-2"
                  onClick={handleRemove}
                  title="Remove document"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Optional document fields */}
            <div className="row g-2 mt-1">
              {showDocumentNumber && (
                <div className={showExpiryDate ? 'col-12 col-md-6' : 'col-12'}>
                  <label className="form-label small text-muted mb-1">Document / License Number</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. ETH-DRV-90812"
                    value={docNumber}
                    onChange={(e) => updateNumber(e.target.value)}
                  />
                </div>
              )}
              {showExpiryDate && (
                <div className={showDocumentNumber ? 'col-12 col-md-6' : 'col-12'}>
                  <label className="form-label small text-muted mb-1">Expiry Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={expiry}
                    onChange={(e) => updateExpiry(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
