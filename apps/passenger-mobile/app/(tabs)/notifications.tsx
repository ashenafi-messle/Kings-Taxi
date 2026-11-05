import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  Bell,
  Car,
  CreditCard,
  Hotel,
  Compass,
  CheckCheck,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { EmptyState } from '../../src/components';
import { mockNotifications, AppNotification } from '../../src/mocks';
import { formatTimeShort } from '../../src/utils/date';
import { useTranslation } from '../../src/i18n';

export default function NotificationsScreen() {
  const { t } = useTranslation(['notifications', 'common']);
  const [notifications, setNotifications] = useState<AppNotification[]>(mockNotifications);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getCategoryIcon = (category: AppNotification['category']) => {
    switch (category) {
      case 'ride':
        return <Car size={18} color={theme.colors.primaryDark} />;
      case 'payment':
        return <CreditCard size={18} color={theme.colors.success} />;
      case 'hotel':
        return <Hotel size={18} color={theme.colors.hotelAccent} />;
      case 'tour':
        return <Compass size={18} color={theme.colors.heritageAccent} />;
      default:
        return <Bell size={18} color={theme.colors.secondary} />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{t('title')}</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : t('emptyTitle')}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
            <CheckCheck size={16} color={theme.colors.primaryDark} />
            <Text style={styles.markReadText}>{t('markAllRead')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDesc')}
          />
        ) : (
          notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => {
                setNotifications((prev) =>
                  prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
                );
              }}
              style={[styles.card, !item.isRead && styles.cardUnread]}
            >
              <View style={styles.iconCircle}>{getCategoryIcon(item.category)}</View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleBold]}>
                    {item.title}
                  </Text>
                  <Text style={styles.timeText}>{formatTimeShort(item.createdAt)}</Text>
                </View>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  headerSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  markReadText: {
    ...theme.typography.captionBold,
    color: theme.colors.primaryDark,
  },
  scrollList: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
  },
  cardUnread: {
    backgroundColor: '#FFFDF5',
    borderColor: theme.colors.borderGold,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  cardTitleBold: {
    fontWeight: '700',
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  messageText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});
