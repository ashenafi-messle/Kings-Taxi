'use client';

import React, { useState, useRef } from 'react';

export interface GalleryImageItem {
  id?: string;
  imageUrl: string;
  publicId?: string;
  caption?: string;
  displayOrder: number;
  isPrimary: boolean;
  fileFormat?: string;
  fileSize?: number;
}

interface ImageUploadGalleryProps {
  label?: string;
  helperText?: string;
  images: GalleryImageItem[];
  onChange: (images: GalleryImageItem[]) => void;
  minImages?: number; // default 2
  maxImages?: number; // default 4
  entityLabel?: string; // e.g. "Room Type" or "Heritage Destination"
}

export const ImageUploadGallery: React.FC<ImageUploadGalleryProps> = ({
  label = 'Gallery Images',
  helperText = 'Upload between 2 and 4 high-resolution images. Select one image as the primary cover.',
  images,
  onChange,
  minImages = 2,
  maxImages = 4,
  entityLabel = 'Destination',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canAddMore = images.length < maxImages;
  const isBelowMinimum = images.length < minImages;

  // Ensure proper ordering and single primary
  const normalizeImages = (list: GalleryImageItem[]): GalleryImageItem[] => {
    const hasPrimary = list.some((img) => img.isPrimary);
    return list.map((img, idx) => ({
      ...img,
      displayOrder: idx,
      isPrimary: hasPrimary ? img.isPrimary : idx === 0,
    }));
  };

  const handleFiles = (fileList: FileList) => {
    setErrorMessage(null);
    const availableSlots = maxImages - images.length;
    if (availableSlots <= 0) {
      setErrorMessage(`Maximum limit of ${maxImages} images reached.`);
      return;
    }

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    const filesToProcess = Array.from(fileList).slice(0, availableSlots);
    const newItems: GalleryImageItem[] = [];

    let processedCount = 0;
    filesToProcess.forEach((file, index) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!validMimes.includes(file.type) && !validExtensions.includes(ext)) {
        setErrorMessage(`File ${file.name} is not supported. Only JPEG, JPG, PNG, and WebP are allowed.`);
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setErrorMessage(`File ${file.name} exceeds 8MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        newItems.push({
          imageUrl: reader.result as string,
          displayOrder: images.length + index,
          isPrimary: images.length === 0 && index === 0,
          fileFormat: file.type.split('/')[1] || ext || 'jpg',
          fileSize: file.size,
          caption: file.name.replace(/\.[^/.]+$/, ''),
        });

        processedCount++;
        if (processedCount === filesToProcess.length) {
          const combined = normalizeImages([...images, ...newItems]);
          onChange(combined);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleReplaceFile = (file: File) => {
    if (replacingIndex === null) return;
    setErrorMessage(null);

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validMimes.includes(file.type) && !validExtensions.includes(ext)) {
      setErrorMessage(`File ${file.name} is not supported. Only JPEG, JPG, PNG, and WebP are allowed.`);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage(`File ${file.name} exceeds 8MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const updated = [...images];
      updated[replacingIndex] = {
        ...updated[replacingIndex],
        imageUrl: reader.result as string,
        fileFormat: file.type.split('/')[1] || ext || 'jpg',
        fileSize: file.size,
      };
      onChange(normalizeImages(updated));
      setReplacingIndex(null);
    };
    reader.readAsDataURL(file);
  };

  const handleMakePrimary = (index: number) => {
    const updated = images.map((img, idx) => ({
      ...img,
      isPrimary: idx === index,
    }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    onChange(normalizeImages(copy));
  };

  const handleRemove = (index: number) => {
    const filtered = images.filter((_, idx) => idx !== index);
    onChange(normalizeImages(filtered));
  };

  const handleCaptionChange = (index: number, caption: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index], caption };
    onChange(updated);
  };

  return (
    <div className="card mb-4 border" style={{ backgroundColor: 'var(--kt-card-bg, #FFFDF7)', borderColor: 'var(--kt-border, #E8DFCE)' }}>
      <div className="card-body p-3 p-md-4">
        {/* Header & Limits Banner */}
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div>
            <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '1rem' }}>
              {label} <span className="text-danger">*</span>
            </h6>
            <div className="small text-muted">{helperText}</div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span
              className={`badge rounded-pill px-3 py-2 ${
                images.length >= minImages && images.length <= maxImages
                  ? 'bg-success-subtle text-success border border-success-subtle'
                  : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
              }`}
            >
              <strong>{images.length}</strong> / {maxImages} Images ({minImages}–{maxImages} required)
            </span>
          </div>
        </div>

        {/* Validation Warning Alert */}
        {isBelowMinimum && (
          <div className="alert alert-warning py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <div>
              <strong>Action required:</strong> Please upload at least <strong>{minImages} images</strong> for this {entityLabel.toLowerCase()} (Currently {images.length}).
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="alert alert-danger py-2 px-3 small mb-3">{errorMessage}</div>
        )}

        {/* Image Grid */}
        <div className="row g-3 mb-3">
          {images.map((item, index) => (
            <div key={item.id || index} className="col-12 col-sm-6 col-lg-3">
              <div
                className={`card h-100 border position-relative overflow-hidden transition-all ${
                  item.isPrimary ? 'border-2 shadow-sm' : ''
                }`}
                style={{
                  borderColor: item.isPrimary ? 'var(--kt-gold, #E9B83F)' : 'var(--kt-border, #E8DFCE)',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {/* Primary Cover Badge */}
                {item.isPrimary && (
                  <div
                    className="position-absolute top-0 start-0 m-2 badge px-2 py-1 shadow-sm d-flex align-items-center gap-1"
                    style={{
                      backgroundColor: 'var(--kt-gold, #E9B83F)',
                      color: '#1A1814',
                      fontWeight: 700,
                      zIndex: 3,
                    }}
                  >
                    ★ Primary Cover
                  </div>
                )}

                {/* Display Order Badge */}
                <div
                  className="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75 text-white"
                  style={{ zIndex: 3 }}
                >
                  #{index + 1}
                </div>

                {/* Thumbnail */}
                <div
                  className="ratio ratio-4x3 cursor-pointer bg-light overflow-hidden position-relative"
                  onClick={() => setPreviewImage(item.imageUrl)}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.caption || `Image ${index + 1}`}
                    className="w-100 h-100 object-fit-cover"
                  />
                  <div className="position-absolute bottom-0 start-0 w-100 p-1 text-center bg-dark bg-opacity-50 text-white small" style={{ fontSize: '0.7rem' }}>
                    Click to zoom
                  </div>
                </div>

                {/* Controls & Metadata */}
                <div className="card-body p-2 d-flex flex-column justify-content-between gap-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Image caption / alt tag..."
                    value={item.caption || ''}
                    onChange={(e) => handleCaptionChange(index, e.target.value)}
                    style={{ fontSize: '0.78rem' }}
                  />

                  {/* Buttons Row */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-1 pt-1 border-top">
                    {/* Primary Button */}
                    {!item.isPrimary ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-warning text-dark py-0 px-2"
                        style={{ fontSize: '0.72rem' }}
                        onClick={() => handleMakePrimary(index)}
                        title="Set as primary cover image"
                      >
                        Make Primary
                      </button>
                    ) : (
                      <span className="text-success small fw-bold" style={{ fontSize: '0.72rem' }}>
                        ✓ Primary
                      </span>
                    )}

                    {/* Reorder and Delete controls */}
                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border py-0 px-1"
                        style={{ fontSize: '0.75rem' }}
                        disabled={index === 0}
                        onClick={() => handleMove(index, 'left')}
                        title="Move left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border py-0 px-1"
                        style={{ fontSize: '0.75rem' }}
                        disabled={index === images.length - 1}
                        onClick={() => handleMove(index, 'right')}
                        title="Move right"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary py-0 px-1"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => {
                          setReplacingIndex(index);
                          replaceInputRef.current?.click();
                        }}
                        title="Replace this image"
                      >
                        ↻
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-1"
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => handleRemove(index)}
                        title="Remove image"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Image Dropzone Card (if below maxImages) */}
          {canAddMore && (
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`card h-100 border-2 border-dashed d-flex align-items-center justify-content-center text-center p-4 transition-all ${
                  isDragging ? 'border-primary bg-primary-subtle' : 'border-secondary-subtle bg-light'
                }`}
                style={{
                  minHeight: '220px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="d-none"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted mb-2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <div className="fw-semibold text-dark small mb-1">
                  + Add Image ({images.length}/{maxImages})
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  Drag & drop or browse
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Replace Input */}
        <input
          ref={replaceInputRef}
          type="file"
          className="d-none"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => e.target.files?.[0] && handleReplaceFile(e.target.files[0])}
        />

        {/* Modal Full-Screen Preview */}
        {previewImage && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }}
            onClick={() => setPreviewImage(null)}
          >
            <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-content bg-transparent border-0 text-center">
                <div className="d-flex justify-content-end p-2">
                  <button
                    type="button"
                    className="btn btn-close btn-close-white"
                    onClick={() => setPreviewImage(null)}
                  />
                </div>
                <img
                  src={previewImage}
                  alt="Full gallery preview"
                  className="img-fluid rounded shadow-lg mx-auto"
                  style={{ maxHeight: '80vh', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
