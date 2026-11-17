import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Kings Taxi UI Refinements Verification', () => {
  const registerScreenPath = path.resolve(
    __dirname,
    '../../app/(auth)/register.tsx'
  );
  const registerSrc = fs.readFileSync(registerScreenPath, 'utf8');

  const logoComponentPath = path.resolve(
    __dirname,
    '../components/branding/KingsTaxiLogo.tsx'
  );
  const logoSrc = fs.readFileSync(logoComponentPath, 'utf8');

  const welcomeScreenPath = path.resolve(
    __dirname,
    '../../app/(auth)/welcome.tsx'
  );
  const welcomeSrc = fs.readFileSync(welcomeScreenPath, 'utf8');

  describe('1. Registration Phone Initial State', () => {
    it('initializes phone state to an empty string instead of a hardcoded default number', () => {
      expect(registerSrc).toContain("const [phone, setPhone] = useState('');");
      expect(registerSrc).not.toContain("const [phone, setPhone] = useState('0911234567');");
    });

    it('preserves country code selector and phone placeholder', () => {
      expect(registerSrc).toContain("const [countryCode, setCountryCode] = useState('+251');");
      expect(registerSrc).toContain("placeholder={t('phonePlaceholder')}");
    });
  });

  describe('2. Bold Blue Platform Brand Text', () => {
    it('sets brandTitle and brandTagline color to bold blue #1455A0', () => {
      expect(logoSrc).toContain("color: '#1455A0'");
      expect(logoSrc).toContain("fontWeight: '900'");
      expect(logoSrc).toContain("fontWeight: '800'");
    });

    it('sets the TAXI span to #1455A0 in non-hero variants', () => {
      expect(logoSrc).toContain("{ color: '#1455A0' }");
    });
  });

  describe('3. Simplified Welcome Hero Text', () => {
    it('displays uppercase bold PREMIUM CLASS TRANSPORT in the hero headline', () => {
      expect(welcomeSrc).toContain("t('auth:premiumClassTransport').toUpperCase()");
      expect(welcomeSrc).toContain('headlineLine2');
      expect(welcomeSrc).toContain("fontWeight: '900'");
      expect(welcomeSrc).toContain("color: '#66370D'");
    });

    it('removes Designed for, Better Travel, and supporting description', () => {
      expect(welcomeSrc).not.toContain("t('auth:designedFor')");
      expect(welcomeSrc).not.toContain("t('auth:betterTravel')");
      expect(welcomeSrc).not.toContain("t('auth:welcomeHeroDesc')");
    });
  });

  describe('4. Removed Bottom Landing Page Icons', () => {
    it('completely removes the bottom social icon row, circle buttons, and icons', () => {
      expect(welcomeSrc).not.toContain('bottomSocialIconRow');
      expect(welcomeSrc).not.toContain('socialCircleButton');
      expect(welcomeSrc).not.toContain('AndroidRobotIcon');
      expect(welcomeSrc).not.toContain('Share2');
      expect(welcomeSrc).not.toContain('Mail');
    });
  });

  describe('5. Official Authentication Page Logo', () => {
    const loginScreenPath = path.resolve(
      __dirname,
      '../../app/(auth)/login.tsx'
    );
    const loginSrc = fs.readFileSync(loginScreenPath, 'utf8');

    const authLogoPath = path.resolve(
      __dirname,
      '../../assets/branding/kings-taxi-official-auth-logo.jpg'
    );

    it('uses shared KingsTaxiLogo component on both Sign In and Create Account screens', () => {
      expect(loginSrc).toContain('<KingsTaxiLogo variant="full" showTagline showText />');
      expect(registerSrc).toContain('<KingsTaxiLogo variant="full" showTagline showText />');
    });

    it('configures the exact official Cloudinary URL for the authentication logo', () => {
      expect(logoSrc).toContain('OFFICIAL_AUTH_LOGO_URL');
      expect(logoSrc).toContain(
        'https://res.cloudinary.com/oxzqogef/image/upload/v1794923454/Gemini_Generated_Image_9rs3pd9rs3pd9rs3.jpg'
      );
    });

    it('bundles a local high-performance offline fallback copy of the exact official logo', () => {
      expect(logoSrc).toContain('OFFICIAL_AUTH_LOGO_LOCAL');
      expect(logoSrc).toContain('kings-taxi-official-auth-logo.jpg');
      expect(fs.existsSync(authLogoPath)).toBe(true);
      const stat = fs.statSync(authLogoPath);
      expect(stat.size).toBe(1432805);
    });

    it('uses contain resizeMode to preserve exact aspect ratio without distortion or cropping', () => {
      expect(logoSrc).toContain("resizeMode: 'contain'");
      expect(logoSrc).toContain('defaultSource: OFFICIAL_AUTH_LOGO_LOCAL');
    });

    it('preserves landing page isolation (welcome.tsx does not use the auth logo)', () => {
      expect(welcomeSrc).not.toContain('OFFICIAL_AUTH_LOGO_URL');
      expect(welcomeSrc).not.toContain('OFFICIAL_AUTH_LOGO_LOCAL');
      expect(welcomeSrc).not.toContain('kings-taxi-official-auth-logo.jpg');
    });
  });
});
