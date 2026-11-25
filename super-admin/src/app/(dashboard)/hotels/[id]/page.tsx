'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  BedDouble,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle,
  Save,
  DollarSign,
  Users,
  Wifi,
  Sparkles,
  Camera,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { ImageUploadGallery, GalleryImageItem } from '../../../../components/common/ImageUploadGallery';
import { ImageUploadSingle } from '../../../../components/common/ImageUploadSingle';
import { HotelService } from '../../../../services/hotelService';
import { Hotel, HotelRoomType } from '../../../../types';
import { formatETB } from '../../../../utils/formatters';

export default function HotelDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inventorySummary, setInventorySummary] = useState<any>(null);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [sseConnected, setSseConnected] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [blockModal, setBlockModal] = useState<{
    roomId: string;
    roomName: string;
    action: 'BLOCK' | 'UNBLOCK';
    startDate: string;
    endDate: string;
    quantity: number;
    note: string;
  } | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomImages, setNewRoomImages] = useState<GalleryImageItem[]>([]);
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [coverImagePayload, setCoverImagePayload] = useState('');
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [roomImageError, setRoomImageError] = useState<string | null>(null);
  const [editingRoomGallery, setEditingRoomGallery] = useState<{
    roomId: string;
    roomName: string;
    images: GalleryImageItem[];
  } | null>(null);
  const [newRoomForm, setNewRoomForm] = useState({
    name: '',
    pricePerNightETB: 4500,
    totalInventory: 10,
    maxGuests: 2,
    bedType: '1 King Bed',
    roomSizeSqM: 35,
    description: '',
  });

  const loadHotel = async () => {
    setIsLoading(true);
    try {
      const data = await HotelService.getHotelById(id);
      setHotel(data);
    } catch (err) {
      console.error('Failed to load hotel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInventorySummary = async (sDate = startDate, eDate = endDate) => {
    if (!id) return;
    try {
      const summary = await HotelService.getHotelInventorySummary(id, sDate, eDate);
      setInventorySummary(summary);
      setInventoryError(null);
    } catch (err: any) {
      console.warn('Inventory summary unavailable:', err?.message || err);
    }
  };

  useEffect(() => {
    if (id) loadHotel();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadInventorySummary(startDate, endDate);
  }, [id, startDate, endDate]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = HotelService.subscribeInventoryEvents(
      id,
      () => {
        loadHotel();
        loadInventorySummary(startDate, endDate);
      },
      (connected) => setSseConnected(connected)
    );
    return unsubscribe;
  }, [id, startDate, endDate]);

  useEffect(() => {
    if (!id || sseConnected) return;
    const fallbackTimer = setInterval(() => {
      loadInventorySummary(startDate, endDate);
    }, 30000);
    return () => clearInterval(fallbackTimer);
  }, [id, sseConnected, startDate, endDate]);

  const handleAdjustInventory = async (roomId: string, currentTotal: number, delta: number) => {
    if (!hotel) return;
    const newTotal = Math.max(1, currentTotal + delta);
    setInventoryError(null);
    try {
      await HotelService.adjustRoomInventory(hotel.id, roomId, newTotal);
      await Promise.all([loadHotel(), loadInventorySummary(startDate, endDate)]);
    } catch (err: any) {
      console.error('Failed to update inventory:', err);
      setInventoryError(err?.message || 'Failed to update room inventory.');
    }
  };

  const handleSubmitBlockRooms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel || !blockModal) return;
    setInventoryError(null);
    try {
      await HotelService.blockRoomInventory(hotel.id, blockModal.roomId, {
        startDate: blockModal.startDate,
        endDate: blockModal.endDate,
        quantity: blockModal.quantity,
        action: blockModal.action,
        note: blockModal.note,
      });
      setBlockModal(null);
      await Promise.all([loadHotel(), loadInventorySummary(startDate, endDate)]);
    } catch (err: any) {
      setInventoryError(err?.message || 'Failed to update blocked rooms.');
    }
  };

  const handleSaveCoverImage = async () => {
    if (!hotel || !coverImagePayload) return;
    setIsSavingCover(true);
    setCoverError(null);
    try {
      await HotelService.uploadHotelCover(hotel.id, coverImagePayload);
      setIsEditingCover(false);
      setCoverImagePayload('');
      loadHotel();
    } catch (err: any) {
      setCoverError(err.message || 'Failed to update hotel cover image.');
    } finally {
      setIsSavingCover(false);
    }
  };

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel || !newRoomForm.name.trim()) return;

    if (newRoomImages.length < 1 || newRoomImages.length > 8) {
      setRoomImageError('A room type must have between 1 and 8 gallery images.');
      return;
    }
    setRoomImageError(null);

    try {
      await HotelService.addRoomType(hotel.id, {
        ...newRoomForm,
        images: newRoomImages.map((i) => i.imageUrl),
        galleryImages: newRoomImages,
      } as any);
      setIsAddingRoom(false);
      setNewRoomImages([]);
      setNewRoomForm({
        name: '',
        pricePerNightETB: 4500,
        totalInventory: 10,
        maxGuests: 2,
        bedType: '1 King Bed',
        roomSizeSqM: 35,
        description: '',
      });
      loadHotel();
    } catch (err: any) {
      console.error('Failed to add room type:', err);
      setRoomImageError(err.message || 'Failed to add room type to hotel.');
    }
  };

  const handleSaveRoomGallery = async () => {
    if (!hotel || !editingRoomGallery) return;
    if (editingRoomGallery.images.length < 1 || editingRoomGallery.images.length > 8) {
      setRoomImageError('A room type must have between 1 and 8 images.');
      return;
    }
    setRoomImageError(null);

    try {
      await HotelService.updateRoomImages(
        hotel.id,
        editingRoomGallery.roomId,
        editingRoomGallery.images
      );
      setEditingRoomGallery(null);
      loadHotel();
    } catch (err: any) {
      console.error('Failed to update room gallery:', err);
      setRoomImageError(err.message || 'Failed to update room gallery.');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading hotel inventory...</p>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="text-center py-5">
        <h2 className="h5 fw-bold text-obsidian">Hotel Not Found</h2>
        <Link href="/hotels" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Hotels
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={hotel.name}
        description={`${hotel.starRating} Stars • ${hotel.address}, ${hotel.city}, Ethiopia`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Partner Hotels', href: '/hotels' },
          { label: hotel.name },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/hotels" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back</span>
            </Link>
            {hotel.status === 'PUBLISHED' ? (
              <button
                type="button"
                className="btn btn-outline-warning btn-sm"
                onClick={async () => {
                  await HotelService.unpublishHotel(hotel.id);
                  loadHotel();
                }}
              >
                Unpublish
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-gold btn-sm fw-semibold"
                onClick={async () => {
                  await HotelService.publishHotel(hotel.id);
                  loadHotel();
                }}
              >
                Publish to App
              </button>
            )}
            <button
              type="button"
              className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
              onClick={() => setIsAddingRoom(true)}
            >
              <Plus size={16} />
              <span>Add Room Type</span>
            </button>
          </div>
        }
      />

      <div className="row g-4">
        {/* Left Column: Property Overview */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-body p-4">
              {/* Hotel Cover Image Preview with Change Trigger */}
              <div className="position-relative rounded-3 overflow-hidden mb-3 border shadow-sm" style={{ height: 180, backgroundColor: '#0F172A' }}>
                <img
                  src={hotel.heroImage}
                  alt={hotel.name}
                  className="w-100 h-100 object-fit-cover"
                />
                <button
                  type="button"
                  className="btn btn-dark btn-sm position-absolute bottom-0 end-0 m-2 py-1 px-2.5 text-xs bg-opacity-75 d-flex align-items-center gap-1 shadow-none"
                  onClick={() => {
                    setCoverImagePayload('');
                    setCoverError(null);
                    setIsEditingCover(true);
                  }}
                >
                  <Camera size={13} />
                  <span>Change Cover</span>
                </button>
              </div>

              <div className="d-flex align-items-center justify-content-between mb-3">
                <StatusBadge status={hotel.status} />
                <div className="d-flex align-items-center gap-1 text-gold fw-bold small">
                  <Star size={15} className="fill-gold" />
                  <span>{hotel.starRating} Star Property</span>
                </div>
              </div>

              <h2 className="h5 fw-bold text-obsidian mb-2">{hotel.name}</h2>
              <p className="text-muted small mb-3">{hotel.description}</p>

              <div className="border-top pt-3 text-start">
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Location</span>
                  <span className="text-obsidian fw-medium small d-flex align-items-center gap-1">
                    <MapPin size={13} className="text-gold" />
                    <span>
                      {hotel.address}, {hotel.city}
                    </span>
                  </span>
                </div>
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Direct Contact</span>
                  <span className="text-obsidian fw-medium small d-flex align-items-center gap-1 font-monospace">
                    <Phone size={13} />
                    <span>{hotel.phone}</span>
                  </span>
                </div>
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Email</span>
                  <span className="text-obsidian fw-medium small">{hotel.email}</span>
                </div>
                <div>
                  <span className="text-muted small d-block">Check-in / Check-out</span>
                  <span className="text-obsidian fw-medium small">
                    {hotel.checkInTime} / {hotel.checkOutTime}
                  </span>
                </div>
              </div>

              {/* Amenities */}
              <div className="border-top pt-3 mt-3">
                <span className="text-muted small d-block mb-2">Amenities & Facilities</span>
                <div className="d-flex flex-wrap gap-1.5">
                  {hotel.facilities.map((fac, idx) => (
                    <span key={idx} className="badge bg-light text-dark border text-xs">
                      {fac}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Room Types & Inventory Management */}
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
              <div>
                <h3 className="h6 fw-bold text-obsidian mb-0">Dynamic Room Inventory Management</h3>
                <p className="text-muted small mb-0">
                  Real-time date-based availability, reserved holds, confirmed bookings, and maintenance blocks
                </p>
              </div>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <input
                  type="date"
                  className="form-control form-control-sm"
                  style={{ width: 138 }}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Inventory Start Date"
                />
                <span className="text-muted small">to</span>
                <input
                  type="date"
                  className="form-control form-control-sm"
                  style={{ width: 138 }}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="Inventory End Date"
                />
                <span className={`badge ${sseConnected ? 'bg-success-subtle text-success' : 'bg-gold-subtle text-gold'}`}>
                  {sseConnected ? '● SSE Live Sync' : 'Polling Fallback'}
                </span>
              </div>
            </div>

            {inventoryError && (
              <div className="alert alert-danger m-3 mb-0 py-2 px-3 small" role="alert">
                {inventoryError}
              </div>
            )}

            <div className="card-body p-3">
              <div className="d-flex flex-column gap-3">
                {hotel.roomTypes.map((room) => {
                  const roomSummary = (inventorySummary?.roomTypes || []).find(
                    (r: any) => r.roomTypeId === room.id
                  );
                  const availableCount = roomSummary?.availableRooms ?? room.availableInventory ?? room.availableRooms ?? 0;
                  const reservedCount = roomSummary?.reservedRooms ?? 0;
                  const confirmedCount = roomSummary?.confirmedRooms ?? 0;
                  const blockedCount = roomSummary?.blockedRooms ?? 0;
                  const occupancyRate = roomSummary?.occupancyPercent ?? 0;
                  return (
                    <div
                      key={room.id}
                      className="p-3.5 rounded-3 border border-light bg-light d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h4 className="h6 fw-bold text-obsidian mb-0">{room.name}</h4>
                          <span
                            className={`badge text-xs ${availableCount > 0
                              ? 'bg-success-subtle text-success'
                              : 'bg-danger-subtle text-danger'
                              }`}
                          >
                            {availableCount > 0 ? 'AVAILABLE' : 'SOLD OUT'}
                          </span>
                        </div>
                        <p className="text-muted small mb-2">{room.description}</p>
                        <div className="d-flex flex-wrap align-items-center gap-3 text-xs text-muted">
                          <span>Bed: {room.bedType}</span>
                          <span>•</span>
                          <span>Max Guests: {room.maxGuests}</span>
                          <span>•</span>
                          <span>Size: {room.roomSizeSqM} m²</span>
                        </div>

                        {/* Date-Based Inventory Breakdown */}
                        <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                          <span className="badge bg-white text-dark border">Total: {room.totalInventory}</span>
                          <span className="badge bg-success-subtle text-success">Avail: {availableCount}</span>
                          <span className="badge bg-warning-subtle text-warning-emphasis">Reserved: {reservedCount}</span>
                          <span className="badge bg-primary-subtle text-primary">Confirmed: {confirmedCount}</span>
                          <span className="badge bg-secondary-subtle text-secondary">Blocked: {blockedCount}</span>
                          <span className="badge bg-light text-muted border">Occ: {occupancyRate}%</span>
                          <button
                            type="button"
                            className="btn btn-outline-warning btn-sm py-0 px-2 text-xs"
                            onClick={() =>
                              setBlockModal({
                                roomId: room.id,
                                roomName: room.name,
                                action: 'BLOCK',
                                startDate,
                                endDate,
                                quantity: 1,
                                note: 'Maintenance block',
                              })
                            }
                          >
                            Block Rooms
                          </button>
                          {blockedCount > 0 && (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm py-0 px-2 text-xs"
                              onClick={() =>
                                setBlockModal({
                                  roomId: room.id,
                                  roomName: room.name,
                                  action: 'UNBLOCK',
                                  startDate,
                                  endDate,
                                  quantity: blockedCount,
                                  note: 'Maintenance complete',
                                })
                              }
                            >
                              Unblock
                            </button>
                          )}
                        </div>

                        {blockModal && blockModal.roomId === room.id && (
                          <form onSubmit={handleSubmitBlockRooms} className="mt-2 p-2.5 bg-white rounded border">
                            <div className="d-flex flex-wrap align-items-end gap-2">
                              <div>
                                <label className="form-label text-xs mb-1">Start Date</label>
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={blockModal.startDate}
                                  onChange={(e) => setBlockModal({ ...blockModal, startDate: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <label className="form-label text-xs mb-1">End Date</label>
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  value={blockModal.endDate}
                                  onChange={(e) => setBlockModal({ ...blockModal, endDate: e.target.value })}
                                  required
                                />
                              </div>
                              <div style={{ width: 90 }}>
                                <label className="form-label text-xs mb-1">Rooms</label>
                                <input
                                  type="number"
                                  min={1}
                                  className="form-control form-control-sm"
                                  value={blockModal.quantity}
                                  onChange={(e) => setBlockModal({ ...blockModal, quantity: Math.max(1, Number(e.target.value) || 1) })}
                                  required
                                />
                              </div>
                              <div className="flex-grow-1">
                                <label className="form-label text-xs mb-1">Note</label>
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  value={blockModal.note}
                                  onChange={(e) => setBlockModal({ ...blockModal, note: e.target.value })}
                                />
                              </div>
                              <button type="submit" className="btn btn-sm btn-primary">
                                {blockModal.action === 'BLOCK' ? 'Confirm Block' : 'Confirm Unblock'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setBlockModal(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Room Photos Preview & Manage Button */}
                        <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top border-light">
                          <div className="d-flex align-items-center gap-1.5 overflow-hidden">
                            {(room.images && room.images.length > 0
                              ? room.images
                              : ['https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400&auto=format&fit=crop&q=80']
                            ).slice(0, 4).map((imgUrl, i) => (
                              <div
                                key={i}
                                className="position-relative rounded overflow-hidden border"
                                style={{ width: 44, height: 34, flexShrink: 0 }}
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Room image ${i + 1}`}
                                  className="w-100 h-100 object-fit-cover"
                                />
                                {i === 0 && (
                                  <span
                                    className="position-absolute bottom-0 start-0 w-100 text-center bg-dark bg-opacity-75 text-warning"
                                    style={{ fontSize: '0.52rem', fontWeight: 700 }}
                                  >
                                    ★ Cover
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm py-0.5 px-2 text-xs d-flex align-items-center gap-1 ms-auto"
                            onClick={() => {
                              const existingGallery: GalleryImageItem[] =
                                room.galleryImages ||
                                (room.images || []).map((url, idx) => ({
                                  imageUrl: url,
                                  displayOrder: idx,
                                  isPrimary: idx === 0,
                                  caption: `${room.name} view ${idx + 1}`,
                                }));
                              setEditingRoomGallery({
                                roomId: room.id,
                                roomName: room.name,
                                images:
                                  existingGallery.length >= 2
                                    ? existingGallery
                                    : [
                                      ...existingGallery,
                                      {
                                        imageUrl:
                                          'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
                                        displayOrder: existingGallery.length,
                                        isPrimary: false,
                                        caption: 'Room interior view',
                                      },
                                    ],
                              });
                            }}
                          >
                            <Camera size={12} />
                            <span>Manage Photos ({room.images?.length || 2}/4)</span>
                          </button>
                        </div>
                      </div>

                      {/* Pricing & Fast Inventory Controller */}
                      <div className="d-flex flex-row flex-md-column align-items-end justify-content-between w-100 w-md-auto border-top border-md-top-0 pt-2 pt-md-0">
                        <div className="text-start text-md-end mb-2">
                          <span className="text-muted small d-block">Tariff / Night</span>
                          <span className="fw-bold text-gold h5 mb-0">
                            {formatETB(room.pricePerNightETB)}
                          </span>
                        </div>

                        {/* Inventory Counter +/- */}
                        <div className="d-flex align-items-center gap-2">
                          <div className="text-end me-1">
                            <div className="text-xs text-muted">Total Rooms</div>
                            <div className="fw-bold text-obsidian small">
                              {availableCount} / {room.totalInventory} Avail
                            </div>
                          </div>

                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-secondary px-2"
                              title="Decrease Total Inventory"
                              onClick={() =>
                                handleAdjustInventory(room.id, room.totalInventory, -1)
                              }
                            >
                              <Minus size={13} />
                            </button>
                            <span className="btn btn-outline-secondary disabled px-3 fw-bold text-obsidian">
                              {room.totalInventory}
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline-secondary px-2"
                              title="Increase Total Inventory"
                              onClick={() =>
                                handleAdjustInventory(room.id, room.totalInventory, 1)
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Room Type */}
      {isAddingRoom && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 760 }}>
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header border-bottom border-light">
                <h5 className="modal-title fw-bold text-obsidian">Add New Room Type</h5>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setIsAddingRoom(false)}
                />
              </div>

              <form onSubmit={handleCreateRoomType}>
                <div className="modal-body py-3">
                  {roomImageError && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      {roomImageError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Room Type Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newRoomForm.name}
                      onChange={(e) =>
                        setNewRoomForm({ ...newRoomForm, name: e.target.value })
                      }
                      placeholder="e.g. Royal Fasil Deluxe Suite"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label text-sm fw-medium text-obsidian mb-1">
                        Price Per Night (ETB) *
                      </label>
                      <input
                        type="number"
                        required
                        value={newRoomForm.pricePerNightETB}
                        onChange={(e) =>
                          setNewRoomForm({
                            ...newRoomForm,
                            pricePerNightETB: Number(e.target.value),
                          })
                        }
                        className="form-control form-control-sm py-2 shadow-none font-monospace"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-sm fw-medium text-obsidian mb-1">
                        Total Room Count *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newRoomForm.totalInventory}
                        onChange={(e) =>
                          setNewRoomForm({
                            ...newRoomForm,
                            totalInventory: Number(e.target.value),
                          })
                        }
                        className="form-control form-control-sm py-2 shadow-none"
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label text-sm fw-medium text-obsidian mb-1">
                        Bed Configuration
                      </label>
                      <input
                        type="text"
                        value={newRoomForm.bedType}
                        onChange={(e) =>
                          setNewRoomForm({ ...newRoomForm, bedType: e.target.value })
                        }
                        placeholder="1 King Bed / 2 Queens"
                        className="form-control form-control-sm py-2 shadow-none"
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-sm fw-medium text-obsidian mb-1">
                        Max Occupants
                      </label>
                      <input
                        type="number"
                        value={newRoomForm.maxGuests}
                        onChange={(e) =>
                          setNewRoomForm({
                            ...newRoomForm,
                            maxGuests: Number(e.target.value),
                          })
                        }
                        min="1"
                        max="8"
                        className="form-control form-control-sm py-2 shadow-none"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Room Description
                    </label>
                    <textarea
                      rows={2}
                      value={newRoomForm.description}
                      onChange={(e) =>
                        setNewRoomForm({ ...newRoomForm, description: e.target.value })
                      }
                      placeholder="Highlights, mountain or castle views, balcony..."
                      className="form-control form-control-sm shadow-none text-sm"
                    />
                  </div>

                  {/* Multiple Room Image Upload to Cloudinary (1–6 images) */}
                  <ImageUploadGallery
                    label="Room Gallery Images (1 to 6 Images)"
                    helperText="Upload photos showcasing bedroom, bath, balcony, or panoramic views from your device. Set one image as the primary cover."
                    entityLabel="Room Type"
                    minImages={1}
                    maxImages={6}
                    images={newRoomImages}
                    onChange={setNewRoomImages}
                  />
                </div>

                <div className="modal-footer border-top border-light">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setIsAddingRoom(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-gold btn-sm px-4 fw-semibold"
                    disabled={newRoomImages.length < 1 || newRoomImages.length > 6}
                  >
                    Add Room Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Room Gallery Images */}
      {editingRoomGallery && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 760 }}>
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header border-bottom border-light">
                <h5 className="modal-title fw-bold text-obsidian">
                  Manage Photos: {editingRoomGallery.roomName}
                </h5>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setEditingRoomGallery(null)}
                />
              </div>

              <div className="modal-body py-3">
                {roomImageError && (
                  <div className="alert alert-danger py-2 px-3 small mb-3">
                    {roomImageError}
                  </div>
                )}
                <ImageUploadGallery
                  label="Room Gallery Images (1 to 6 Images)"
                  helperText="Upload, reorder, replace, or set the primary cover photo for this room type."
                  entityLabel="Room Type"
                  minImages={1}
                  maxImages={6}
                  images={editingRoomGallery.images}
                  onChange={(imgs) =>
                    setEditingRoomGallery({
                      ...editingRoomGallery,
                      images: imgs,
                    })
                  }
                />
              </div>

              <div className="modal-footer border-top border-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setEditingRoomGallery(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm px-4 fw-semibold"
                  disabled={
                    editingRoomGallery.images.length < 1 ||
                    editingRoomGallery.images.length > 6
                  }
                  onClick={handleSaveRoomGallery}
                >
                  Save Gallery Photos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Hotel Cover Image */}
      {isEditingCover && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540 }}>
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header border-bottom border-light">
                <h5 className="modal-title fw-bold text-obsidian">Change Hotel Cover Image</h5>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setIsEditingCover(false)}
                />
              </div>
              <div className="modal-body py-3">
                {coverError && (
                  <div className="alert alert-danger py-2 px-3 small mb-3">
                    {coverError}
                  </div>
                )}
                <ImageUploadSingle
                  label="Select New Cover Image"
                  helperText="Choose a high-resolution photo from your device. This will upload to Cloudinary and update on passenger mobile hotel cards."
                  value={coverImagePayload}
                  onChange={(uri) => setCoverImagePayload(uri)}
                  onRemove={() => setCoverImagePayload('')}
                />
              </div>
              <div className="modal-footer border-top border-light">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setIsEditingCover(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-gold btn-sm px-4 fw-semibold d-flex align-items-center gap-1.5"
                  disabled={!coverImagePayload || isSavingCover}
                  onClick={handleSaveCoverImage}
                >
                  {isSavingCover ? (
                    <span className="spinner-border spinner-border-sm" role="status" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>Save Cover Image</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
