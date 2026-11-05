import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { colors } from '../../theme/colors';

export interface LandingAdSlide {
  id: string;
  remoteUri: string;
  localSource: ImageSourcePropType;
  alt: string;
}

// 4 Official Cloudinary Advertisement Creatives
export const LANDING_AD_SLIDES: LandingAdSlide[] = [
  {
    id: 'ad-1',
    remoteUri:
      'https://res.cloudinary.com/oxzqogef/image/upload/v1793899852/Gemini_Generated_Image_fiik2fiik2fiik2f.jpg',
    localSource: require('../../../assets/advertising/landing/ad-slide-1.jpg'),
    alt: 'Kings Taxi Luxury Ride Experience',
  },
  {
    id: 'ad-2',
    remoteUri:
      'https://res.cloudinary.com/oxzqogef/image/upload/v1793899833/cc5c695e0fa8121f959da68cc94b8538.jpg',
    localSource: require('../../../assets/advertising/landing/ad-slide-2.jpg'),
    alt: 'Kings Taxi VIP Transport & Hotel Partnerships',
  },
  {
    id: 'ad-3',
    remoteUri:
      'https://res.cloudinary.com/oxzqogef/image/upload/v1793899800/Gemini_Generated_Image_uzogyyuzogyyuzog.jpg',
    localSource: require('../../../assets/advertising/landing/ad-slide-3.jpg'),
    alt: 'Kings Taxi Timeless Ethiopian Heritage & Tourism',
  },
  {
    id: 'ad-4',
    remoteUri:
      'https://res.cloudinary.com/oxzqogef/image/upload/v1793899787/Gemini_Generated_Image_59zpk459zpk459zp.jpg',
    localSource: require('../../../assets/advertising/landing/ad-slide-4.jpg'),
    alt: 'Kings Taxi Premium Fleet & Professional Chauffeurs',
  },
];

export const LandingHeroCarousel: React.FC = () => {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isInteracting = useRef(false);

  // Exact preserved card dimensions
  const cardWidth = Math.min(width - 32, 440);
  const cardHeight = 200;

  // Auto-play timer (4.5s transition)
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isInteracting.current && scrollRef.current) {
        const nextIndex = (activeIndex + 1) % LANDING_AD_SLIDES.length;
        scrollRef.current.scrollTo({
          x: nextIndex * cardWidth,
          animated: true,
        });
        setActiveIndex(nextIndex);
      }
    }, 4500);

    return () => clearInterval(timer);
  }, [activeIndex, cardWidth]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardWidth);
    if (index >= 0 && index < LANDING_AD_SLIDES.length && index !== activeIndex) {
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
        contentContainerStyle={styles.scrollContent}
        style={{ width: cardWidth, height: cardHeight }}
      >
        {LANDING_AD_SLIDES.map((slide) => (
          <View
            key={slide.id}
            style={[
              styles.slideCard,
              { width: cardWidth, height: cardHeight },
            ]}
          >
            <Image
              source={slide.localSource || { uri: slide.remoteUri }}
              style={styles.cardImage}
              resizeMode="cover"
              accessibilityLabel={slide.alt}
            />
          </View>
        ))}
      </ScrollView>

      {/* 4 Pagination Indicators */}
      <View style={styles.indicatorsRow}>
        {LANDING_AD_SLIDES.map((_, idx) => {
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
              accessibilityLabel={`Slide ${idx + 1} of ${LANDING_AD_SLIDES.length}`}
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
  scrollContent: {
    alignItems: 'center',
  },
  slideCard: {
    backgroundColor: colors.white,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    shadowColor: colors.primaryGold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
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
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primaryGold,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.border,
  },
});
