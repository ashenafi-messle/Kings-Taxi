'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Landmark,
  Compass,
  MapPin,
  Clock,
  DollarSign,
  Users,
  CheckCircle,
  ArrowLeft,
  Calendar,
  Sparkles,
  Camera,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { ImageUploadGallery, GalleryImageItem } from '../../../../components/common/ImageUploadGallery';
import { HeritageService } from '../../../../services/heritageService';
import { HeritageSite } from '../../../../types';
import { formatETB } from '../../../../utils/formatters';

export default function HeritageDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [site, setSite] = useState<HeritageSite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [galleryImages, setGalleryImages] = useState<GalleryImageItem[]>([]);
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadSite = async () => {
    setIsLoading(true);
    try {
      const data = await HeritageService.getHeritageSiteById(id);
      setSite(data);
      if (data) {
        const imgs = data.destinationImages || (data.galleryImages || []).map((url, idx) => ({
          imageUrl: url,
          displayOrder: idx,
          isPrimary: idx === 0,
          caption: `${data.name} Photo ${idx + 1}`,
        }));
        if (imgs.length === 0 && data.heroImage) {
          imgs.push({
            imageUrl: data.heroImage,
            displayOrder: 0,
            isPrimary: true,
            caption: `${data.name} Cover`,
          });
        }
        if (imgs.length < 2) {
          imgs.push({
            imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
            displayOrder: imgs.length,
            isPrimary: false,
            caption: 'Historic Architecture & Grounds',
          });
        }
        setGalleryImages(imgs);
      }
    } catch (err) {
      console.error('Failed to load heritage destination:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGallery = async () => {
    if (!site) return;
    if (galleryImages.length < 2 || galleryImages.length > 4) {
      setSaveMessage('A heritage destination must have between 2 and 4 images.');
      return;
    }

    setIsSavingGallery(true);
    setSaveMessage(null);
    try {
      const primaryUrl = galleryImages.find((img) => img.isPrimary)?.imageUrl || galleryImages[0]?.imageUrl || site.heroImage;
      const updated = await HeritageService.updateHeritageSite(site.id, {
        heroImage: primaryUrl,
        galleryImages: galleryImages.map((i) => i.imageUrl),
        destinationImages: galleryImages,
      });
      if (updated) {
        setSite({ ...updated });
        setSaveMessage('Gallery images saved and synchronized successfully!');
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      setSaveMessage(err.message || 'Failed to update destination gallery.');
    } finally {
      setIsSavingGallery(false);
    }
  };

  useEffect(() => {
    if (id) loadSite();
  }, [id]);

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading heritage destination...</p>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-5">
        <h2 className="h5 fw-bold text-obsidian">Destination Not Found</h2>
        <Link href="/heritage" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Heritage Directory
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={site.name}
        description={`${site.city}, ${site.region} • ${site.unescoWorldHeritage ? 'UNESCO World Heritage Site' : 'National Heritage Landmark'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Heritage Sites', href: '/heritage' },
          { label: site.name },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/heritage" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back</span>
            </Link>
          </div>
        }
      />

      <div className="row g-4">
        {/* Left Column: Destination Info */}
        <div className="col-12 col-lg-4">
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-body p-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <StatusBadge status={site.status} />
                {site.unescoWorldHeritage && (
                  <span className="badge bg-gold text-dark fw-bold text-xs">UNESCO SITE</span>
                )}
              </div>

              <h2 className="h5 fw-bold text-obsidian mb-2">{site.name}</h2>
              <p className="text-muted small mb-3">{site.description}</p>

              <div className="border-top pt-3 text-start">
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Location</span>
                  <span className="text-obsidian fw-medium small d-flex align-items-center gap-1">
                    <MapPin size={13} className="text-gold" />
                    <span>
                      {site.city}, {site.region}
                    </span>
                  </span>
                </div>
                <div className="mb-2.5">
                  <span className="text-muted small d-block">Visiting Hours</span>
                  <span className="text-obsidian fw-medium small d-flex align-items-center gap-1">
                    <Clock size={13} />
                    <span>{site.visitingHours || '08:30 AM - 05:30 PM'}</span>
                  </span>
                </div>
                <div>
                  <span className="text-muted small d-block">Standard Entrance Fee</span>
                  <span className="text-gold fw-bold small">{formatETB(site.entranceFeeETB || site.entryFeeETB || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Destination Gallery & Tour Packages */}
        <div className="col-12 col-lg-8">
          {/* Destination Gallery Images (2-4 Cloudinary Photos) */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="h6 fw-bold text-obsidian mb-0">
                  Destination Visual Assets & Cloudinary Gallery
                </h3>
                <p className="text-muted small mb-0">
                  Manage 2 to 4 high-resolution photos, designate primary cover, and adjust display ordering
                </p>
              </div>
              <Camera size={18} className="text-gold" />
            </div>

            <div className="card-body p-3">
              {saveMessage && (
                <div
                  className={`alert py-2 px-3 small mb-3 ${
                    saveMessage.includes('successfully') ? 'alert-success' : 'alert-danger'
                  }`}
                >
                  {saveMessage}
                </div>
              )}

              <ImageUploadGallery
                label="Destination Gallery Photos (2–4 Required)"
                helperText="Upload, reorder, replace, or set the primary cover photo for this heritage site."
                entityLabel="Heritage Destination"
                minImages={2}
                maxImages={4}
                images={galleryImages}
                onChange={setGalleryImages}
              />

              <div className="d-flex justify-content-end mt-2">
                <button
                  type="button"
                  className="btn btn-gold btn-sm px-4 fw-semibold"
                  disabled={isSavingGallery || galleryImages.length < 2 || galleryImages.length > 4}
                  onClick={handleSaveGallery}
                >
                  {isSavingGallery ? 'Saving...' : 'Save Gallery Changes'}
                </button>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div>
                <h3 className="h6 fw-bold text-obsidian mb-0">Official Kings Tour Packages</h3>
                <p className="text-muted small mb-0">
                  Pre-configured guided expeditions, durations, and private 4WD logistics
                </p>
              </div>
              <Compass size={18} className="text-gold" />
            </div>

            <div className="card-body p-3">
              <div className="d-flex flex-column gap-3">
                {site.tourPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3.5 rounded-3 border border-light bg-light d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h4 className="h6 fw-bold text-obsidian mb-0">{pkg.title}</h4>
                        <span className="badge bg-gold-subtle text-gold text-xs">{pkg.durationHours} Hours</span>
                      </div>
                      <p className="text-muted small mb-2">{pkg.description}</p>
                      <div className="d-flex flex-wrap gap-1.5">
                        {pkg.includesTransport && (
                          <span className="badge bg-light text-dark border text-xs">
                            Private VIP Transport Included
                          </span>
                        )}
                        {pkg.includesGuide && (
                          <span className="badge bg-light text-dark border text-xs">
                            Certified English/Amharic Guide
                          </span>
                        )}
                        {pkg.includesEntranceFees && (
                          <span className="badge bg-light text-dark border text-xs">
                            Entrance Fees Covered
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-start text-md-end flex-shrink-0">
                      <span className="text-muted small d-block">Package Tariff</span>
                      <span className="fw-bold text-gold h5 mb-0">
                        {formatETB(pkg.pricePerPersonETB)}
                      </span>
                      <span className="text-muted text-xs d-block">per visitor</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
