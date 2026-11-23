'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, RefreshCw, AlertCircle, Check } from 'lucide-react';

export interface ImageUploadSingleProps {
  label?: string;
  helperText?: string;
  value?: string;
  onChange: (dataUriOrUrl: string) => void;
  onRemove?: () => void;
  required?: boolean;
  maxSizeBytes?: number; // default 8MB
}

export const ImageUploadSingle: React.FC<ImageUploadSingleProps> = ({
  label = 'Cover Image',
  helperText = 'Select a high-resolution JPEG, JPG, PNG or WebP image from your device (up to 8MB).',
  value,
  onChange,
  onRemove,
  required = false,
  maxSizeBytes = 8 * 1024 * 1024,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(value || '');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string; format: string } | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setPreview(value);
    }
  }, [value]);

  const validateAndReadFile = (file: File) => {
    setError(null);

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validMimes.includes(file.type) && !validExtensions.includes(extension)) {
      setError(`Invalid format (${file.type || extension}). Only JPEG, JPG, PNG, and WebP are supported.`);
      return;
    }

    if (file.size > maxSizeBytes) {
      const mbSize = (file.size / (1024 * 1024)).toFixed(2);
      const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
      setError(`File size is ${mbSize}MB, which exceeds the ${maxMb}MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setPreview(dataUri);
      setFileDetails({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        format: extension.toUpperCase(),
      });
      onChange(dataUri);
    };
    reader.onerror = () => {
      setError('Failed to read image file from your device. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndReadFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndReadFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview('');
    setFileDetails(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onChange('');
    if (onRemove) onRemove();
  };

  return (
    <div className="mb-3">
      {label && (
        <label className="form-label text-sm fw-medium text-obsidian mb-1 d-flex align-items-center justify-content-between">
          <span>
            {label} {required && <span className="text-danger">*</span>}
          </span>
          {fileDetails && (
            <span className="badge bg-light text-secondary border font-monospace text-xs">
              {fileDetails.format} • {fileDetails.size}
            </span>
          )}
        </label>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-2 rounded-2 text-xs">
          <AlertCircle size={14} className="flex-shrink-0 text-danger" />
          <div>{error}</div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
      />

      {preview ? (
        <div className="card border rounded-3 overflow-hidden position-relative shadow-sm" style={{ backgroundColor: '#FAF8F5' }}>
          <div
            style={{
              height: 200,
              width: '100%',
              backgroundColor: '#0F172A',
              backgroundImage: `url(${preview})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="p-2.5 bg-white border-top d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-2 text-xs text-muted text-truncate me-2">
              <ImageIcon size={14} className="text-gold flex-shrink-0" />
              <span className="text-truncate">{fileDetails?.name || 'Selected cover image'}</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm py-1 px-2 text-xs d-flex align-items-center gap-1 shadow-none"
                onClick={() => fileInputRef.current?.click()}
              >
                <RefreshCw size={12} />
                <span>Replace</span>
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm py-1 px-2 text-xs d-flex align-items-center gap-1 shadow-none"
                onClick={handleRemove}
              >
                <Trash2 size={12} />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border rounded-3 p-4 text-center cursor-pointer transition-all ${
            isDragging ? 'border-primary bg-light' : 'border-dashed'
          }`}
          style={{
            cursor: 'pointer',
            backgroundColor: isDragging ? '#F8FAFC' : '#FCFBFA',
            borderColor: isDragging ? '#C99700' : '#D4C5A9',
            borderStyle: 'dashed',
            borderWidth: 2,
          }}
        >
          <div className="d-inline-flex p-3 rounded-circle bg-light mb-2 text-gold">
            <UploadCloud size={24} color="#C99700" />
          </div>
          <div className="fw-semibold text-obsidian text-sm mb-1">
            Click to upload or drag and drop image
          </div>
          <p className="text-muted text-xs mb-0">
            {helperText}
          </p>
        </div>
      )}
    </div>
  );
};
