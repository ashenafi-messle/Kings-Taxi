import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  BackHandler,
  useWindowDimensions,
  Image,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  Polygon,
  Line,
  Ellipse,
  Circle,
} from 'react-native-svg';
import { Globe, Mail, Share2 } from 'lucide-react-native';
import { LanguageSelectorModal } from '../../src/components/common/LanguageSelectorModal';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { useSettingsStore, useAuthStore } from '../../src/stores';

/**
 * Official Kings Taxi Brand Assets
 * - Section H Main Royal KT Artwork: Cloudinary 3D Golden Sculpture with local bundled fallback
 * - Top-left brand logo: Focused high-definition crown & KT monogram (UNTOUCHED)
 */
const ROYAL_KT_3D_ARTWORK_URL =
  'https://res.cloudinary.com/oxzqogef/image/upload/v1794851350/Gemini_Generated_Image_76y38g76y38g76y3.jpg';
const ROYAL_KT_3D_ARTWORK_LOCAL = require('../../assets/branding/kt-royal-crown-3d.jpg');
const MONOGRAM_SOURCE = require('../../assets/branding/kings-taxi-monogram.png');

/**
 * Pixel-Perfect Android Bugdroid Robot SVG Icon
 */
const AndroidRobotIcon = ({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Antennae */}
    <Path d="M7 4 L5 1.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M17 4 L19 1.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    {/* Head dome */}
    <Path d="M4 8.5 C4 4.5 7.5 2.5 12 2.5 C16.5 2.5 20 4.5 20 8.5 Z" fill={color} />
    {/* Eyes */}
    <Circle cx="8" cy="6" r="1.1" fill="#66370D" />
    <Circle cx="16" cy="6" r="1.1" fill="#66370D" />
    {/* Torso */}
    <Rect x="4" y="9.8" width="16" height="8.8" rx="2" fill={color} />
    {/* Left Arm */}
    <Rect x="1" y="9.8" width="2.2" height="7" rx="1.1" fill={color} />
    {/* Right Arm */}
    <Rect x="20.8" y="9.8" width="2.2" height="7" rx="1.1" fill={color} />
    {/* Left Leg */}
    <Rect x="6.8" y="18.8" width="3" height="4.2" rx="1.5" fill={color} />
    {/* Right Leg */}
    <Rect x="14.2" y="18.8" width="3" height="4.2" rx="1.5" fill={color} />
  </Svg>
);

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation(['auth', 'common']);
  const { language } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [artworkLoadFailed, setArtworkLoadFailed] = useState(false);

  // Responsive device classification for Android-first adaptive layouts
  const isSmallDevice = height < 700;
  const isMediumDevice = height >= 700 && height < 820;

  // Adaptive font and graphic dimensions
  const headlineLine1Size = isSmallDevice ? 30 : isMediumDevice ? 35 : 38;
  const headlineLine2Size = isSmallDevice ? 35 : isMediumDevice ? 41 : 45;
  const illustrationWidth = isSmallDevice ? 168 : isMediumDevice ? 208 : 244;
  const illustrationHeight = Math.round(illustrationWidth / 1.543);
  const illustrationSize = illustrationWidth;

  const royalKtArtworkSource = artworkLoadFailed
    ? ROYAL_KT_3D_ARTWORK_LOCAL
    : { uri: ROYAL_KT_3D_ARTWORK_URL };

  // Android hardware back press closes language modal if open
  useEffect(() => {
    const onBackPress = () => {
      if (langModalVisible) {
        setLangModalVisible(false);
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [langModalVisible]);

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === language)?.nativeName || 'English';

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Kings Taxi — Premium Class Transport',
        message:
          'Kings Taxi: The Royal Standard of Ethiopian Mobility. Experience comfort, safety and convenience. Visit https://kingstaxi.et',
      });
    } catch (err) {
      console.warn('Share Kings Taxi error:', err);
    }
  };

  const handleEmailContact = () => {
    Linking.openURL('mailto:support@kingstaxi.et').catch(() => {
      router.push('/support');
    });
  };

  const handleAndroidAction = () => {
    router.push('/support');
  };

  const handleSignInNavigation = () => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      {/* 3.A. Status Bar — Transparent with white icons; background continues behind it */}
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 3.I & 4. Full-Screen Luxury Showroom Background with Architectural Sunlight & Shadows */}
      <Svg style={StyleSheet.absoluteFillObject} width={width} height={height}>
        <Defs>
          {/* Wall Champagne Gradient: sunlight entering softly from top right */}
          <LinearGradient id="wallChampagne" x1="0%" y1="0%" x2="100%" y2="80%">
            <Stop offset="0%" stopColor="#F5D69E" />
            <Stop offset="45%" stopColor="#F7DDAA" />
            <Stop offset="80%" stopColor="#FCE5BD" />
            <Stop offset="100%" stopColor="#FFF0D0" />
          </LinearGradient>

          {/* Polished Cream Floor Gradient */}
          <LinearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFF0D0" />
            <Stop offset="30%" stopColor="#FCE7BC" />
            <Stop offset="70%" stopColor="#F8DAA0" />
            <Stop offset="100%" stopColor="#F3CD87" />
          </LinearGradient>

          {/* Golden Vertical Window Frame on Far Right */}
          <LinearGradient id="windowFrameGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#D99A28" />
            <Stop offset="40%" stopColor="#FFC04A" />
            <Stop offset="70%" stopColor="#F7DDAA" />
            <Stop offset="100%" stopColor="#B8750B" />
          </LinearGradient>

          {/* Reflective Golden Floor Sheen */}
          <RadialGradient id="floorSheenGold" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#FFD372" stopOpacity="0.65" />
            <Stop offset="50%" stopColor="#D99A28" stopOpacity="0.30" />
            <Stop offset="100%" stopColor="#FFF0D0" stopOpacity="0" />
          </RadialGradient>

          {/* Elegant Golden Curved Decorative Element along the bottom */}
          <LinearGradient id="bottomRibbonGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#B8750B" stopOpacity="0.7" />
            <Stop offset="50%" stopColor="#FFC04A" stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#D99A28" stopOpacity="0.7" />
          </LinearGradient>

          {/* Soft Sunlight Beam from Window */}
          <LinearGradient id="sunlightBeam" x1="100%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <Stop offset="60%" stopColor="#FFF4D8" stopOpacity="0.18" />
            <Stop offset="100%" stopColor="#F7DDAA" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Champagne Wall */}
        <Rect x="0" y="0" width={width} height={height} fill="url(#wallChampagne)" />

        {/* Polished Light Cream Floor (Lower ~34% of screen) */}
        <Rect
          x="0"
          y={height * 0.66}
          width={width}
          height={height * 0.34}
          fill="url(#floorGrad)"
        />

        {/* Floor Horizon Line */}
        <Line
          x1="0"
          y1={height * 0.66}
          x2={width}
          y2={height * 0.66}
          stroke="rgba(184, 117, 11, 0.22)"
          strokeWidth={1}
        />

        {/* Soft Sunlight Beam entering from the right */}
        <Polygon
          points={`${width},0 ${width * 0.35},${height} ${width},${height}`}
          fill="url(#sunlightBeam)"
        />

        {/* Architectural Diagonal Window Shadows */}
        <Polygon
          points={`${width * 0.58},0 ${width * 0.70},0 ${width * 0.30},${height} ${width * 0.16},${height}`}
          fill="rgba(102, 55, 13, 0.05)"
        />
        <Polygon
          points={`${width * 0.84},0 ${width * 0.95},0 ${width * 0.62},${height} ${width * 0.49},${height}`}
          fill="rgba(102, 55, 13, 0.055)"
        />

        {/* Golden Vertical Window Frame along the right side */}
        <Rect
          x={width - 12}
          y="0"
          width="12"
          height={height}
          fill="url(#windowFrameGold)"
        />
        <Line
          x1={width - 12}
          y1="0"
          x2={width - 12}
          y2={height}
          stroke="#FFE082"
          strokeWidth={1.2}
          opacity={0.85}
        />

        {/* Reflective Golden Floor Sheen underneath the 3D logo area */}
        <Ellipse
          cx={width * 0.72}
          cy={height * 0.74}
          rx={width * 0.26}
          ry={22}
          fill="url(#floorSheenGold)"
        />

        {/* Elegant Golden Curved Decorative Ribbon along the bottom */}
        <Path
          d={`M0,${height - 22} Q${width * 0.5},${height - 48} ${width},${height - 24} L${width},${height} L0,${height} Z`}
          fill="url(#bottomRibbonGold)"
        />
      </Svg>

      {/* Main Content Layer */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 6,
            paddingBottom: Math.max(insets.bottom, 16) + 12,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 3.B. Brand Logo Section (Upper-Left portion) */}
        <View style={styles.topHeaderRow}>
          <View style={styles.brandLogoCluster}>
            <View style={styles.brandEmblemBadge}>
              <Image
                source={MONOGRAM_SOURCE}
                style={styles.brandEmblemImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.brandTitleColumn}>
              <Text style={styles.brandNameTitle}>
                KINGS <Text style={styles.brandNameGold}>TAXI</Text>
              </Text>
              <Text style={styles.brandTaglineSubtitle}>
                {t('auth:premiumClassTransport')}
              </Text>
            </View>
          </View>

          {/* Compact Language Selector Pill */}
          <TouchableOpacity
            style={styles.langPill}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Change language. Current: ${currentLangLabel}`}
          >
            <Globe size={13} color="#66370D" />
            <Text style={styles.langPillText}>{currentLangLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* 3.C, 3.D, 3.E, 3.F, 3.G: Left-Aligned Hero Content Flow */}
        <View style={styles.heroContentBlock}>
          {/* 3.C. Welcome Heading */}
          <Text style={styles.welcomeHeading}>
            {t('auth:welcomeToKingsTaxi')}
          </Text>

          {/* 3.D. Main Hero Headline (Two lines, lightweight first line, extra-bold second line) */}
          <View style={styles.headlineWrapper}>
            <Text
              style={[
                styles.headlineLine1,
                { fontSize: headlineLine1Size, lineHeight: headlineLine1Size * 1.15 },
              ]}
            >
              {t('auth:designedFor')}
            </Text>
            <Text
              style={[
                styles.headlineLine2,
                { fontSize: headlineLine2Size, lineHeight: headlineLine2Size * 1.15 },
              ]}
            >
              {t('auth:betterTravel')}
            </Text>
          </View>

          {/* 3.E. Description (Two lines) */}
          <Text style={styles.heroDescription}>
            {t('auth:welcomeHeroDesc')}
          </Text>

          {/* 3.F. Get Started Button (Prominent Gold Gradient Pill Button) */}
          <TouchableOpacity
            style={styles.getStartedPillButton}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('auth:getStarted')}
          >
            {/* Metallic Gold Gradient Background */}
            <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
              <Defs>
                <LinearGradient id="btnGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#B8750B" />
                  <Stop offset="30%" stopColor="#D99A28" />
                  <Stop offset="70%" stopColor="#FFC04A" />
                  <Stop offset="100%" stopColor="#D99A28" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" rx={27} fill="url(#btnGoldGrad)" />
            </Svg>

            {/* Button Label and White Right-Facing Triangle Icon */}
            <View style={styles.buttonInnerRow}>
              <Text style={styles.getStartedButtonLabel}>
                {t('auth:getStarted').toUpperCase()}
              </Text>
              <View style={styles.triangleIconWrapper}>
                <Svg width={11} height={13} viewBox="0 0 12 14">
                  <Polygon points="1.5,1.5 10.5,7 1.5,12.5" fill="#FFFFFF" />
                </Svg>
              </View>
            </View>
          </TouchableOpacity>

          {/* 3.G. Sign-In Section (Positioned directly below Get Started button) */}
          <TouchableOpacity
            style={styles.signInRow}
            onPress={handleSignInNavigation}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${t('auth:alreadyHaveAccount')} ${t('auth:signInBtn')}`}
          >
            <Text style={styles.signInBaseText}>
              {t('auth:alreadyHaveAccount')}{' '}
              <Text style={styles.signInBoldText}>
                {t('auth:signInBtn')}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3.H. Main Royal KT Artwork with Realistic Floor Reflection (Lower-Middle/Right) */}
        <View style={styles.lowerIllustrationSection}>
          <View
            style={[
              styles.artworkContainer,
              { width: illustrationWidth, height: illustrationHeight },
            ]}
          >
            {/* Realistic Floor Reflection directly underneath */}
            <View style={styles.floorReflectionWrapper}>
              <Image
                source={royalKtArtworkSource}
                style={[
                  styles.floorReflectionImage,
                  { width: illustrationWidth * 0.95, height: illustrationHeight * 0.95 },
                ]}
                resizeMode="contain"
              />
            </View>

            {/* Main 3D Golden Crown with KT Monogram Artwork */}
            <View
              style={[
                styles.mainArtworkCard,
                { width: illustrationWidth, height: illustrationHeight },
              ]}
            >
              <Image
                source={royalKtArtworkSource}
                style={[
                  styles.crownMainImage,
                  { width: illustrationWidth, height: illustrationHeight },
                ]}
                resizeMode="contain"
                onError={() => setArtworkLoadFailed(true)}
              />
            </View>
          </View>
        </View>

        {/* 3.J. Bottom Social / Contact Icons (Three circular translucent golden buttons) */}
        <View style={styles.bottomSocialIconRow}>
          {/* 1. Email / Envelope */}
          <TouchableOpacity
            style={styles.socialCircleButton}
            onPress={handleEmailContact}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('auth:helpAndSupport')}
          >
            <Mail size={19} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>

          {/* 2. Android Robot */}
          <TouchableOpacity
            style={styles.socialCircleButton}
            onPress={handleAndroidAction}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Android App"
          >
            <AndroidRobotIcon size={19} color="#FFFFFF" />
          </TouchableOpacity>

          {/* 3. Share Icon */}
          <TouchableOpacity
            style={styles.socialCircleButton}
            onPress={handleShare}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={t('auth:shareKingsTaxi')}
          >
            <Share2 size={18} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7DDAA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 10,
  },
  brandLogoCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandEmblemBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF0D0',
    borderWidth: 2,
    borderColor: '#D99A28',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8750B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  brandEmblemImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
  },
  brandTitleColumn: {
    justifyContent: 'center',
  },
  brandNameTitle: {
    fontSize: 16.5,
    fontWeight: '900',
    color: '#66370D',
    letterSpacing: 1.0,
  },
  brandNameGold: {
    color: '#D99A28',
  },
  brandTaglineSubtitle: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#B8750B',
    letterSpacing: 1.3,
    marginTop: 1,
    textTransform: 'uppercase',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 240, 208, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#D99A28',
    shadowColor: '#B8750B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 1,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#66370D',
  },
  heroContentBlock: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    marginTop: 10,
  },
  welcomeHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#66370D',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  headlineWrapper: {
    marginBottom: 10,
  },
  headlineLine1: {
    fontWeight: '300',
    color: '#66370D',
    letterSpacing: -0.5,
  },
  headlineLine2: {
    fontWeight: '900',
    color: '#66370D',
    letterSpacing: -0.5,
  },
  heroDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: '#66370D',
    fontWeight: '500',
    marginBottom: 24,
    maxWidth: 340,
  },
  getStartedPillButton: {
    width: '100%',
    maxWidth: 380,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    shadowColor: '#B8750B',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
  },
  buttonInnerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  getStartedButtonLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.4,
  },
  triangleIconWrapper: {
    marginLeft: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 6,
  },
  signInBaseText: {
    fontSize: 14.5,
    color: '#66370D',
    fontWeight: '500',
  },
  signInBoldText: {
    color: '#66370D',
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  lowerIllustrationSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 6,
    marginVertical: 8,
    minHeight: 130,
  },
  artworkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mainArtworkCard: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#66370D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 2,
  },
  crownMainImage: {
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  floorReflectionWrapper: {
    position: 'absolute',
    bottom: -26,
    zIndex: 1,
    opacity: 0.25,
    transform: [{ scaleY: -0.65 }, { translateY: -10 }],
  },
  floorReflectionImage: {
    borderRadius: 20,
  },
  bottomSocialIconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 10,
  },
  socialCircleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(217, 154, 40, 0.35)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8750B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
});
