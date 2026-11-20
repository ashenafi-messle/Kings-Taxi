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
import { HotelService } from '../../../../services/hotelService';
import { Hotel, HotelRoomType } from '../../../../types';
import { formatETB } from '../../../../utils/formatters';

export default function HotelDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomImages, setNewRoomImages] = useState<GalleryImageItem[]>([
    {
      imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80',
      displayOrder: 0,
      isPrimary: true,
      caption: 'Master Bedroom King Bed',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
      displayOrder: 1,
      isPrimary: false,
      caption: 'Private Balcony & Panoramic View',
    },
  ]);
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

  useEffect(() => {
    if (id) loadHotel();
  }, [id]);

  const handleAdjustInventory = async (roomId: string, currentTotal: number, delta: number) => {
    if (!hotel) return;
    const newTotal = Math.max(1, currentTotal + delta);
    try {
      await HotelService.updateRoomInventory(hotel.id, roomId, newTotal);
      loadHotel();
    } catch (err) {
      console.error('Failed to update inventory:', err);
    }
  };

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel || !newRoomForm.name.trim()) return;

    if (newRoomImages.length < 2 || newRoomImages.length > 4) {
      setRoomImageError('A room type must have between 2 and 4 gallery images.');
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
    } catch (err) {
      console.error('Failed to add room type:', err);
    }
  };

  const handleSaveRoomGallery = async () => {
    if (!hotel || !editingRoomGallery) return;
    if (editingRoomGallery.images.length < 2 || editingRoomGallery.images.length > 4) {
      setRoomImageError('A room type must have between 2 and 4 images.');
      return;
    }

    try {
      await HotelService.updateRoomImages(
        hotel.id,
        editingRoomGallery.roomId,
        editingRoomGallery.images
      );
      setEditingRoomGallery(null);
      loadHotel();
    } catch (err) {
      console.error('Failed to update room gallery:', err);
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
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="h6 fw-bold text-obsidian mb-0">Dynamic Room Inventory Management</h3>
                <p className="text-muted small mb-0">
                  Update live inventory counts, night tariffs in ETB, and occupancy thresholds
                </p>
              </div>
              <span className="badge bg-gold-subtle text-gold">Live Synced</span>
            </div>

            <div className="card-body p-3">
              <div className="d-flex flex-column gap-3">
                {hotel.roomTypes.map((room) => {
                  const availableCount = room.availableInventory ?? room.availableRooms ?? 0;
                  const bookedCount = room.totalInventory - availableCount;
                  return (
                    <div
                      key={room.id}
                      className="p-3.5 rounded-3 border border-light bg-light d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h4 className="h6 fw-bold text-obsidian mb-0">{room.name}</h4>
                          <span
                            className={`badge text-xs ${
                              availableCount > 0
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

                  {/* Multiple Room Image Upload to Cloudinary (2–4 images) */}
                  <ImageUploadGallery
                    label="Room Gallery Images (2 to 4 Images Required)"
                    helperText="Upload between 2 and 4 photos showcasing bedroom, bath, balcony, or panoramic views. Set one image as the primary cover."
                    entityLabel="Room Type"
                    minImages={2}
                    maxImages={4}
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
                    disabled={newRoomImages.length < 2 || newRoomImages.length > 4}
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
                <ImageUploadGallery
                  label="Room Gallery Images (2 to 4 Images Required)"
                  helperText="Upload, reorder, replace, or set the primary cover photo for this room type."
                  entityLabel="Room Type"
                  minImages={2}
                  maxImages={4}
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
                    editingRoomGallery.images.length < 2 ||
                    editingRoomGallery.images.length > 4
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
    </div>
  );
}
