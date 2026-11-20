import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(37, 37, 37, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 1060,
      }}
    >
      <div className="modal-dialog modal-dialog-centered px-3" style={{ maxWidth: 440 }}>
        <div
          className="modal-content shadow-lg border rounded-4 overflow-hidden"
          style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
        >
          <div
            className="modal-header border-bottom py-3 px-3 px-sm-4"
            style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
          >
            <div className="d-flex align-items-center gap-2">
              <div
                className="p-2 rounded-circle"
                style={{
                  backgroundColor: variant === 'danger' ? '#FEE8E8' : '#FEF6E4',
                  color: variant === 'danger' ? '#B91C1C' : '#B45309',
                }}
              >
                <AlertTriangle size={19} />
              </div>
              <h5 className="modal-title fw-bold mb-0 text-obsidian" style={{ fontSize: '1.05rem' }}>
                {title}
              </h5>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-link text-muted p-1 border-0"
              onClick={onCancel}
              disabled={isLoading}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="modal-body p-3 p-sm-4">
            <p className="mb-0" style={{ color: '#77736A', fontSize: '0.9rem' }}>
              {message}
            </p>
          </div>

          <div
            className="modal-footer border-top py-2.5 px-3 px-sm-4 d-flex justify-content-end gap-2"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <button
              type="button"
              className="btn btn-light btn-sm px-3"
              onClick={onCancel}
              disabled={isLoading}
              style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8', color: '#252525' }}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn btn-sm px-3 fw-bold ${
                variant === 'danger' ? 'btn-danger' : 'btn-gold'
              }`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
