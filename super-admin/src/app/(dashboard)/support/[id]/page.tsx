'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  HelpCircle,
  User,
  Phone,
  Mail,
  Send,
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { supportService } from '../../../../services/supportService';
import { SupportTicket, TicketStatus } from '../../../../types';
import { formatDateTime, formatRelativeTime } from '../../../../utils/dateUtils';

export default function SupportTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const loadTicket = async () => {
    setIsLoading(true);
    try {
      const data = await supportService.getTicketById(id);
      setTicket(data);
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadTicket();
  }, [id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyText.trim()) return;

    setIsSending(true);
    try {
      await supportService.replyToTicket(ticket.id, replyText);
      setReplyText('');
      loadTicket();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!ticket) return;
    try {
      await supportService.updateTicketStatus(ticket.id, status);
      loadTicket();
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading support ticket...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-5">
        <h2 className="h5 fw-bold text-obsidian">Ticket Not Found</h2>
        <Link href="/support" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Support Tickets
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Ticket: ${ticket.ticketReference}`}
        description={`${ticket.categoryLabel} • Opened by ${ticket.requesterName} (${ticket.requesterRole})`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Support & Inquiries', href: '/support' },
          { label: ticket.ticketReference },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/support" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back</span>
            </Link>
            {ticket.status !== 'RESOLVED' && (
              <button
                type="button"
                className="btn btn-success btn-sm d-flex align-items-center gap-1.5"
                onClick={() => handleUpdateStatus('RESOLVED')}
              >
                <CheckCircle size={14} />
                <span>Mark as Resolved</span>
              </button>
            )}
          </div>
        }
      />

      <div className="row g-4">
        {/* Left Column: Messages Thread */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <h3 className="h6 fw-bold text-obsidian mb-0">{ticket.subject}</h3>
              <div className="d-flex align-items-center gap-2">
                <StatusBadge status={ticket.priority} size="sm" />
                <StatusBadge status={ticket.status} size="sm" />
              </div>
            </div>

            <div className="card-body p-4">
              <div className="d-flex flex-column gap-3 mb-4">
                {ticket.messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'ADMIN' || msg.senderRole === 'SUPPORT_AGENT';
                  return (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-3 border ${
                        isAdmin
                          ? 'bg-gold-subtle border-gold ms-md-4'
                          : 'bg-light border-light me-md-4'
                      }`}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-1.5">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-obsidian text-sm">{msg.senderName}</span>
                          <span
                            className={`badge text-xs ${
                              isAdmin ? 'bg-gold text-dark' : 'bg-secondary text-white'
                            }`}
                          >
                            {msg.senderRole}
                          </span>
                        </div>
                        <span className="text-muted text-xs">{formatRelativeTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-obsidian text-sm mb-0">{msg.message}</p>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="border-top pt-3">
                <label className="form-label text-sm fw-medium text-obsidian mb-2">
                  Official Administrator Response
                </label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your response to the requester..."
                  className="form-control form-control-sm mb-2 shadow-none"
                />
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    disabled={isSending}
                    className="btn btn-gold btn-sm px-4 fw-semibold d-flex align-items-center gap-1.5"
                  >
                    {isSending ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Send Response</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Requester & Case Meta */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3">
              <div className="d-flex align-items-center gap-2">
                <User size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Requester Profile</h3>
              </div>
            </div>
            <div className="card-body p-3">
              <div className="mb-2.5">
                <span className="text-muted small d-block">Full Name</span>
                <span className="fw-bold text-obsidian small">{ticket.requesterName}</span>
              </div>
              <div className="mb-2.5">
                <span className="text-muted small d-block">Phone</span>
                <span className="fw-medium text-obsidian small font-monospace">
                  {ticket.requesterPhone}
                </span>
              </div>
              <div className="mb-2.5">
                <span className="text-muted small d-block">Email</span>
                <span className="text-obsidian small">{ticket.requesterEmail}</span>
              </div>
              {ticket.relatedEntityId && (
                <div>
                  <span className="text-muted small d-block">Related Reference</span>
                  <span className="fw-bold text-gold small font-monospace">
                    {ticket.relatedEntityId}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
