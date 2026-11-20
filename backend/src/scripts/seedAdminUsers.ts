/**
 * Kings Taxi — Idempotent Super Admin Account Provisioning Script
 *
 * Responsibilities:
 * - Provision initial real Super Admin accounts into PostgreSQL `admin_users`.
 * - Normalize emails (lowercase, trimmed).
 * - Enforce email uniqueness.
 * - Hash temporary passwords using cryptographic scrypt + random salt.
 * - Flag `mustChangePassword: true` for mandatory first-login password change.
 * - NEVER log or print plaintext passwords or hashes.
 * - Report whether each account was newly created or already existed.
 * - Never overwrite an existing password or downgrade an administrator role.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient, UserRoleType, AccountStatus } from '@prisma/client';

const prisma = new PrismaClient();

const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};

export function hashAdminPassword(password: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString('hex'));
    });
  });
}

export interface ProvisionAccountSpec {
  fullName: string;
  email: string;
  initialPassword: string;
  role: UserRoleType;
  department: string;
  phoneNumber?: string;
}

export const REQUESTED_ADMIN_ACCOUNTS: ProvisionAccountSpec[] = [
  {
    fullName: 'Ashura CK (Super Admin)',
    email: 'ashurack664@gmail.com',
    initialPassword: '12345678',
    role: UserRoleType.SUPER_ADMIN,
    department: 'Central Executive Operations',
    phoneNumber: '+251 91 100 0001',
  },
  {
    fullName: 'Ambelu Gesese (Super Admin)',
    email: 'ambelugesese@gmail.com',
    initialPassword: '12345678',
    role: UserRoleType.SUPER_ADMIN,
    department: 'Platform Architecture & Operations',
    phoneNumber: '+251 91 100 0002',
  },
];

export interface ProvisionResult {
  email: string;
  status: 'CREATED' | 'ALREADY_EXISTS' | 'FAILED';
  role: string;
  mustChangePassword: boolean;
  message: string;
}

export async function provisionAdminAccounts(): Promise<ProvisionResult[]> {
  const results: ProvisionResult[] = [];

  for (const account of REQUESTED_ADMIN_ACCOUNTS) {
    const normalizedEmail = account.email.trim().toLowerCase();

    try {
      const existing = await prisma.adminUser.findUnique({
        where: { email: normalizedEmail },
      });

      if (existing) {
        results.push({
          email: normalizedEmail,
          status: 'ALREADY_EXISTS',
          role: existing.role,
          mustChangePassword: existing.mustChangePassword,
          message: `Admin account already exists with role [${existing.role}], status [${existing.accountStatus}]. Existing password preserved without modification.`,
        });
        continue;
      }

      // Generate secure salt and hash initial password
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = await hashAdminPassword(account.initialPassword, salt);
      const combinedPasswordHash = `${hash}:${salt}`;

      const created = await prisma.adminUser.create({
        data: {
          fullName: account.fullName,
          email: normalizedEmail,
          phoneNumber: account.phoneNumber,
          passwordHash: combinedPasswordHash,
          passwordSalt: salt,
          role: account.role,
          department: account.department,
          accountStatus: AccountStatus.ACTIVE,
          mustChangePassword: true,
          avatarUrl: '/branding/kings-taxi-monogram.png',
        },
      });

      // Record in AuditLog
      try {
        await prisma.auditLog.create({
          data: {
            actorId: 'SYSTEM_BOOTSTRAP',
            actorType: 'SYSTEM',
            action: 'ADMIN_ACCOUNT_PROVISIONED',
            entityType: 'AdminUser',
            entityId: created.id,
            metadata: {
              email: normalizedEmail,
              role: created.role,
              mustChangePassword: true,
            },
          },
        });
      } catch {
        // Non-blocking audit log creation
      }

      results.push({
        email: normalizedEmail,
        status: 'CREATED',
        role: created.role,
        mustChangePassword: true,
        message: `Admin account provisioned successfully with role [${created.role}]. Mandatory first-login password change enforced.`,
      });
    } catch (err: any) {
      results.push({
        email: normalizedEmail,
        status: 'FAILED',
        role: account.role,
        mustChangePassword: true,
        message: `Provisioning error: ${err.message}`,
      });
    }
  }

  return results;
}

// Standalone execution entrypoint
if (require.main === module) {
  provisionAdminAccounts()
    .then((results) => {
      console.log('====================================================');
      console.log('KINGS TAXI — SUPER ADMIN PROVISIONING REPORT');
      console.log('====================================================');
      results.forEach((r) => {
        console.log(`- Email: ${r.email}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Role: ${r.role}`);
        console.log(`  Must Change Password: ${r.mustChangePassword}`);
        console.log(`  Details: ${r.message}`);
      });
      console.log('====================================================');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal provisioning error:', err.message);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect().catch(() => {});
    });
}
