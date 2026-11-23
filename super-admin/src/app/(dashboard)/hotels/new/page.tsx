'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { HotelService } from '../../../../services/hotelService';

export default function NewHotelPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    city: 'Gondar',
    address: '',
    starRating: 4,
    phone: '+251 58 ',
    email: '',
    description: '',
    heroImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    publishImmediately: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'starRating' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Hotel property name is required.');
      return;
    }
    if (!formData.address.trim()) {
      setError('Hotel physical address is required.');
      return;
    }

    setIsLoading(true);
    try {
      await HotelService.createHotel(formData as any);
      router.push('/hotels');
    } catch (err: any) {
      setError(err.message || 'Failed to register partner hotel.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Partner Hotel"
        description="Register a new lodging partner into the Kings Taxi hospitality network across Ethiopia"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Partner Hotels', href: '/hotels' },
          { label: 'New Hotel' },
        ]}
        actions={
          <Link href="/hotels" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" />
            <span>Cancel</span>
          </Link>
        }
      />

      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-3">
              <div className="d-flex align-items-center gap-2">
                <Building2 size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Hotel Information</h3>
              </div>
            </div>

            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2.5 px-3 mb-4 rounded-3 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12 col-md-8">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Hotel Property Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Taye Belay Hotel"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Star Rating *
                    </label>
                    <select
                      name="starRating"
                      value={formData.starRating}
                      onChange={handleChange}
                      className="form-select form-select-sm py-2 shadow-none"
                    >
                      <option value="3">3 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="5">5 Stars Luxury</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">City *</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="form-select form-select-sm py-2 shadow-none"
                    >
                      <option value="Gondar">Gondar</option>
                      <option value="Addis Ababa">Addis Ababa</option>
                      <option value="Bahir Dar">Bahir Dar</option>
                      <option value="Lalibela">Lalibela</option>
                      <option value="Hawassa">Hawassa</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Street Address & Landmark *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Near Fasil Ghebbi, Piassa District"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Reception Telephone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-control form-control-sm py-2 shadow-none font-monospace"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Reservation Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="reservations@hotel.et"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Property Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe the hotel location, view of the castles or mountains..."
                      className="form-control form-control-sm shadow-none"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Cover Image URL
                    </label>
                    <input
                      type="url"
                      name="heroImage"
                      value={formData.heroImage}
                      onChange={handleChange}
                      placeholder="https://images.unsplash.com/... or Cloudinary URL"
                      className="form-control form-control-sm py-2 shadow-none font-monospace text-xs"
                    />
                    <div className="text-muted text-xs mt-1">
                      Main hero photo displayed to passengers on mobile hotel cards and booking headers.
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="form-check form-switch p-3 bg-light rounded-3 border">
                      <input
                        className="form-check-input ms-0 me-2"
                        type="checkbox"
                        role="switch"
                        id="publishImmediately"
                        name="publishImmediately"
                        checked={formData.publishImmediately}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            publishImmediately: e.target.checked,
                          }))
                        }
                      />
                      <label className="form-check-label fw-semibold text-obsidian small" htmlFor="publishImmediately">
                        Publish immediately to Kings Taxi mobile app
                      </label>
                      <div className="text-muted text-xs mt-1">
                        When enabled, this hotel will be approved and immediately visible to passengers in the mobile app.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top border-light d-flex align-items-center justify-content-end gap-2">
                  <Link href="/hotels" className="btn btn-outline-secondary btn-sm px-3">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-gold btn-sm px-4 fw-semibold d-flex align-items-center gap-1.5"
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      <Save size={15} />
                    )}
                    <span>Save Hotel Partner</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
