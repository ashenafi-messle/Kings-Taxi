import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Car,
  Hotel,
  Compass,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';

interface HomeAdSlide {
  id: string;
  badgeKey: string;
  titleKey: string;
  subtitleKey: string;
  ctaKey: string;
  route: string;
  icon: (color: string) => React.ReactNode;
  primaryColor: string;
  bgGradientStart: string;
  borderColor: string;
  ctaBg: string;
  ctaTextColor: string;
}

export const HomeAdCarousel: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation(['home', 'common']);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isInteracting = useRef(false);

  // Responsive carousel card width
  const carouselWidth = Math.min(width - 32, 480);

  const slides: HomeAdSlide[] = [
    {
      id: 'chauffeur',
      badgeKey: 'ad1Badge',
      titleKey: 'ad1Title',
      subtitleKey: 'ad1Subtitle',
      ctaKey: 'ad1Cta',
      route: '/rides/book',
      icon: (c) => <Car size={22} color={c} />,
      primaryColor: colors.primaryGold,
      bgGradientStart: '#FCFBF5',
      borderColor: colors.borderGold,
      ctaBg: colors.primaryGold,
      ctaTextColor: colors.white,
    },
    {
      id: 'hotels',
      badgeKey: 'ad2Badge',
      titleKey: 'ad2Title',
      subtitleKey: 'ad2Subtitle',
      ctaKey: 'ad2Cta',
      route: '/(tabs)/hotels',
      icon: (c) => <Hotel size={22} color={c} />,
      primaryColor: '#2563EB',
      bgGradientStart: '#F8FAFF',
      borderColor: '#BFDBFE',
      ctaBg: '#2563EB',
      ctaTextColor: colors.white,
    },
    {
      id: 'heritage',
      badgeKey: 'ad3Badge',
      titleKey: 'ad3Title',
      subtitleKey: 'ad3Subtitle',
      ctaKey: 'ad3Cta',
      route: '/(tabs)/explore',
      icon: (c) => <Compass size={22} color={c} />,
      primaryColor: '#7C3AED',
      bgGradientStart: '#FAF8FF',
      borderColor: '#DDD6FE',
      ctaBg: '#7C3AED',
      ctaTextColor: colors.white,
    },
    {
      id: 'safety',
      badgeKey: 'ad4Badge',
      titleKey: 'ad4Title',
      subtitleKey: 'ad4Subtitle',
      ctaKey: 'ad4Cta',
      route: '/support',
      icon: (c) => <ShieldCheck size={22} color={c} />,
      primaryColor: '#059669',
      bgGradientStart: '#F6FDF9',
      borderColor: '#A7F3D0',
      ctaBg: '#059669',
      ctaTextColor: colors.white,
    },
    {
      id: 'charter',
      badgeKey: 'ad5Badge',
      titleKey: 'ad5Title',
      subtitleKey: 'ad5Subtitle',
      ctaKey: 'ad5Cta',
      route: '/tours/contract-builder',
      icon: (c) => <Sparkles size={22} color={c} />,
      primaryColor: colors.deepGold,
      bgGradientStart: '#FFFDF7',
      borderColor: colors.champagne,
      ctaBg: colors.dark,
      ctaTextColor: colors.champagne,
    },
  ];

  // Auto-play timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isInteracting.current && scrollRef.current) {
        const nextIndex = (activeIndex + 1) % slides.length;
        scrollRef.current.scrollTo({
          x: nextIndex * carouselWidth,
          animated: true,
        });
        setActiveIndex(nextIndex);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [activeIndex, carouselWidth, slides.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / carouselWidth);
    if (index >= 0 && index < slides.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleIndicatorPress = (idx: number) => {
    setActiveIndex(idx);
    scrollRef.current?.scrollTo({
      x: idx * carouselWidth,
      animated: true,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isInteracting.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isInteracting.current = false;
          }, 3000);
        }}
        style={{ width: carouselWidth }}
      >
        {slides.map((slide) => (
          <TouchableOpacity
            key={slide.id}
            activeOpacity={0.92}
            onPress={() => router.push(slide.route as any)}
            style={[
              styles.slideCard,
              {
                width: carouselWidth,
                backgroundColor: slide.bgGradientStart,
                borderColor: slide.borderColor,
              },
            ]}
          >
            {/* Top Badge & Icon */}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: `${slide.primaryColor}18` },
                ]}
              >
                {slide.icon(slide.primaryColor)}
              </View>
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: `${slide.primaryColor}15`,
                    borderColor: `${slide.primaryColor}40`,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: slide.primaryColor }]}>
                  {t(slide.badgeKey as any)}
                </Text>
              </View>
            </View>

            {/* Slide Title */}
            <Text style={styles.slideTitle} numberOfLines={2}>
              {t(slide.titleKey as any)}
            </Text>

            {/* Slide Subtitle */}
            <Text style={styles.slideSubtitle} numberOfLines={2}>
              {t(slide.subtitleKey as any)}
            </Text>

            {/* Bottom CTA Button */}
            <View style={styles.ctaRow}>
              <View
                style={[
                  styles.ctaButton,
                  { backgroundColor: slide.ctaBg },
                ]}
              >
                <Text style={[styles.ctaText, { color: slide.ctaTextColor }]}>
                  {t(slide.ctaKey as any)}
                </Text>
                <ArrowRight size={14} color={slide.ctaTextColor} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Pagination Indicators */}
      <View style={styles.indicatorContainer}>
        {slides.map((_, idx) => {
          const isActive = idx === activeIndex;
          return (
            <TouchableOpacity
              key={idx}
              onPress={() => handleIndicatorPress(idx)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.dot,
                isActive ? styles.dotActive : styles.dotInactive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Slide ${idx + 1}`}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 14,
  },
  slideCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.dark,
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  slideSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primaryGold,
  },
  dotInactive: {
    width: 6,
    backgroundColor: colors.border,
  },
});

