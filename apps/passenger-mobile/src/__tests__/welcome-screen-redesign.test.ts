import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Kings Taxi Premium Welcome Screen Pixel-Perfect Verification', () => {
  const welcomeScreenPath = path.resolve(
    __dirname,
    '../../app/(auth)/welcome.tsx'
  );
  const welcomeSrc = fs.readFileSync(welcomeScreenPath, 'utf8');

  it('completely removes the promotional image carousel (LandingHeroCarousel)', () => {
    expect(welcomeSrc).not.toContain('<LandingHeroCarousel');
    expect(welcomeSrc).not.toContain('import { LandingHeroCarousel }');
    expect(welcomeSrc).not.toContain('LandingHeroCarousel,');
  });

  it('completely removes active passenger session card from the landing page', () => {
    expect(welcomeSrc).not.toContain('authSessionCard');
    expect(welcomeSrc).not.toContain('Active Passenger Session');
    expect(welcomeSrc).not.toContain('authWelcomeSub');
    expect(welcomeSrc).not.toContain('authAvatarCircle');
    expect(welcomeSrc).not.toContain('authSwitchBtn');
  });

  it('implements the exact required visual hierarchy and branding content', () => {
    // Welcome Greeting
    expect(welcomeSrc).toContain("t('auth:welcomeToKingsTaxi')");
    // Main Two-Line Headline
    expect(welcomeSrc).toContain("t('auth:designedFor')");
    expect(welcomeSrc).toContain("t('auth:betterTravel')");
    // Supporting Description
    expect(welcomeSrc).toContain("t('auth:welcomeHeroDesc')");
    // Primary & Secondary Actions
    expect(welcomeSrc).toContain("t('auth:getStarted')");
    expect(welcomeSrc).toContain("t('auth:alreadyHaveAccount')");
    expect(welcomeSrc).toContain("t('auth:signInBtn')");
    // Subtitle
    expect(welcomeSrc).toContain("t('auth:premiumClassTransport')");
  });

  it('verifies GET STARTED button navigates to the registration flow', () => {
    expect(welcomeSrc).toContain("router.push('/(auth)/register')");
  });

  it('verifies Sign In action navigates to the login destination', () => {
    expect(welcomeSrc).toContain("router.push('/(auth)/login')");
  });

  it('verifies royal crown and KT monogram artwork is positioned in lower section with realistic floor reflection', () => {
    expect(welcomeSrc).toContain('ROYAL_KT_3D_ARTWORK_URL');
    expect(welcomeSrc).toContain(
      'https://res.cloudinary.com/oxzqogef/image/upload/v1794851350/Gemini_Generated_Image_76y38g76y38g76y3.jpg'
    );
    expect(welcomeSrc).toContain('ROYAL_KT_3D_ARTWORK_LOCAL');
    expect(welcomeSrc).toContain('kt-royal-crown-3d.jpg');
    expect(welcomeSrc).toContain('lowerIllustrationSection');
    expect(welcomeSrc).toContain('mainArtworkCard');
    expect(welcomeSrc).toContain('floorReflectionWrapper');
    expect(welcomeSrc).toContain('floorReflectionImage');
  });

  it('implements the exact luxury showroom color palette', () => {
    // Champagne background
    expect(welcomeSrc).toContain('#F7DDAA');
    // Light cream floor
    expect(welcomeSrc).toContain('#FFF0D0');
    // Metallic gold
    expect(welcomeSrc).toContain('#D99A28');
    // Deep gold
    expect(welcomeSrc).toContain('#B8750B');
    // Bright gold
    expect(welcomeSrc).toContain('#FFC04A');
    // Dark brown typography
    expect(welcomeSrc).toContain('#66370D');
    // White icons
    expect(welcomeSrc).toContain('#FFFFFF');
  });

  it('recreates the architectural window, sunlight beams, and shadows in SVG', () => {
    expect(welcomeSrc).toContain('wallChampagne');
    expect(welcomeSrc).toContain('floorGrad');
    expect(welcomeSrc).toContain('windowFrameGold');
    expect(welcomeSrc).toContain('sunlightBeam');
    expect(welcomeSrc).toContain('floorSheenGold');
    expect(welcomeSrc).toContain('bottomRibbonGold');
  });

  it('includes the three circular translucent golden buttons with Mail, Android Robot, and Share icons', () => {
    expect(welcomeSrc).toContain('bottomSocialIconRow');
    expect(welcomeSrc).toContain('socialCircleButton');
    expect(welcomeSrc).toContain('AndroidRobotIcon');
    expect(welcomeSrc).toContain('Share2');
    expect(welcomeSrc).toContain('Mail');
  });

  it('configures transparent status bar with light content icons', () => {
    expect(welcomeSrc).toContain('barStyle="light-content"');
    expect(welcomeSrc).toContain('translucent');
    expect(welcomeSrc).toContain('backgroundColor="transparent"');
  });

  it('applies Android-responsive dimensions for small, medium and large displays', () => {
    expect(welcomeSrc).toContain('isSmallDevice');
    expect(welcomeSrc).toContain('isMediumDevice');
    expect(welcomeSrc).toContain('headlineLine1Size');
    expect(welcomeSrc).toContain('headlineLine2Size');
    expect(welcomeSrc).toContain('illustrationSize');
  });
});
