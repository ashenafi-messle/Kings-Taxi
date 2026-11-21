import { describe, it, expect } from 'vitest';
import { adminAuthService, SUPER_ADMIN_PERMISSIONS } from '../../src/modules/auth/adminAuth.service';
import { hospitalityBookingService, fallbackHotelBookingsCache } from '../../src/modules/hospitality/booking.service';
import { heritageTourBookingService } from '../../src/modules/heritage/booking.service';
import { notificationService } from '../../src/modules/notifications/notification.service';

describe('Admin Authentication & Real Account Provisioning', () => {
  it('authenticates Account 1 (ashurack664@gmail.com) with real credentials and unlocks full access directly', async () => {
    const res = await adminAuthService.login({
      email: 'ashurack664@gmail.com',
      password: '12345678',
    });

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe('ashurack664@gmail.com');
    expect(res.user.role).toBe('SUPER_ADMIN');
    expect(res.user.mustChangePassword).toBe(false);
    expect(res.user.permissions).toEqual(SUPER_ADMIN_PERMISSIONS);
  });

  it('authenticates Account 2 (ambelugesese@gmail.com) with real credentials and unlocks full access directly', async () => {
    const res = await adminAuthService.login({
      email: 'ambelugesese@gmail.com',
      password: '12345678',
    });

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe('ambelugesese@gmail.com');
    expect(res.user.role).toBe('SUPER_ADMIN');
    expect(res.user.mustChangePassword).toBe(false);
  });

  it('rejects invalid password for provisioned administrator', async () => {
    await expect(
      adminAuthService.login({
        email: 'ashurack664@gmail.com',
        password: 'wrong_password',
      })
    ).rejects.toThrow('Invalid administrator credentials.');
  });

  it('successfully executes administrative password change in security settings', async () => {
    const loginRes = await adminAuthService.login({
      email: 'ambelugesese@gmail.com',
      password: '12345678',
    });

    // Enforce min 8 characters
    await expect(
      adminAuthService.changePassword({
        adminId: loginRes.user.id,
        currentPassword: '12345678',
        newPassword: 'short',
      })
    ).rejects.toThrow('New password must be at least 8 characters long.');

    // Enforce different from current password
    await expect(
      adminAuthService.changePassword({
        adminId: loginRes.user.id,
        currentPassword: '12345678',
        newPassword: '12345678',
      })
    ).rejects.toThrow('New password must be different from current password.');

    // Execute valid change
    const changeRes = await adminAuthService.changePassword({
      adminId: loginRes.user.id,
      currentPassword: '12345678',
      newPassword: 'SecureAdmin#2026',
    });

    expect(changeRes.success).toBe(true);

    // Verify subsequent login with new password
    const reLogin = await adminAuthService.login({
      email: 'ambelugesese@gmail.com',
      password: 'SecureAdmin#2026',
    });

    expect(reLogin.user.email).toBe('ambelugesese@gmail.com');
  }, 15000);

  it('handles email OTP password recovery lifecycle securely', async () => {
    // 1. Initiate password reset for real admin
    const initRes = await adminAuthService.initiatePasswordReset({
      email: 'ashurack664@gmail.com',
    });

    expect(initRes.success).toBe(true);
    expect(initRes.email).toContain('@gmail.com');
    expect(initRes.email).toContain('***');
    expect(initRes.expiresInSeconds).toBe(300);
    const testOtp = (initRes as any).devOtp;
    expect(testOtp).toBeDefined();
    expect(testOtp.length).toBe(6);

    // 2. Generic response for non-existent admin (prevents enumeration)
    const unknownRes = await adminAuthService.initiatePasswordReset({
      email: 'nonexistent_admin@kingstaxi.et',
    });
    expect(unknownRes.success).toBe(true);
    expect(unknownRes.message).toContain('If an administrator account is registered');

    // 3. Reject invalid OTP with remaining attempts counter
    await expect(
      adminAuthService.verifyPasswordResetOtp({
        email: 'ashurack664@gmail.com',
        otp: '000000',
      })
    ).rejects.toThrow('Invalid verification code. 4 attempt(s) remaining.');

    // 4. Verify valid OTP and receive single-use reset authorization token
    const verifyRes = await adminAuthService.verifyPasswordResetOtp({
      email: 'ashurack664@gmail.com',
      otp: testOtp,
    });
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.resetToken).toBeDefined();
    expect(verifyRes.resetToken.startsWith('adm_rst_')).toBe(true);

    // 5. Attempt reset with weak password
    await expect(
      adminAuthService.resetPasswordWithToken({
        email: 'ashurack664@gmail.com',
        resetToken: verifyRes.resetToken,
        newPassword: 'weak',
      })
    ).rejects.toThrow('Password must be at least 8 characters long.');

    // 6. Execute successful password reset
    const resetRes = await adminAuthService.resetPasswordWithToken({
      email: 'ashurack664@gmail.com',
      resetToken: verifyRes.resetToken,
      newPassword: 'NewSecurePassword#2026',
    });
    expect(resetRes.success).toBe(true);

    // 7. Verify login succeeds with the newly set password
    const newLogin = await adminAuthService.login({
      email: 'ashurack664@gmail.com',
      password: 'NewSecurePassword#2026',
    });
    expect(newLogin.token).toBeDefined();
    expect(newLogin.user.email).toBe('ashurack664@gmail.com');

    // 8. Replay of consumed reset token is rejected
    await expect(
      adminAuthService.resetPasswordWithToken({
        email: 'ashurack664@gmail.com',
        resetToken: verifyRes.resetToken,
        newPassword: 'AnotherPassword#9999',
      })
    ).rejects.toThrow('Invalid or unverified password reset session');
  }, 15000);

  it('validates comprehensive OTP verification scenarios (Task 9 requirements)', async () => {
    // 1. A newly requested OTP invalidates the old OTP
    const firstReq = await adminAuthService.initiatePasswordReset({
      email: 'ambelugesese@gmail.com',
    });
    const firstOtp = (firstReq as any).devOtp;
    expect(firstOtp).toBeDefined();

    // Fast-forward cooldown to simulate second request
    adminAuthService.clearResetCooldownForTesting('ambelugesese@gmail.com');
    const secondReq = await adminAuthService.initiatePasswordReset({
      email: 'ambelugesese@gmail.com',
    });
    const secondOtp = (secondReq as any).devOtp;
    expect(secondOtp).toBeDefined();

    // Old OTP should be rejected
    await expect(
      adminAuthService.verifyPasswordResetOtp({
        email: 'ambelugesese@gmail.com',
        otp: firstOtp,
      })
    ).rejects.toThrow();

    // 2. Email capitalization differences do not cause verification failure
    // 3. OTP with leading/trailing whitespace is handled safely
    const verifyWhitespaceAndCaps = await adminAuthService.verifyPasswordResetOtp({
      email: '  AMBELUGESESE@GMAIL.COM  ',
      otp: `  ${secondOtp}  `,
    });
    expect(verifyWhitespaceAndCaps.success).toBe(true);
    expect(verifyWhitespaceAndCaps.resetToken).toBeDefined();

    // 4. Previously used OTP cannot be reused
    await expect(
      adminAuthService.verifyPasswordResetOtp({
        email: 'ambelugesese@gmail.com',
        otp: secondOtp,
      })
    ).rejects.toThrow();

    // 5. OTP for another admin cannot be verified for a different admin
    adminAuthService.clearResetCooldownForTesting('ashurack664@gmail.com');
    const adminAReq = await adminAuthService.initiatePasswordReset({ email: 'ashurack664@gmail.com' });
    const adminAOtp = (adminAReq as any).devOtp;

    await expect(
      adminAuthService.verifyPasswordResetOtp({
        email: 'ambelugesese@gmail.com',
        otp: adminAOtp,
      })
    ).rejects.toThrow();

    // 6. Max attempts (5 attempts) triggers lockout
    let attemptsRemaining = 5;
    for (let i = 0; i < 4; i++) {
      await expect(
        adminAuthService.verifyPasswordResetOtp({
          email: 'ashurack664@gmail.com',
          otp: '999999',
        })
      ).rejects.toThrow('Invalid verification code');
    }

    // 5th incorrect attempt exceeds limit
    await expect(
      adminAuthService.verifyPasswordResetOtp({
        email: 'ashurack664@gmail.com',
        otp: '999999',
      })
    ).rejects.toThrow('Maximum verification attempts exceeded');
  }, 15000);
});

describe('Hotel & Heritage Booking Approval Workflow', () => {
  it('accepts hotel booking and notifies passenger', async () => {
    const testBookingId = 'test_hb_001';
    fallbackHotelBookingsCache.set(testBookingId, {
      id: testBookingId,
      bookingReference: 'HTL-TEST-9901',
      passengerId: 'pax_test_01',
      hotelName: 'Goha Hotel Gondar',
      roomTypeName: 'Royal King Suite',
      checkInDate: '2026-11-25',
      checkOutDate: '2026-11-28',
      bookingStatus: 'PENDING',
    });

    const accepted = await hospitalityBookingService.adminAcceptBooking(
      testBookingId,
      'adm_ashura_001',
      'Confirmed with hotel front desk'
    );

    expect(accepted.bookingStatus).toBe('CONFIRMED');
    expect(accepted.reviewedByAdminId).toBe('adm_ashura_001');

    const notifs = notificationService.getInMemoryNotifications('pax_test_01');
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs[0].title).toContain('Hotel Booking Confirmed');
  });

  it('declines hotel booking with mandatory decline reason and notifies passenger', async () => {
    const testBookingId = 'test_hb_002';
    fallbackHotelBookingsCache.set(testBookingId, {
      id: testBookingId,
      bookingReference: 'HTL-TEST-9902',
      passengerId: 'pax_test_02',
      hotelName: 'Gondar Hills Resort',
      bookingStatus: 'PENDING',
    });

    // Rejection without reason fails
    await expect(
      hospitalityBookingService.adminDeclineBooking(testBookingId, 'adm_ashura_001', '')
    ).rejects.toThrow('A specific decline reason is required');

    const declined = await hospitalityBookingService.adminDeclineBooking(
      testBookingId,
      'adm_ashura_001',
      'No room inventory available on the selected dates',
      'Checked with manager'
    );

    expect(declined.bookingStatus).toBe('DECLINED');
    expect(declined.declineReason).toBe('No room inventory available on the selected dates');

    const notifs = notificationService.getInMemoryNotifications('pax_test_02');
    expect(notifs.some((n) => n.title.includes('Declined'))).toBe(true);
  });

  describe('Admin JWT Token Expiration, Rotation & Automatic Refresh', () => {
    it('1. Admin login generates short-lived access token and cryptographically secure refresh token', async () => {
      const loginRes = await adminAuthService.login({
        email: 'admin@kingstaxi.et',
        password: 'Admin@123',
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest/AdminTest',
      });

      expect(loginRes.token).toBeDefined();
      expect(loginRes.refreshToken).toBeDefined();
      expect(loginRes.refreshToken.startsWith('kt_adm_rf_')).toBe(true);
      expect(loginRes.user.email).toBe('admin@kingstaxi.et');
      expect(loginRes.user.role).toBe('SUPER_ADMIN');
    });

    it('2. Refresh with valid refresh token returns renewed access token and new rotated refresh token', async () => {
      const loginRes = await adminAuthService.login({
        email: 'admin@kingstaxi.et',
        password: 'Admin@123',
      });

      const originalRefreshToken = loginRes.refreshToken;

      const refreshRes = await adminAuthService.refreshToken(originalRefreshToken);

      expect(refreshRes.token).toBeDefined();
      expect(refreshRes.refreshToken).toBeDefined();
      expect(refreshRes.refreshToken).not.toBe(originalRefreshToken);
      expect(refreshRes.user.id).toBe(loginRes.user.id);
      expect(refreshRes.user.role).toBe('SUPER_ADMIN');
    });

    it('3. Old refresh token is revoked after rotation and cannot be used again', async () => {
      const loginRes = await adminAuthService.login({
        email: 'admin@kingstaxi.et',
        password: 'Admin@123',
      });

      const originalToken = loginRes.refreshToken;
      const firstRefresh = await adminAuthService.refreshToken(originalToken);

      expect(firstRefresh.token).toBeDefined();

      // Using the old token again triggers reuse detection
      await expect(
        adminAuthService.refreshToken(originalToken)
      ).rejects.toThrow('Compromised session token replayed');
    });

    it('4. Reuse Detection: Replaying a revoked refresh token revokes the entire token family', async () => {
      const loginRes = await adminAuthService.login({
        email: 'admin@kingstaxi.et',
        password: 'Admin@123',
      });

      const token1 = loginRes.refreshToken;
      const refresh1 = await adminAuthService.refreshToken(token1);
      const token2 = refresh1.refreshToken;

      // Attacker replays token1 -> should trigger reuse alert and revoke token family
      await expect(
        adminAuthService.refreshToken(token1)
      ).rejects.toThrow('Compromised session token replayed');

      // Now token2 (even if unexpired) must also be revoked as part of the compromised family
      await expect(
        adminAuthService.refreshToken(token2)
      ).rejects.toThrow('Compromised session token replayed');
    });

    it('5. Invalid or corrupted refresh token is rejected with HTTP 401', async () => {
      await expect(
        adminAuthService.refreshToken('kt_adm_rf_completely_bogus_token_12345')
      ).rejects.toThrow('Refresh token is invalid or expired');
    });

    it('6. Admin logout revokes the refresh token session', async () => {
      const loginRes = await adminAuthService.login({
        email: 'admin@kingstaxi.et',
        password: 'Admin@123',
      });

      const logoutResult = await adminAuthService.logout(loginRes.refreshToken, loginRes.user.id);
      expect(logoutResult.loggedOut).toBe(true);

      // Attempting to refresh after logout must be rejected
      await expect(
        adminAuthService.refreshToken(loginRes.refreshToken)
      ).rejects.toThrow();
    });
  });
});
