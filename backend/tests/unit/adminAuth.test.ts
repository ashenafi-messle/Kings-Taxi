import { describe, it, expect } from 'vitest';
import { adminAuthService, SUPER_ADMIN_PERMISSIONS } from '../../src/modules/auth/adminAuth.service';
import { hospitalityBookingService, fallbackHotelBookingsCache } from '../../src/modules/hospitality/booking.service';
import { heritageTourBookingService } from '../../src/modules/heritage/booking.service';
import { notificationService } from '../../src/modules/notifications/notification.service';

describe('Admin Authentication & Real Account Provisioning', () => {
  it('authenticates Account 1 (ashurack664@gmail.com) with initial temporary password and flags mustChangePassword', async () => {
    const res = await adminAuthService.login({
      email: 'ashurack664@gmail.com',
      password: '12345678',
    });

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe('ashurack664@gmail.com');
    expect(res.user.role).toBe('SUPER_ADMIN');
    expect(res.user.mustChangePassword).toBe(true);
    expect(res.user.permissions).toEqual(SUPER_ADMIN_PERMISSIONS);
  });

  it('authenticates Account 2 (ambelugesese@gmail.com) with initial temporary password and flags mustChangePassword', async () => {
    const res = await adminAuthService.login({
      email: 'ambelugesese@gmail.com',
      password: '12345678',
    });

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe('ambelugesese@gmail.com');
    expect(res.user.role).toBe('SUPER_ADMIN');
    expect(res.user.mustChangePassword).toBe(true);
  });

  it('rejects invalid password for provisioned administrator', async () => {
    await expect(
      adminAuthService.login({
        email: 'ashurack664@gmail.com',
        password: 'wrong_password',
      })
    ).rejects.toThrow('Invalid administrator credentials.');
  });

  it('successfully enforces mandatory password change on first login and unlocks full access', async () => {
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

    // Enforce different from temporary password
    await expect(
      adminAuthService.changePassword({
        adminId: loginRes.user.id,
        currentPassword: '12345678',
        newPassword: '12345678',
      })
    ).rejects.toThrow('New password must be different from your current temporary password.');

    // Execute valid change
    const changeRes = await adminAuthService.changePassword({
      adminId: loginRes.user.id,
      currentPassword: '12345678',
      newPassword: 'SecureAdmin#2026',
    });

    expect(changeRes.success).toBe(true);

    // Verify subsequent login with new password has mustChangePassword === false
    const reLogin = await adminAuthService.login({
      email: 'ambelugesese@gmail.com',
      password: 'SecureAdmin#2026',
    });

    expect(reLogin.user.mustChangePassword).toBe(false);
  });
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
});
