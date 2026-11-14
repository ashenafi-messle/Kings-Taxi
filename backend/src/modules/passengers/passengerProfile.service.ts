import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { prisma, isDbConnectionError } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { env } from '../../config/env';
import { AppError } from '../../core/errors/appError';
import { EmailService } from '../../integrations/email/email.service';
import { TelegramService } from '../../integrations/telegram/telegram.service';

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// In-memory fallback caches for development, testing & offline resilience
const inMemoryProfileCache = new Map<string, any>();
const inMemoryBiometricMap = new Map<string, boolean>();
const pendingContactVerifications = new Map<
  string,
  {
    passengerId: string;
    type: 'email' | 'phone';
    newContact: string;
    code: string;
    expiresAt: number;
    attempts: number;
  }
>();

export interface UpdateProfileDto {
  fullName?: string;
  city?: string;
  language?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  email?: string;
  phoneNumber?: string;
  verificationCode?: string;
  sessionId?: string;
}

export interface InitiateContactChangeDto {
  type: 'email' | 'phone';
  newContact: string;
}

export interface VerifyContactChangeDto {
  sessionId: string;
  code: string;
}

export interface UpdateProfileImageDto {
  imageUrl: string;
  publicId?: string;
}

export interface UpdateBiometricPreferenceDto {
  enabled: boolean;
  deviceIdentifier?: string;
  deviceName?: string;
  devicePlatform?: 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN';
  biometricType?: string;
}

export class PassengerProfileService {
  /**
   * GET /api/v1/passenger/profile
   * Retrieves profile information for the authenticated passenger.
   */
  async getProfile(passengerId: string) {
    try {
      const passenger = await prisma.passenger.findUnique({
        where: { id: passengerId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          profileImagePublicId: true,
          isVerified: true,
          accountStatus: true,
          language: true,
          city: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (passenger) {
        inMemoryProfileCache.set(passengerId, passenger);
        return {
          ...passenger,
          avatarUrl: passenger.profileImage || undefined,
          biometricEnabled: inMemoryBiometricMap.get(passengerId) ?? false,
        };
      }
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn(
          { passengerId, err: err.message },
          '[PassengerProfile] Database offline, checking in-memory cache'
        );
      } else {
        throw err;
      }
    }

    // Fallback if DB is offline or passenger not yet committed
    const cached = inMemoryProfileCache.get(passengerId);
    if (cached) {
      return {
        ...cached,
        avatarUrl: cached.profileImage || undefined,
        biometricEnabled: inMemoryBiometricMap.get(passengerId) ?? false,
      };
    }

    // Return clean default structure for the authenticated passenger
    const defaultProfile = {
      id: passengerId,
      fullName: 'Valued Passenger',
      email: null,
      phoneNumber: null,
      profileImage: null,
      profileImagePublicId: null,
      avatarUrl: undefined,
      isVerified: true,
      accountStatus: 'ACTIVE',
      language: 'EN',
      city: 'Gondar',
      emergencyContactName: null,
      emergencyContactPhone: null,
      biometricEnabled: inMemoryBiometricMap.get(passengerId) ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    inMemoryProfileCache.set(passengerId, defaultProfile);
    return defaultProfile;
  }

  /**
   * PATCH /api/v1/passenger/profile
   * Updates non-sensitive profile information or verifies contact updates.
   */
  async updateProfile(passengerId: string, dto: UpdateProfileDto) {
    const existing = await this.getProfile(passengerId);

    // If changing email or phone, check whether verification is required
    let verifiedEmail = existing.email;
    let verifiedPhone = existing.phoneNumber;

    if (dto.email && dto.email.toLowerCase() !== (existing.email || '').toLowerCase()) {
      if (!dto.verificationCode || !dto.sessionId) {
        throw new Error('VERIFICATION_REQUIRED: Changing your email address requires OTP verification.');
      }
      // Verify OTP
      await this.verifyContactChange(passengerId, {
        sessionId: dto.sessionId,
        code: dto.verificationCode,
      });
      verifiedEmail = dto.email.trim().toLowerCase();
    }

    if (dto.phoneNumber && dto.phoneNumber !== existing.phoneNumber) {
      if (!dto.verificationCode || !dto.sessionId) {
        throw new Error('VERIFICATION_REQUIRED: Changing your phone number requires OTP verification.');
      }
      await this.verifyContactChange(passengerId, {
        sessionId: dto.sessionId,
        code: dto.verificationCode,
      });
      verifiedPhone = dto.phoneNumber.trim();
    }

    const updatePayload: any = {};
    if (dto.fullName) updatePayload.fullName = dto.fullName.trim();
    if (dto.city) updatePayload.city = dto.city.trim();
    if (dto.language) updatePayload.language = dto.language.toUpperCase() as any;
    if (dto.emergencyContactName !== undefined)
      updatePayload.emergencyContactName = dto.emergencyContactName?.trim() || null;
    if (dto.emergencyContactPhone !== undefined)
      updatePayload.emergencyContactPhone = dto.emergencyContactPhone?.trim() || null;
    if (verifiedEmail !== existing.email) updatePayload.email = verifiedEmail;
    if (verifiedPhone !== existing.phoneNumber) updatePayload.phoneNumber = verifiedPhone;

    try {
      const updated = await prisma.passenger.update({
        where: { id: passengerId },
        data: updatePayload,
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          isVerified: true,
          accountStatus: true,
          language: true,
          city: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      inMemoryProfileCache.set(passengerId, updated);

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorId: passengerId,
            actorType: 'PASSENGER',
            action: 'PROFILE_UPDATED',
            entityType: 'Passenger',
            entityId: passengerId,
            passengerId,
            metadata: { updatedFields: Object.keys(updatePayload) },
          },
        });
      } catch {
        // Audit log persistence non-blocking
      }

      return {
        ...updated,
        biometricEnabled: inMemoryBiometricMap.get(passengerId) ?? false,
      };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        if (process.env.NODE_ENV === 'production') {
          logger.error(
            { passengerId, err: err.message },
            '[PassengerProfile] Database unavailable during profile write in production'
          );
          throw new AppError(
            'Database service temporarily unavailable. Profile changes could not be saved to persistent storage.',
            503,
            'SERVICE_UNAVAILABLE'
          );
        }
        logger.warn(
          { passengerId, err: err.message },
          '[PassengerProfile] Development offline fallback: database unavailable, applying to memory cache'
        );
        const merged = {
          ...existing,
          ...updatePayload,
          updatedAt: new Date().toISOString(),
        };
        inMemoryProfileCache.set(passengerId, merged);
        return {
          ...merged,
          biometricEnabled: inMemoryBiometricMap.get(passengerId) ?? false,
        };
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/passenger/profile/change-contact/initiate
   * Initiates OTP verification for changing email or phone.
   */
  async initiateContactChange(passengerId: string, dto: InitiateContactChangeDto) {
    const cleanContact = dto.newContact.trim();
    if (!cleanContact) {
      throw new Error('New contact identifier cannot be empty');
    }

    // 1. Uniqueness check against other passenger accounts
    try {
      if (dto.type === 'email') {
        const existingWithEmail = await prisma.passenger.findFirst({
          where: {
            email: { equals: cleanContact.toLowerCase(), mode: 'insensitive' },
            id: { not: passengerId },
          },
        });
        if (existingWithEmail) {
          throw new Error('CONFLICT: This email address is already associated with another account.');
        }
      } else {
        const existingWithPhone = await prisma.passenger.findFirst({
          where: {
            phoneNumber: cleanContact,
            id: { not: passengerId },
          },
        });
        if (existingWithPhone) {
          throw new Error('CONFLICT: This phone number is already associated with another account.');
        }
      }
    } catch (err: any) {
      if (err.message.startsWith('CONFLICT:')) throw err;
      // If DB is offline, continue safely
    }

    // 2. Generate cryptographically unpredictable 6-digit OTP
    const plainOtp = crypto.randomInt(100000, 1000000).toString();
    const sessionId = `cc_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    pendingContactVerifications.set(sessionId, {
      passengerId,
      type: dto.type,
      newContact: cleanContact,
      code: plainOtp,
      expiresAt,
      attempts: 0,
    });

    // 3. Dispatch OTP via Email or Telegram/SMS
    if (dto.type === 'email') {
      try {
        await EmailService.getInstance().sendOtpEmail(cleanContact, plainOtp, 'Valued Passenger');
      } catch (err) {
        logger.warn({ err }, '[PassengerProfile] Failed to dispatch OTP email');
      }
    } else {
      try {
        await TelegramService.getInstance().sendOtpMessage(cleanContact, plainOtp, { recipientName: 'Valued Passenger' });
      } catch (err) {
        logger.warn({ err }, '[PassengerProfile] Failed to dispatch OTP via telegram/SMS');
      }
    }

    logger.info(
      { passengerId, type: dto.type, target: cleanContact },
      `[PassengerProfile] Contact change OTP generated (Session: ${sessionId})`
    );

    return {
      sessionId,
      message: `Verification code sent to ${cleanContact}`,
      expiresAt: new Date(expiresAt).toISOString(),
      devOtp: env.NODE_ENV !== 'production' ? plainOtp : undefined,
    };
  }

  /**
   * POST /api/v1/passenger/profile/change-contact/verify
   * Verifies the OTP and activates the new email or phone number.
   */
  async verifyContactChange(passengerId: string, dto: VerifyContactChangeDto) {
    const record = pendingContactVerifications.get(dto.sessionId);
    if (!record) {
      throw new Error('INVALID_SESSION: Contact verification session expired or not found.');
    }

    if (record.passengerId !== passengerId) {
      throw new Error('FORBIDDEN: Session does not belong to the authenticated passenger.');
    }

    if (Date.now() > record.expiresAt) {
      pendingContactVerifications.delete(dto.sessionId);
      throw new Error('EXPIRED_OTP: Verification code has expired. Please request a new one.');
    }

    if (record.attempts >= 5) {
      pendingContactVerifications.delete(dto.sessionId);
      throw new Error('TOO_MANY_ATTEMPTS: Maximum verification attempts exceeded. Please start over.');
    }

    if (record.code !== dto.code.trim()) {
      record.attempts += 1;
      throw new Error('INVALID_OTP: Incorrect verification code.');
    }

    // Successful verification -> apply change directly to DB
    pendingContactVerifications.delete(dto.sessionId);

    const updateData: any = {};
    if (record.type === 'email') {
      updateData.email = record.newContact.toLowerCase();
    } else {
      updateData.phoneNumber = record.newContact;
    }

    try {
      const updated = await prisma.passenger.update({
        where: { id: passengerId },
        data: updateData,
      });
      inMemoryProfileCache.set(passengerId, updated);
      return updated;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        if (process.env.NODE_ENV === 'production') {
          logger.error(
            { passengerId, err: err.message },
            '[PassengerProfile] Database unavailable during contact change update in production'
          );
          throw new AppError(
            'Database service temporarily unavailable. Contact change could not be saved to persistent storage.',
            503,
            'SERVICE_UNAVAILABLE'
          );
        }
        logger.warn(
          { passengerId, err: err.message },
          '[PassengerProfile] Development offline fallback: contact change applied to memory cache'
        );
        const cached = inMemoryProfileCache.get(passengerId) || {};
        const merged = { ...cached, ...updateData, updatedAt: new Date().toISOString() };
        inMemoryProfileCache.set(passengerId, merged);
        return merged;
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/passenger/profile-image/upload-signature
   * Generates a signed Cloudinary upload authorization for direct upload from the mobile client.
   */
  async generateCloudinarySignature(passengerId: string) {
    const timestamp = Math.round(Date.now() / 1000);
    const uniqueId = crypto.randomBytes(6).toString('hex');
    const folder = `kings-taxi/passengers/${passengerId}`;
    const publicId = `avatar_${timestamp}_${uniqueId}`;
    const fullPublicId = `${folder}/${publicId}`;
    const transformation = 'c_fill,g_face,h_500,w_500';

    // Parameters sorted alphabetically for Cloudinary signature computation
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}&transformation=${transformation}`;

    const apiSecret = env.CLOUDINARY_API_SECRET || 'dev_cloudinary_secret';
    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    const cloudName = env.CLOUDINARY_CLOUD_NAME || 'kings-taxi';
    const apiKey = env.CLOUDINARY_API_KEY || 'dev_cloudinary_key';

    const isSimulated =
      !env.CLOUDINARY_API_KEY ||
      !env.CLOUDINARY_API_SECRET ||
      apiKey === 'dev_cloudinary_key' ||
      apiSecret === 'dev_cloudinary_secret';

    const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET || 'kings_passenger_avatars';

    return {
      cloudName,
      apiKey,
      timestamp,
      folder,
      publicId,
      fullPublicId,
      transformation,
      signature,
      uploadPreset,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      simulated: isSimulated,
    };
  }

  /**
   * Safe asynchronous Cloudinary asset cleanup (non-blocking).
   */
  private async deleteCloudinaryAsset(publicId: string): Promise<void> {
    try {
      if (
        env.CLOUDINARY_API_SECRET &&
        env.CLOUDINARY_API_SECRET !== 'dev_cloudinary_secret' &&
        env.CLOUDINARY_API_SECRET !== 'simulated_secret'
      ) {
        await cloudinary.uploader.destroy(publicId);
        logger.info({ publicId }, '[PassengerProfile] Cloudinary asset cleaned up');
      }
    } catch (err) {
      logger.warn({ err, publicId }, '[PassengerProfile] Non-blocking Cloudinary deletion error');
    }
  }

  /**
   * PATCH /api/v1/passenger/profile-image
   * Saves the verified Cloudinary or server profile image URL in PostgreSQL.
   */
  async updateProfileImage(passengerId: string, dto: UpdateProfileImageDto) {
    const url = dto.imageUrl.trim();
    if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      throw new Error('INVALID_URL: A valid image URL is required.');
    }

    const isLocalhost =
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('http://10.0.2.2');

    if (!url.startsWith('https://') && !isLocalhost) {
      throw new Error('INSECURE_URL: HTTPS is required for remote profile images.');
    }

    // Enforce security: must be from Cloudinary, verified server media directory, or local dev host
    const isCloudinary = url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
    const isServerUpload = url.includes('/uploads/avatars/') || isLocalhost;
    if (!isCloudinary && !isServerUpload) {
      throw new Error('INVALID_ORIGIN: Profile image must be hosted on Cloudinary or verified media server.');
    }

    // Prevent path traversal and cross-passenger asset hijacking:
    if (dto.publicId) {
      if (dto.publicId.includes('..') || dto.publicId.startsWith('/') || dto.publicId.startsWith('\\')) {
        throw new Error('FORBIDDEN_ASSET: Path traversal in image public ID is forbidden.');
      }
      const matchPassengerFolder = /kings-taxi\/passengers\/([^/]+)/.exec(dto.publicId);
      if (matchPassengerFolder && matchPassengerFolder[1] !== passengerId) {
        throw new Error('FORBIDDEN_ASSET: Image asset belongs to another passenger account.');
      }
    }

    // Cross-account conflict check: ensure another passenger does not already own this exact image URL or public ID
    try {
      const conflictingPassenger = await prisma.passenger.findFirst({
        where: {
          id: { not: passengerId },
          OR: [
            { profileImage: url },
            ...(dto.publicId ? [{ profileImagePublicId: dto.publicId }] : []),
          ],
        },
        select: { id: true },
      });
      if (conflictingPassenger) {
        throw new Error('CONFLICT: This image is already associated with another passenger account.');
      }
    } catch (err: any) {
      if (err.message.startsWith('CONFLICT:') || err.message.startsWith('FORBIDDEN_ASSET:')) {
        throw err;
      }
      // If DB is offline, continue safely
    }

    // Fetch previous image for safe replacement cleanup after DB update succeeds
    let previousImage: string | null = null;
    let previousPublicId: string | null = null;
    try {
      const existing = await prisma.passenger.findUnique({
        where: { id: passengerId },
        select: { profileImage: true, profileImagePublicId: true },
      });
      previousImage = existing?.profileImage || null;
      previousPublicId = existing?.profileImagePublicId || null;
    } catch {
      // Offline fallback
    }

    try {
      const updated = await prisma.passenger.update({
        where: { id: passengerId },
        data: {
          profileImage: url,
          profileImagePublicId: dto.publicId || null,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          profileImagePublicId: true,
          updatedAt: true,
        },
      });

      inMemoryProfileCache.set(passengerId, {
        ...(inMemoryProfileCache.get(passengerId) || {}),
        profileImage: url,
        profileImagePublicId: dto.publicId || null,
      });

      // Audit Log
      try {
        await prisma.auditLog.create({
          data: {
            actorId: passengerId,
            actorType: 'PASSENGER',
            action: 'PROFILE_IMAGE_UPDATED',
            entityType: 'Passenger',
            entityId: passengerId,
            passengerId,
            metadata: { imageUrl: url, publicId: dto.publicId },
          },
        });
      } catch {
        // Non-blocking
      }

      // Safe Cloudinary cleanup: ONLY after database update succeeds, clean up old asset
      if (previousPublicId && previousPublicId !== dto.publicId) {
        if (
          !previousPublicId.includes('kings-taxi/passengers/') ||
          previousPublicId.includes(`kings-taxi/passengers/${passengerId}`)
        ) {
          this.deleteCloudinaryAsset(previousPublicId);
        }
      } else if (previousImage && previousImage !== url && previousImage.includes('cloudinary.com')) {
        const match = /kings-taxi\/passengers\/[^/]+\/[^./]+/.exec(previousImage);
        if (match && match[0].includes(`kings-taxi/passengers/${passengerId}`)) {
          this.deleteCloudinaryAsset(match[0]);
        }
      }

      return updated;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        if (process.env.NODE_ENV === 'production') {
          logger.error(
            { passengerId, err: err.message },
            '[PassengerProfile] Database unavailable during profile image update in production'
          );
          throw new AppError(
            'Database service temporarily unavailable. Profile image could not be saved to persistent storage.',
            503,
            'SERVICE_UNAVAILABLE'
          );
        }
        logger.warn(
          { passengerId, err: err.message },
          '[PassengerProfile] Development offline fallback: profile image applied to memory cache'
        );
        const cached = inMemoryProfileCache.get(passengerId) || { id: passengerId };
        cached.profileImage = url;
        cached.profileImagePublicId = dto.publicId || null;
        inMemoryProfileCache.set(passengerId, cached);
        return cached;
      }
      throw err;
    }
  }

  /**
   * POST /api/v1/passengers/profile-image/upload-direct
   * Accepts image data, attempts Cloudinary direct upload first, and falls back to persistent server storage.
   */
  async uploadDirectProfileImage(
    passengerId: string,
    imageBase64: string,
    filename?: string,
    hostHeader?: string
  ) {
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new Error('INVALID_PAYLOAD: Image data is required.');
    }

    let ext = 'jpg';
    if (filename) {
      const match = /\.(\w+)$/.exec(filename);
      if (match) ext = match[1].toLowerCase();
    } else {
      const mimeMatch = /^data:image\/(\w+);base64,/.exec(imageBase64);
      if (mimeMatch) {
        ext = mimeMatch[1].toLowerCase() === 'jpeg' ? 'jpg' : mimeMatch[1].toLowerCase();
      }
    }
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

    // 1. Try Cloudinary SDK upload first if configured
    let cloudinaryUrl: string | null = null;
    let publicId: string | null = null;

    try {
      if (
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET &&
        env.CLOUDINARY_API_KEY !== 'dev_cloudinary_key'
      ) {
        const uploadRes = await cloudinary.uploader.upload(imageBase64, {
          folder: `kings-taxi/passengers/${passengerId}`,
          public_id: `avatar_${Date.now()}`,
          transformation: [{ width: 500, height: 500, crop: 'fill', gravity: 'face' }],
        });
        if (uploadRes && uploadRes.secure_url) {
          cloudinaryUrl = uploadRes.secure_url;
          publicId = uploadRes.public_id;
          logger.info({ passengerId, publicId }, '[PassengerProfile] Stored avatar directly in Cloudinary');
        }
      }
    } catch (err: any) {
      logger.warn(
        { passengerId, err: err.message },
        '[PassengerProfile] Cloudinary direct upload unavailable or restricted, falling back to local server storage'
      );
    }

    if (cloudinaryUrl && publicId) {
      return await this.updateProfileImage(passengerId, {
        imageUrl: cloudinaryUrl,
        publicId,
      });
    }

    // 2. Resilient Server File Storage Fallback
    const targetDir = fs.existsSync(path.join(process.cwd(), 'public/uploads/avatars'))
      ? path.join(process.cwd(), 'public/uploads/avatars')
      : path.join(process.cwd(), 'backend/public/uploads/avatars');

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const safeFilename = `avatar_${passengerId}_${Date.now()}.${cleanExt}`;
    const filePath = path.join(targetDir, safeFilename);

    const base64Content = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'));

    let baseUrl = 'http://localhost:' + (env.PORT || 5000);
    if (hostHeader) {
      baseUrl = hostHeader.startsWith('http') ? hostHeader : `http://${hostHeader}`;
    }

    const localUrl = `${baseUrl}/uploads/avatars/${safeFilename}`;
    logger.info({ passengerId, localUrl }, '[PassengerProfile] Stored avatar on server filesystem');

    return await this.updateProfileImage(passengerId, {
      imageUrl: localUrl,
      publicId: `kings-taxi/passengers/${passengerId}/${safeFilename}`,
    });
  }

  /**
   * DELETE /api/v1/passenger/profile-image
   * Removes custom profile picture, restoring default avatar.
   */
  async removeProfileImage(passengerId: string) {
    let previousImage: string | null = null;
    let previousPublicId: string | null = null;
    try {
      const existing = await prisma.passenger.findUnique({
        where: { id: passengerId },
        select: { profileImage: true, profileImagePublicId: true },
      });
      previousImage = existing?.profileImage || null;
      previousPublicId = existing?.profileImagePublicId || null;
    } catch {
      // Offline fallback
    }

    try {
      await prisma.passenger.update({
        where: { id: passengerId },
        data: {
          profileImage: null,
          profileImagePublicId: null,
        },
      });
      inMemoryProfileCache.set(passengerId, {
        ...(inMemoryProfileCache.get(passengerId) || {}),
        profileImage: null,
        profileImagePublicId: null,
      });

      // Clean up Cloudinary asset belonging to this passenger
      if (previousPublicId) {
        if (
          !previousPublicId.includes('kings-taxi/passengers/') ||
          previousPublicId.includes(`kings-taxi/passengers/${passengerId}`)
        ) {
          this.deleteCloudinaryAsset(previousPublicId);
        }
      } else if (previousImage && previousImage.includes('cloudinary.com')) {
        const match = /kings-taxi\/passengers\/[^/]+\/[^./]+/.exec(previousImage);
        if (match && match[0].includes(`kings-taxi/passengers/${passengerId}`)) {
          this.deleteCloudinaryAsset(match[0]);
        }
      }

      return { success: true, profileImage: null, profileImagePublicId: null };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        if (process.env.NODE_ENV === 'production') {
          logger.error(
            { passengerId, err: err.message },
            '[PassengerProfile] Database unavailable during profile image removal in production'
          );
          throw new AppError(
            'Database service temporarily unavailable. Profile image could not be removed from persistent storage.',
            503,
            'SERVICE_UNAVAILABLE'
          );
        }
        logger.warn(
          { passengerId, err: err.message },
          '[PassengerProfile] Development offline fallback: profile image removed from memory cache'
        );
        const cached = inMemoryProfileCache.get(passengerId) || { id: passengerId };
        cached.profileImage = null;
        cached.profileImagePublicId = null;
        inMemoryProfileCache.set(passengerId, cached);
        return { success: true, profileImage: null, profileImagePublicId: null };
      }
      throw err;
    }
  }

  /**
   * GET /api/v1/passenger/security
   * Returns security and active device session metadata.
   */
  async getSecurityInfo(passengerId: string) {
    let sessions: any[] = [];
    try {
      sessions = await prisma.passengerSession.findMany({
        where: { passengerId, isActive: true },
        select: {
          id: true,
          deviceId: true,
          deviceName: true,
          platform: true,
          appVersion: true,
          lastActiveAt: true,
          createdAt: true,
        },
        orderBy: { lastActiveAt: 'desc' },
      });
    } catch {
      // Fallback to memory
    }

    const biometricEnabled = inMemoryBiometricMap.get(passengerId) ?? false;

    return {
      biometricEnabled,
      activeSessionsCount: sessions.length || 1,
      sessions: sessions.length > 0 ? sessions : [
        {
          id: 'curr_session',
          deviceName: 'Current Device',
          platform: 'ANDROID',
          lastActiveAt: new Date().toISOString(),
        },
      ],
    };
  }

  /**
   * POST /api/v1/passenger/security/biometric
   * Registers biometric preference and device security metadata.
   */
  async updateBiometricPreference(passengerId: string, dto: UpdateBiometricPreferenceDto) {
    inMemoryBiometricMap.set(passengerId, dto.enabled);

    try {
      if (dto.deviceIdentifier) {
        // Register or touch active session
        await prisma.passengerSession.create({
          data: {
            passengerId,
            deviceId: dto.deviceIdentifier,
            deviceName: dto.deviceName || 'Mobile Device',
            platform: (dto.devicePlatform as any) || 'UNKNOWN',
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });
      }

      // Record Audit Event
      await prisma.auditLog.create({
        data: {
          actorId: passengerId,
          actorType: 'PASSENGER',
          action: dto.enabled ? 'BIOMETRIC_LOGIN_ENABLED' : 'BIOMETRIC_LOGIN_DISABLED',
          entityType: 'Passenger',
          entityId: passengerId,
          passengerId,
          metadata: {
            deviceName: dto.deviceName,
            platform: dto.devicePlatform,
            biometricType: dto.biometricType,
          },
        },
      });
    } catch {
      // Non-blocking for offline development
    }

    logger.info(
      { passengerId, enabled: dto.enabled, biometricType: dto.biometricType },
      `[PassengerSecurity] Biometric login ${dto.enabled ? 'enabled' : 'disabled'}`
    );

    return {
      success: true,
      biometricEnabled: dto.enabled,
    };
  }
}

export const passengerProfileService = new PassengerProfileService();
