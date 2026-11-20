'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Landmark, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { HeritageService } from '../../../../services/heritageService';
import { ImageUploadGallery, GalleryImageItem } from '../../../../components/common/ImageUploadGallery';

export default function NewHeritageSitePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    category: 'HISTORIC_CASTLE',
    city: 'Gondar',
    region: 'Amhara',
    unescoWorldHeritage: true,
    entranceFeeETB: 300,
    visitingHours: '08:30 AM - 05:30 PM',
    description: '',
  });
  const [destinationImages, setDestinationImages] = useState<GalleryImageItem[]>([
    {
      imageUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80',
      displayOrder: 0,
      isPrimary: true,
      caption: 'Fasil Ghebbi Imperial Castle & Ramparts',
    },
    {
      imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
      displayOrder: 1,
      isPrimary: false,
      caption: 'Historic Stone Archways and Turrets',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : name === 'entranceFeeETB'
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Destination name is required.');
      return;
    }

    if (destinationImages.length < 2 || destinationImages.length > 4) {
      setError('A heritage destination must have between 2 and 4 gallery images.');
      return;
    }

    setIsLoading(true);
    try {
      await HeritageService.createHeritageSite({
        ...formData,
        destinationImages,
      } as any);
      router.push('/heritage');
    } catch (err: any) {
      setError(err.message || 'Failed to add heritage destination.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Add Heritage Destination"
        description="Register a cultural landmark, historic attraction, or national park for guided tour itineraries"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Heritage Sites', href: '/heritage' },
          { label: 'New Destination' },
        ]}
        actions={
          <Link href="/heritage" className="btn btn-outline-secondary btn-sm">
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
                <Landmark size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Destination Details</h3>
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
                      Destination Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Kuskuam Maryam Church & Palace"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Entrance Fee (ETB)
                    </label>
                    <input
                      type="number"
                      name="entranceFeeETB"
                      value={formData.entranceFeeETB}
                      onChange={handleChange}
                      className="form-control form-control-sm py-2 shadow-none font-monospace"
                    />
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
                      <option value="Debark">Debark (Simien Mountains)</option>
                      <option value="Bahir Dar">Bahir Dar</option>
                      <option value="Lalibela">Lalibela</option>
                    </select>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">Region</label>
                    <input
                      type="text"
                      name="region"
                      value={formData.region}
                      onChange={handleChange}
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Visiting Hours
                    </label>
                    <input
                      type="text"
                      name="visitingHours"
                      value={formData.visitingHours}
                      onChange={handleChange}
                      placeholder="08:30 AM - 05:30 PM"
                      className="form-control form-control-sm py-2 shadow-none"
                    />
                  </div>

                  <div className="col-12 col-md-6 d-flex align-items-center">
                    <div className="form-check mt-3">
                      <input
                        className="form-check-input shadow-none"
                        type="checkbox"
                        id="unescoCheck"
                        name="unescoWorldHeritage"
                        checked={formData.unescoWorldHeritage}
                        onChange={handleChange}
                      />
                      <label className="form-check-label text-sm fw-medium" htmlFor="unescoCheck">
                        Recognized as UNESCO World Heritage Site
                      </label>
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Historical Significance & Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Historical background, architecture, key emperors or landmarks..."
                      className="form-control form-control-sm shadow-none"
                    />
                  </div>
                </div>

                {/* Multiple Destination Image Upload to Cloudinary (2–4 images) */}
                <div className="mt-4 pt-3 border-top border-light">
                  <ImageUploadGallery
                    label="Destination Gallery Images (2 to 4 Images Required)"
                    helperText="Upload between 2 and 4 high-resolution photos of landmarks, scenery, or architectural details to Cloudinary. Designate one image as the primary cover photo."
                    entityLabel="Heritage Destination"
                    minImages={2}
                    maxImages={4}
                    images={destinationImages}
                    onChange={setDestinationImages}
                  />
                </div>

                <div className="mt-4 pt-3 border-top border-light d-flex align-items-center justify-content-end gap-2">
                  <Link href="/heritage" className="btn btn-outline-secondary btn-sm px-3">
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
                    <span>Save Destination</span>
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
