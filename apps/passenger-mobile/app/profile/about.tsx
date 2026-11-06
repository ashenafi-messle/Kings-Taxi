import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Compass,
  Target,
  MapPin,
  Code2,
  Award,
  Sparkles,
  ShieldCheck,
  Building2,
  Users,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { KingsTaxiLogo } from '../../src/components';

export default function AboutUsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back to Profile"
        >
          <ArrowLeft size={22} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>About Kings Taxi</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Monogram Hero */}
        <View style={styles.brandHero}>
          <KingsTaxiLogo variant="hero" showTagline showText scale={0.9} />
        </View>

        {/* Introduction Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Sparkles size={20} color={colors.primaryGold} />
            </View>
            <Text style={styles.cardTitle}>Who We Are</Text>
          </View>
          <Text style={styles.bodyText}>
            Kings Taxi is a modern passenger transportation service primarily serving
            Gondar City, Ethiopia. Our goal is to make urban transportation easier,
            more convenient, reliable, and accessible through technology.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 12 }]}>
            We connect passengers with transportation services through an easy-to-use
            mobile application, allowing customers to explore available transportation
            services and manage their journeys conveniently.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 12 }]}>
            Our commitment is to provide a professional transportation experience
            built around customer convenience, safety, service quality, and trust.
          </Text>
        </View>

        {/* Vision & Mission Cards */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Compass size={20} color={colors.primaryGold} />
            </View>
            <Text style={styles.cardTitle}>Our Vision</Text>
          </View>
          <Text style={styles.bodyText}>
            To become a trusted and innovative transportation service provider,
            transforming urban mobility through modern technology and
            customer-focused transportation solutions.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Target size={20} color={colors.primaryGold} />
            </View>
            <Text style={styles.cardTitle}>Our Mission</Text>
          </View>
          <Text style={styles.bodyText}>
            To simplify everyday transportation by connecting passengers with
            reliable taxi services through an accessible, convenient, and
            technology-driven platform.
          </Text>
        </View>

        {/* Service Area Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <MapPin size={20} color={colors.primaryGold} />
            </View>
            <Text style={styles.cardTitle}>Our Service Area</Text>
          </View>
          <View style={styles.serviceAreaPill}>
            <ShieldCheck size={18} color={colors.primaryGold} />
            <Text style={styles.serviceAreaText}>Gondar City, Ethiopia</Text>
          </View>
        </View>

        {/* Development Credits Section */}
        <View style={styles.creditsCard}>
          <View style={styles.creditsHeader}>
            <Building2 size={22} color={colors.deepGold} />
            <Text style={styles.creditsMainTitle}>Developed By</Text>
          </View>

          <Text style={styles.companyName}>ARDAB TECH SOLUTIONS S.C</Text>
          <View style={styles.goldDivider} />

          <View style={styles.contributorsHeader}>
            <Users size={18} color={colors.deepGold} />
            <Text style={styles.contributorsTitle}>Project Contributors</Text>
          </View>

          <View style={styles.contributorItem}>
            <View style={styles.contributorDot} />
            <View style={styles.contributorDetails}>
              <Text style={styles.contributorName}>Ambelu Endalew</Text>
              <Text style={styles.contributorTitle}>PhD Researcher</Text>
            </View>
          </View>

          <View style={styles.contributorItem}>
            <View style={styles.contributorDot} />
            <View style={styles.contributorDetails}>
              <Text style={styles.contributorName}>Ashenafi Messle</Text>
              <Text style={styles.contributorTitle}>Software Engineer</Text>
            </View>
          </View>
        </View>

        <Text style={styles.versionFooter}>
          Kings Taxi Passenger Mobile v1.0.0 • Royal Mobility Experience
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    marginBottom: 16,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightGold,
    borderWidth: 1,
    borderColor: colors.champagne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.dark,
    letterSpacing: -0.2,
  },
  bodyText: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 22,
  },
  serviceAreaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.lightGold,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderGold,
    marginTop: 4,
  },
  serviceAreaText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.deepGold,
  },
  creditsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
    borderWidth: 2,
    borderColor: colors.primaryGold,
    marginTop: 8,
    marginBottom: 24,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  creditsMainTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.deepGold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  companyName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.dark,
    letterSpacing: 0.4,
  },
  goldDivider: {
    height: 1.5,
    backgroundColor: colors.champagne,
    marginVertical: 16,
  },
  contributorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  contributorsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryGold,
    letterSpacing: 0.3,
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contributorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryGold,
  },
  contributorDetails: {
    flex: 1,
  },
  contributorName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.dark,
  },
  contributorTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    marginTop: 1,
  },
  versionFooter: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
});

