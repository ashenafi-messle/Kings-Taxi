import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../theme/tokens';

interface StatusPillProps {
  status: string;
  label?: string;
}

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string; defaultLabel: string }> = {
  ONLINE: { bg: Colors.successBg, text: Colors.success, dot: Colors.success, defaultLabel: 'Online' },
  VERIFIED: { bg: Colors.successBg, text: Colors.success, dot: Colors.success, defaultLabel: 'Verified' },
  COMPLETED: { bg: Colors.successBg, text: Colors.success, dot: Colors.success, defaultLabel: 'Completed' },
  IN_PROGRESS: { bg: '#111111', text: '#FFFFFF', dot: '#E5E7EB', defaultLabel: 'In Progress' },
  CONFIRMED: { bg: Colors.surfaceSubtle, text: Colors.primaryBlack, dot: Colors.primaryBlack, defaultLabel: 'Confirmed' },
  PENDING: { bg: Colors.warningBg, text: Colors.warning, dot: Colors.warning, defaultLabel: 'Pending' },
  AWAITING_PAYMENT: { bg: Colors.warningBg, text: Colors.warning, dot: Colors.warning, defaultLabel: 'Awaiting Payment' },
  PAYMENT_PENDING_VERIFICATION: {
    bg: Colors.warningBg,
    text: Colors.warning,
    dot: Colors.warning,
    defaultLabel: 'Verification Pending (Demo)',
  },
  CANCELLED: { bg: Colors.errorBg, text: Colors.error, dot: Colors.error, defaultLabel: 'Cancelled' },
  SUSPENDED: { bg: Colors.errorBg, text: Colors.error, dot: Colors.error, defaultLabel: 'Suspended' },
  OFFLINE: { bg: Colors.lightSilver, text: Colors.secondaryText, dot: Colors.secondaryText, defaultLabel: 'Offline' },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, label }) => {
  const cfg = STATUS_MAP[status] || {
    bg: Colors.lightSilver,
    text: Colors.secondaryText,
    dot: Colors.secondaryText,
    defaultLabel: status.replace(/_/g, ' '),
  };

  return (
    <View style={[styles.pill, { backgroundColor: cfg.bg }]}>
      <View style={[styles.dot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.text, { color: cfg.text }]} numberOfLines={1}>
        {label || cfg.defaultLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
