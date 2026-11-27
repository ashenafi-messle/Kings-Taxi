import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Inbox } from 'lucide-react-native';
import { Colors, Radius, Spacing } from '../../src/theme/tokens';
import { useDriverStore } from '../../src/store/useDriverStore';
import { RideCategory } from '../../src/types/driver.types';
import { RideCard } from '../../src/components/RideCard';

const TABS: Array<{ key: RideCategory; label: string }> = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'HISTORY', label: 'History' },
];

export default function RidesScreen() {
  const router = useRouter();
  const rides = useDriverStore((s) => s.rides);
  const selectedTab = useDriverStore((s) => s.selectedRideTab);
  const setSelectedTab = useDriverStore((s) => s.setSelectedRideTab);

  const counts = useMemo(
    () => ({
      PENDING: rides.filter(
        (r) =>
          r.status === 'PENDING' ||
          r.status === 'IN_PROGRESS' ||
          r.status === 'AWAITING_PAYMENT' ||
          r.status === 'PAYMENT_PENDING_VERIFICATION'
      ).length,
      CONFIRMED: rides.filter((r) => r.status === 'CONFIRMED').length,
      HISTORY: rides.filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED').length,
    }),
    [rides]
  );

  const filteredRides = useMemo(() => {
    if (selectedTab === 'PENDING') {
      return rides.filter(
        (r) =>
          r.status === 'PENDING' ||
          r.status === 'IN_PROGRESS' ||
          r.status === 'AWAITING_PAYMENT' ||
          r.status === 'PAYMENT_PENDING_VERIFICATION'
      );
    }
    if (selectedTab === 'CONFIRMED') {
      return rides.filter((r) => r.status === 'CONFIRMED');
    }
    return rides.filter((r) => r.status === 'COMPLETED' || r.status === 'CANCELLED');
  }, [rides, selectedTab]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ride Management</Text>
        <Text style={styles.subtitle}>Manage incoming, confirmed, and completed rides</Text>

        <View style={styles.segmentedWrap}>
          {TABS.map((tab) => {
            const active = selectedTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setSelectedTab(tab.key)}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {tab.label} ({counts[tab.key]})
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filteredRides}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RideCard ride={item} onPressDetails={(id) => router.push(`/ride/${id}`)} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Inbox size={32} color={Colors.metallicMuted} />
            <Text style={styles.emptyTitle}>No {selectedTab.toLowerCase()} rides</Text>
            <Text style={styles.emptySubtitle}>
              Rides in this category will appear here automatically.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  header: {
    backgroundColor: Colors.cardWhite,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: Colors.primaryBlack,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.secondaryText,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  segmentedWrap: {
    flexDirection: 'row',
    backgroundColor: Colors.screenBg,
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.primaryBlack,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  segmentTextActive: {
    color: Colors.cardWhite,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 32,
  },
  emptyBox: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginTop: Spacing.lg,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
});
