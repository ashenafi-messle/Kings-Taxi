'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Socket } from 'socket.io-client';
import {
  User,
  Send,
  ArrowLeft,
  CheckCircle,
  Wifi,
  WifiOff,
  UserCheck,
  Paperclip,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { supportService } from '../../../../services/supportService';
import { SupportTicket, TicketPriority, TicketStatus } from '../../../../types/support.types';
import { formatRelativeTime } from '../../../../utils/dateUtils';

export default function SupportTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadTicket = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await supportService.getTicketById(id);
      setTicket(data);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load ticket');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadTicket();
  }, [id, loadTicket]);

  useEffect(() => {
    if (!id) return;
    const socket = supportService.connectSupportSocket({
      onConnectionChange: (connected) => {
        setSocketConnected(connected);
        if (connected) {
          socket?.emit('support:join_ticket', { ticketId: id });
        }
      },
      onMessageCreated: (payload) => {
        if (payload.ticketId !== id) return;
        setTicket((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m.id === payload.message.id)) return prev;
          return {
            ...prev,
            status: payload.nextStatus || prev.status,
            messages: [...prev.messages, payload.message],
          };
        });
        if (payload.message.senderRole === 'PASSENGER') {
          supportService.markTicketRead(id).catch(() => {});
        }
      },
      onStatusChanged: (payload) => {
        if (payload.ticketId !== id) return;
        setTicket((prev) => (prev ? { ...prev, status: payload.status } : prev));
      },
      onPriorityChanged: (payload) => {
        if (payload.ticketId !== id) return;
        setTicket((prev) => (prev ? { ...prev, priority: payload.priority } : prev));
      },
      onTicketAssigned: (payload) => {
        if (payload.ticketId !== id) return;
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                assignedAdminId: payload.assignedAdminId,
                assignedAdminName: payload.assignedAdminName,
              }
            : prev
        );
      },
      onTyping: (payload) => {
        if (payload.ticketId !== id || payload.senderType === 'ADMIN') return;
        if (payload.isTyping) {
          setTypingLabel(`${payload.senderName || 'Passenger'} is typing...`);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingLabel(null), 3000);
        } else {
          setTypingLabel(null);
        }
      },
      onTicketUpdated: (payload) => {
        if (payload?.ticket?.id === id) {
          setTicket(payload.ticket);
        }
      },
    });

    socketRef.current = socket;
    if (socket?.connected) {
      socket.emit('support:join_ticket', { ticketId: id });
    }

    return () => {
      socket?.emit('support:leave_ticket', { ticketId: id });
      socket?.disconnect();
      socketRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages.length]);

  const handleReplyChange = (val: string) => {
    setReplyText(val);
    if (socketRef.current?.connected && id) {
      socketRef.current.emit('support:typing', {
        ticketId: id,
        isTyping: val.trim().length > 0,
        senderName: 'Support Team',
      });
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !replyText.trim()) return;

    setIsSending(true);
    setErrorMsg(null);
    try {
      const msg = await supportService.replyToTicket(ticket.id, replyText.trim());
      setReplyText('');
      socketRef.current?.emit('support:typing', { ticketId: id, isTyping: false });
      setTicket((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === msg.id)) return prev;
        return {
          ...prev,
          messages: [...prev.messages, msg],
        };
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send reply');
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!ticket) return;
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const updated = await supportService.updateTicketStatus(ticket.id, status);
      setTicket(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePriority = async (priority: TicketPriority) => {
    if (!ticket) return;
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const updated = await supportService.updateTicketPriority(ticket.id, priority);
      setTicket(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update priority');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!ticket) return;
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const updated = await supportService.assignTicket(ticket.id);
      setTicket(updated);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to assign ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-gold" role="status" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-5">
        <h3 className="h5 fw-bold text-obsidian mb-2">Support Ticket Not Found</h3>
        {errorMsg && <p className="text-danger small mb-3">{errorMsg}</p>}
        <Link href="/support" className="btn btn-gold btn-sm">
          Return to Tickets
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
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span
              className={`badge d-inline-flex align-items-center gap-1 px-2 py-1.5 ${
                socketConnected ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-light text-muted border'
              }`}
            >
              {socketConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span>{socketConnected ? 'Live' : 'Offline'}</span>
            </span>
            <Link href="/support" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back</span>
            </Link>
            <button
              type="button"
              disabled={isUpdating}
              className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1.5"
              onClick={handleAssignToMe}
            >
              <UserCheck size={14} />
              <span>{ticket.assignedAdminName ? 'Assign to Me' : 'Claim Ticket'}</span>
            </button>
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' ? (
              <button
                type="button"
                disabled={isUpdating}
                className="btn btn-success btn-sm d-flex align-items-center gap-1.5"
                onClick={() => handleUpdateStatus('RESOLVED')}
              >
                <CheckCircle size={14} />
                <span>Mark Resolved</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isUpdating}
                className="btn btn-warning btn-sm d-flex align-items-center gap-1.5"
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
              >
                <RotateCcw size={14} />
                <span>Reopen Ticket</span>
              </button>
            )}
          </div>
        }
      />

      {errorMsg && (
        <div className="alert alert-danger mb-3 py-2 small" role="alert">
          {errorMsg}
        </div>
      )}

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
              <div className="d-flex flex-column gap-3 mb-4" style={{ maxHeight: 520, overflowY: 'auto' }}>
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
                        <span className="text-muted text-xs">
                          {formatRelativeTime(msg.createdAt)}
                          {msg.readAt ? ' • Read' : ''}
                        </span>
                      </div>
                      <p className="text-obsidian text-sm mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {msg.message}
                      </p>
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {msg.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={att.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="d-inline-block border rounded overflow-hidden"
                            >
                              <img
                                src={att.fileUrl}
                                alt={att.originalFilename || 'Attachment'}
                                style={{ width: 96, height: 72, objectFit: 'cover' }}
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {typingLabel && (
                  <div className="text-muted small fst-italic px-2">{typingLabel}</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendReply} className="border-top pt-3">
                <label className="form-label text-sm fw-medium text-obsidian mb-2">
                  Official Administrator Response
                </label>
                <textarea
                  rows={3}
                  required
                  value={replyText}
                  onChange={(e) => handleReplyChange(e.target.value)}
                  placeholder="Type your real-time response to the passenger..."
                  className="form-control form-control-sm mb-2 shadow-none"
                />
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
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

        {/* Right Column: Requester, Controls & Attachments */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3">
              <div className="d-flex align-items-center gap-2">
                <User size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Requester & Case Controls</h3>
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
              <div className="mb-3">
                <span className="text-muted small d-block">Email</span>
                <span className="text-obsidian small">{ticket.requesterEmail}</span>
              </div>
              <div className="mb-3">
                <span className="text-muted small d-block">Assigned Admin</span>
                <span className="fw-semibold text-obsidian small">
                  {ticket.assignedAdminName || 'Unassigned'}
                </span>
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Status</label>
                <select
                  className="form-select form-select-sm"
                  value={ticket.status}
                  disabled={isUpdating}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_PASSENGER">Waiting for Passenger</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div className="mb-3">
                <label className="text-muted small d-block mb-1">Priority</label>
                <select
                  className="form-select form-select-sm"
                  value={ticket.priority}
                  disabled={isUpdating}
                  onChange={(e) => handleUpdatePriority(e.target.value as TicketPriority)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {ticket.relatedEntityId && (
                <div className="border-top pt-2.5">
                  <span className="text-muted small d-block">
                    Related {ticket.relatedEntityType || 'Booking'} Reference
                  </span>
                  <span className="fw-bold text-gold small font-monospace">
                    {ticket.relatedEntityId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="card shadow-sm border-0 rounded-3 mb-4">
              <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center gap-2">
                <Paperclip size={16} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">
                  Attachments ({ticket.attachments.length})
                </h3>
              </div>
              <div className="card-body p-3 d-flex flex-wrap gap-2">
                {ticket.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border rounded overflow-hidden d-inline-block"
                  >
                    <img
                      src={att.fileUrl}
                      alt={att.originalFilename || 'Attachment'}
                      style={{ width: 92, height: 70, objectFit: 'cover' }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
