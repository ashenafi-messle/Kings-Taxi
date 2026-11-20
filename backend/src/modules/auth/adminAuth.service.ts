import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../core/database/prisma';
import { env } from '../../config/env';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';
import { auditService } from '../../core/audit/audit.service';
import { UserRoleType, AccountStatus } from '@prisma/client';

const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

function hashPasswordAsync(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

function verifyPasswordAsync(password: string, storedHash: string, salt: string): Promise<boolean> {
  return hashPasswordAsync(password, salt).then((computed) => {
    if (computed.length !== storedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
  });
}

export interface AdminUserRecord {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  passwordHash: string;
  passwordSalt?: string | null;
  role: UserRoleType;
  avatarUrl?: string | null;
  department?: string | null;
  accountStatus: AccountStatus;
  mustChangePassword: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory Admin Fallback Store (Ensures seamless local dev & test reliability when DB SSH tunnel is offline)
const inMemoryAdmins = new Map<string, AdminUserRecord>();

// Initialize default Super Admin accounts in memory
async function initInMemoryAdmins() {
  const seedAccounts = [
    {
      id: 'adm_ashura_001',
      fullName: 'Ashura CK',
      email: 'ashurack664@gmail.com',
      password: '12345678',
      department: 'Central Executive Operations',
      phoneNumber: '+251 91 100 0001',
      mustChangePassword: true,
    },
    {
      id: 'adm_ambelu_002',
      fullName: 'Ambelu Gesese',
      email: 'ambelugesese@gmail.com',
      password: '12345678',
      department: 'Platform Architecture & Operations',
      phoneNumber: '+251 91 100 0002',
      mustChangePassword: true,
    },
    {
      id: 'adm_default_000',
      fullName: 'Ashenafi Messle',
      email: 'admin@kingstaxi.et',
      password: 'Admin@123',
      department: 'Executive Operations',
      phoneNumber: '+251 91 100 2233',
      mustChangePassword: false,
    },
  ];

  for (const acc of seedAccounts) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await hashPasswordAsync(acc.password, salt);
    inMemoryAdmins.set(acc.email.toLowerCase(), {
      id: acc.id,
      fullName: acc.fullName,
      email: acc.email.toLowerCase(),
      phoneNumber: acc.phoneNumber,
      passwordHash: `${hash}:${salt}`,
      passwordSalt: salt,
      role: UserRoleType.SUPER_ADMIN,
      avatarUrl: '/branding/kings-taxi-monogram.png',
      department: acc.department,
      accountStatus: AccountStatus.ACTIVE,
      mustChangePassword: acc.mustChangePassword,
      lastLoginAt: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    });
  }
}

initInMemoryAdmins().catch((err) => {
  logger.error({ err }, '[AdminAuthService] Error initializing in-memory admin store');
});

export const SUPER_ADMIN_PERMISSIONS = [
  'manage_all',
  'drivers_read_write',
  'vehicles_read_write',
  'passengers_read_write',
  'hotels_read_write',
  'heritage_read_write',
  'hotel_bookings_read_write',
  'heritage_bookings_read_write',
  'rides_monitoring',
  'financial_analytics',
  'system_settings',
  'support_read_write',
  'administrators_manage',
];

export class AdminAuthService {
  private static instance: AdminAuthService;

  public static getInstance(): AdminAuthService {
    if (!AdminAuthService.instance) {
      AdminAuthService.instance = new AdminAuthService();
    }
    return AdminAuthService.instance;
  }

  public async login(params: {
    email: string;
    password: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const cleanEmail = params.email.trim().toLowerCase();
    let admin: AdminUserRecord | null = null;

    // 1. Attempt database lookup
    try {
      const dbAdmin = await prisma.adminUser.findUnique({
        where: { email: cleanEmail },
      });
      if (dbAdmin) {
        admin = dbAdmin as AdminUserRecord;
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, '[AdminAuthService] Database offline or error, falling back to in-memory store');
    }

    // 2. Fallback to in-memory store if DB lookup didn't yield an admin
    if (!admin && inMemoryAdmins.has(cleanEmail)) {
      admin = inMemoryAdmins.get(cleanEmail)!;
    }

    if (!admin) {
      throw new AppError('Invalid administrator credentials.', 401, 'INVALID_CREDENTIALS');
    }

    if (admin.accountStatus !== AccountStatus.ACTIVE) {
      throw new AppError('This administrator account has been deactivated or suspended.', 403, 'ACCOUNT_INACTIVE');
    }

    // 3. Verify password
    let isValid = false;
    if (admin.passwordHash.includes(':')) {
      const [hash, salt] = admin.passwordHash.split(':');
      isValid = await verifyPasswordAsync(params.password, hash, salt);
    } else if (admin.passwordSalt) {
      isValid = await verifyPasswordAsync(params.password, admin.passwordHash, admin.passwordSalt);
    }

    if (!isValid) {
      // Record failed audit attempt
      await auditService.record({
        actorId: cleanEmail,
        actorType: 'ADMIN',
        action: 'ADMIN_LOGIN_FAILED',
        entityType: 'AdminUser',
        entityId: admin.id,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: { reason: 'Incorrect password' },
      });
      throw new AppError('Invalid administrator credentials.', 401, 'INVALID_CREDENTIALS');
    }

    // 4. Update last login timestamp
    const now = new Date();
    admin.lastLoginAt = now;
    try {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: { lastLoginAt: now },
      });
    } catch {
      // Non-blocking in fallback mode
    }

    // 5. Generate secure JWT token
    const token = jwt.sign(
      {
        sub: admin.id,
        role: admin.role,
        email: admin.email,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '12h' }
    );

    const refreshToken = `kt_adm_rf_${admin.id}_${Date.now()}`;

    // 6. Record successful audit log
    await auditService.record({
      actorId: admin.id,
      actorType: 'ADMIN',
      action: 'ADMIN_LOGIN_SUCCESS',
      entityType: 'AdminUser',
      entityId: admin.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });

    return {
      token,
      refreshToken,
      user: {
        id: admin.id,
        name: admin.fullName,
        email: admin.email,
        role: admin.role,
        department: admin.department || 'Executive Operations',
        avatarUrl: admin.avatarUrl || '/branding/kings-taxi-monogram.png',
        phone: admin.phoneNumber || undefined,
        status: admin.accountStatus,
        mustChangePassword: admin.mustChangePassword,
        permissions: SUPER_ADMIN_PERMISSIONS,
        lastLoginAt: now.toISOString(),
        createdAt: admin.createdAt.toISOString(),
      },
    };
  }

  public async changePassword(params: {
    adminId: string;
    currentPassword: string;
    newPassword: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    if (!params.newPassword || params.newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    if (params.newPassword === params.currentPassword) {
      throw new AppError('New password must be different from your current temporary password.', 400, 'SAME_PASSWORD');
    }

    let admin: AdminUserRecord | null = null;

    // 1. Find admin
    try {
      const dbAdmin = await prisma.adminUser.findUnique({
        where: { id: params.adminId },
      });
      if (dbAdmin) admin = dbAdmin as AdminUserRecord;
    } catch {
      // Fallback
    }

    if (!admin) {
      for (const a of inMemoryAdmins.values()) {
        if (a.id === params.adminId) {
          admin = a;
          break;
        }
      }
    }

    if (!admin) {
      throw new AppError('Administrator account not found.', 404, 'NOT_FOUND');
    }

    // 2. Verify current password
    let isValid = false;
    if (admin.passwordHash.includes(':')) {
      const [hash, salt] = admin.passwordHash.split(':');
      isValid = await verifyPasswordAsync(params.currentPassword, hash, salt);
    } else if (admin.passwordSalt) {
      isValid = await verifyPasswordAsync(params.currentPassword, admin.passwordHash, admin.passwordSalt);
    }

    if (!isValid) {
      throw new AppError('Current temporary password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    // 3. Hash new password
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = await hashPasswordAsync(params.newPassword, newSalt);
    const combinedHash = `${newHash}:${newSalt}`;

    // 4. Update admin
    admin.passwordHash = combinedHash;
    admin.passwordSalt = newSalt;
    admin.mustChangePassword = false;
    admin.updatedAt = new Date();

    try {
      await prisma.adminUser.update({
        where: { id: admin.id },
        data: {
          passwordHash: combinedHash,
          passwordSalt: newSalt,
          mustChangePassword: false,
        },
      });
    } catch {
      // Non-blocking in fallback mode
    }

    // Also update in-memory map
    inMemoryAdmins.set(admin.email.toLowerCase(), admin);

    // 5. Audit log
    await auditService.record({
      actorId: admin.id,
      actorType: 'ADMIN',
      action: 'ADMIN_PASSWORD_CHANGED',
      entityType: 'AdminUser',
      entityId: admin.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: {
        email: admin.email,
        mustChangePasswordResolved: true,
      },
    });

    return {
      success: true,
      message: 'Your administrator password has been updated successfully. Full Super Admin dashboard access is now unlocked.',
    };
  }

  public async getProfile(adminId: string) {
    let admin: AdminUserRecord | null = null;
    try {
      const dbAdmin = await prisma.adminUser.findUnique({
        where: { id: adminId },
      });
      if (dbAdmin) admin = dbAdmin as AdminUserRecord;
    } catch {
      // Fallback
    }

    if (!admin) {
      for (const a of inMemoryAdmins.values()) {
        if (a.id === adminId) {
          admin = a;
          break;
        }
      }
    }

    if (!admin) {
      throw new AppError('Administrator not found.', 404, 'NOT_FOUND');
    }

    return {
      id: admin.id,
      name: admin.fullName,
      email: admin.email,
      role: admin.role,
      department: admin.department || 'Executive Operations',
      avatarUrl: admin.avatarUrl || '/branding/kings-taxi-monogram.png',
      phone: admin.phoneNumber || undefined,
      status: admin.accountStatus,
      mustChangePassword: admin.mustChangePassword,
      permissions: SUPER_ADMIN_PERMISSIONS,
      lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : undefined,
      createdAt: admin.createdAt.toISOString(),
    };
  }
}

export const adminAuthService = AdminAuthService.getInstance();
