import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Car, Hotel, Compass, ShieldCheck } from 'lucide-react-native';
import { theme } from '../../src/theme';
import { PrimaryButton, SecondaryButton } from '../../src/components';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Crown & Brand Identity Header */}
        <View style={styles.brandHeader}>
          <View style={styles.crownCircle}>
            <Crown size={38} color={theme.colors.primary} />
          </View>
          <Text style={styles.appName}>KINGS TAXI</Text>
          <Text style={styles.appTagline}>Royal Comfort Across Ethiopia</Text>
        </View>

        {/* Feature Value Cards */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#FFF9E6' }]}>
              <Car size={22} color={theme.colors.primaryDark} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Urban Ride-Hailing</Text>
              <Text style={styles.featureDesc}>
                Instant and scheduled rides with upfront ETB pricing and certified drivers.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Hotel size={22} color={theme.colors.hotelAccent} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Hotel Reservations</Text>
              <Text style={styles.featureDesc}>
                Verified luxury hotels and resorts from Addis Ababa to Hawassa and Bahir Dar.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Compass size={22} color={theme.colors.heritageAccent} />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Heritage & Tour Contracts</Text>
              <Text style={styles.featureDesc}>
                Custom chauffeured expeditions to Lalibela, Gondar, and Simien Mountains.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconBox, { backgroundColor: '#ECFDF5' }]}>
              <ShieldCheck size={22} color="#059669" />
            </View>
            <View style={styles.featureTextBox}>
              <Text style={styles.featureTitle}>Secure Ethiopian Payments</Text>
              <Text style={styles.featureDesc}>
                Integrated with Telebirr, CBE Birr, Chapa, and verified cash handling.
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <PrimaryButton
            title="Sign In with Phone"
            onPress={() => router.push('/(auth)/login')}
            style={styles.signInBtn}
          />
          <SecondaryButton
            title="Create New Account"
            onPress={() => router.push('/(auth)/register')}
            style={styles.registerBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    justifyContent: 'space-between',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  crownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.card,
  },
  appName: {
    ...theme.typography.h1,
    color: theme.colors.secondary,
    letterSpacing: 2,
  },
  appTagline: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  featuresContainer: {
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.borderRadius.lg,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  featureTextBox: {
    flex: 1,
  },
  featureTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  featureDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  buttonContainer: {
    gap: theme.spacing.sm,
  },
  signInBtn: {
    width: '100%',
  },
  registerBtn: {
    width: '100%',
  },
});
