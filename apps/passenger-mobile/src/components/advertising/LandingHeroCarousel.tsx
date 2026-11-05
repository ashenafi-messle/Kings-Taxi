import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Car, Hotel, Compass, ShieldCheck, Crown } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useTranslation } from '../../i18n';

interface SlideData {
  id: string;
  badge: string;
  titleKey: string;
  subtitleKey: string;
  icon: React.ReactNode;
  accentColor: string;
  bgLight: string;
}

export const LandingHeroCarousel: React.FC = () => {
  const { t } = useTranslation(['auth', 'home']);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isInteracting = useRef(false);

  const cardWidth = Math.min(width - 32, 440);

  const slides: SlideData[] = [
    {
      id: 'transport',
      badge: 'PREMIUM MOBILITY',
      titleKey: 'landingSlide1Title',
      subtitleKey: 'landingSlide1Subtitle',
      icon: <Car size={26} color={colors.primaryGold} />,
      accentColor: colors.primaryGold,
      bgLight: colors.lightGold,
    },
    {
      id: 'hotels',
      badge: '5-STAR HOSPITALITY',
      titleKey: 'landingSlide2Title',
      subtitleKey: 'landingSlide2Subtitle',
      icon: <Hotel size={26} color="#2563EB" />,
      accentColor: '#2563EB',
      bgLight: '#EFF6FF',
    },
    {
      id: 'heritage',
      badge: 'TIMELESS HERITAGE',
      titleKey: 'landingSlide3Title',
      subtitleKey: 'landingSlide3Subtitle',
      icon: <Compass size={26} color="#7C3AED" />,
      accentColor: '#7C3AED',
      bgLight: '#F5F3FF',
    },
    {
      id: 'safety',
      badge: 'ROYAL SAFETY PROMISE',
      titleKey: 'landingSlide4Title',
      subtitleKey: 'landingSlide4Subtitle',
      icon: <ShieldCheck size={26} color="#059669" />,
      accentColor: '#059669',
      bgLight: '#ECFDF5',
    },
    {
      id: 'experience',
      badge: 'BESPOKE TOURS',
      titleKey: 'landingSlide5Title',
      subtitleKey: 'landingSlide5Subtitle',
      icon: <Crown size={26} color={colors.deepGold} />,
      accentColor: colors.deepGold,
      bgLight: '#FFFBEB',
    },
  ];

  // Auto-play timer
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isInteracting.current && scrollRef.current) {
        const nextIndex = (activeIndex + 1) % slides.length;
        scrollRef.current.scrollTo({
          x: nextIndex * cardWidth,
          animated: true,
        });
        setActiveIndex(nextIndex);
      }
    }, 4500);

    return () => clearInterval(timer);
  }, [activeIndex, cardWidth, slides.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardWidth);
    if (index >= 0 && index < slides.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleIndicatorPress = (idx: number) => {
    setActiveIndex(idx);
    scrollRef.current?.scrollTo({
      x: idx * cardWidth,
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
        contentContainerStyle={{
          alignItems: 'center',
        }}
        style={{ width: cardWidth }}
      >
        {slides.map((slide, index) => (
          <View
            key={slide.id}
            style={[
              styles.slideCard,
              { width: cardWidth },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: slide.bgLight }]}>
                {slide.icon}
              </View>
              <View style={[styles.badgePill, { borderColor: slide.accentColor }]}>
                <Text style={[styles.badgeText, { color: slide.accentColor }]}>
                  {slide.badge}
                </Text>
              </View>
            </View>

            <Text style={styles.slideTitle}>
              {t(slide.titleKey as any)}
            </Text>

            <Text style={styles.slideSubtitle}>
              {t(slide.subtitleKey as any)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination Indicators */}
      <View style={styles.indicatorsRow}>
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
              accessibilityLabel={`Slide ${idx + 1} of ${slides.length}`}
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
    justifyContent: 'center',
    marginVertical: 12,
  },
  slideCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.dark,
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  slideSubtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 21,
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    transitionProperty: 'width',
    transitionDuration: '200ms',
  } as any,
  dotActive: {
    width: 24,
    backgroundColor: colors.primaryGold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
});
