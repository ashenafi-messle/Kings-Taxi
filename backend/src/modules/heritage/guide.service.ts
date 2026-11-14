import { prisma } from '../../core/database/prisma';

export interface GuideFallback {
  id: string;
  fullName: string;
  languages: string[];
  qualifications: string[];
  specialties: string[];
  dailyRate: number;
  hourlyRate?: number;
  phone: string;
  email?: string;
  profileImageUrl?: string;
  rating: number;
  totalToursLed: number;
  isActive: boolean;
  availabilityStatus: 'AVAILABLE' | 'ASSIGNED' | 'ON_LEAVE' | 'INACTIVE';
}

export const FALLBACK_TOUR_GUIDES: GuideFallback[] = [
  {
    id: 'c1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    fullName: 'Yohannes Mengistu',
    languages: ['English', 'Amharic', 'Ge\'ez'],
    qualifications: ['Ministry of Tourism Certified Senior Guide', 'BA in Ethiopian History (UoG)'],
    specialties: ['Gondar Imperial Architecture', 'Orthodox Iconography & Church History'],
    dailyRate: 1500,
    hourlyRate: 200,
    phone: '+251918765432',
    email: 'yohannes.guide@kingstaxi.et',
    profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&fit=crop&q=80',
    rating: 4.95,
    totalToursLed: 342,
    isActive: true,
    availabilityStatus: 'AVAILABLE',
  },
  {
    id: 'c2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d',
    fullName: 'Selamawit Tadesse',
    languages: ['English', 'French', 'Amharic'],
    qualifications: ['UNESCO World Heritage Site Certified Guide', 'MA in Cultural Heritage Management'],
    specialties: ['Lake Tana Island Monasteries', 'Empress Mentewab & Fasilides Dynasty'],
    dailyRate: 1800,
    hourlyRate: 250,
    phone: '+251922334455',
    email: 'selamawit.tadesse@kingstaxi.et',
    profileImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&fit=crop&q=80',
    rating: 4.98,
    totalToursLed: 418,
    isActive: true,
    availabilityStatus: 'AVAILABLE',
  },
  {
    id: 'c3c4d5e6-f7a8-4b0c-9d2e-3f4a5b6c7d8e',
    fullName: 'Dawit Alene',
    languages: ['English', 'German', 'Amharic'],
    qualifications: ['Certified Eco-Tour and Heritage Guide'],
    specialties: ['Simien Mountains Ecosystem', 'Debre Berhan Selassie Murals'],
    dailyRate: 1600,
    hourlyRate: 220,
    phone: '+251933445566',
    email: 'dawit.alene@kingstaxi.et',
    profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&fit=crop&q=80',
    rating: 4.88,
    totalToursLed: 215,
    isActive: true,
    availabilityStatus: 'AVAILABLE',
  },
];

export class HeritageTourGuideService {
  /**
   * List active guides
   */
  async listGuides(language?: string) {
    try {
      const guides = await prisma.heritageTourGuide.findMany({
        where: {
          isActive: true,
          ...(language ? { languages: { has: language } } : {}),
        },
        orderBy: [{ rating: 'desc' }, { totalToursLed: 'desc' }],
      });
      if (guides.length > 0) return guides;
    } catch {
      // Database offline or empty
    }

    let results = FALLBACK_TOUR_GUIDES.filter((g) => g.isActive);
    if (language) {
      results = results.filter((g) =>
        g.languages.some((l) => l.toLowerCase() === language.toLowerCase())
      );
    }
    return results;
  }

  /**
   * Get guide by ID
   */
  async getGuideById(id: string) {
    try {
      const guide = await prisma.heritageTourGuide.findUnique({
        where: { id },
      });
      if (guide) return guide;
    } catch {
      // Database offline
    }

    return FALLBACK_TOUR_GUIDES.find((g) => g.id === id) || null;
  }

  /**
   * Check if guide is available on the specified date
   */
  async checkGuideAvailability(guideId: string, scheduledDateStr: string): Promise<boolean> {
    try {
      const date = new Date(scheduledDateStr);
      const conflict = await prisma.heritageTourBooking.findFirst({
        where: {
          assignedGuideId: guideId,
          scheduledDate: date,
          bookingStatus: {
            notIn: ['CANCELLED', 'REJECTED'],
          },
        },
      });

      return !conflict;
    } catch {
      // Fallback
      return true;
    }
  }

  /**
   * Super Admin: Create Guide
   */
  async adminCreateGuide(data: any) {
    return prisma.heritageTourGuide.create({
      data,
    });
  }

  /**
   * Super Admin: Update Guide
   */
  async adminUpdateGuide(id: string, data: any) {
    return prisma.heritageTourGuide.update({
      where: { id },
      data,
    });
  }
}

export const heritageTourGuideService = new HeritageTourGuideService();

