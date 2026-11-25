import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight, Bed, ImageOff } from 'lucide-react-native';
import { theme } from '../theme';

export interface RoomImageCarouselProps {
  images: string[];
  roomTitle: string;
  height?: number;
}

const DEFAULT_HEIGHT = 190;

interface CarouselSlideProps {
  uri: string;
  width: number;
  height: number;
}

const CarouselSlide: React.FC<CarouselSlideProps> = React.memo(({ uri, width, height }) => {
  const [hasError, setHasError] = useState(false);
  const source = useMemo(() => ({ uri }), [uri]);

  if (hasError) {
    return (
      <View style={[styles.errorSlide, { width, height }]}>
        <ImageOff size={24} color={theme.colors.textMuted} />
        <Text style={styles.errorText}>Image unavailable</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={{ width, height, backgroundColor: theme.colors.surfaceMuted }}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
});

CarouselSlide.displayName = 'CarouselSlide';

export const RoomImageCarousel: React.FC<RoomImageCarouselProps> = React.memo(
  ({ images, roomTitle, height = DEFAULT_HEIGHT }) => {
    const { width: windowWidth } = useWindowDimensions();
    const fallbackWidth = Math.max(260, windowWidth - 36);
    const [measuredWidth, setMeasuredWidth] = useState<number>(0);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const scrollViewRef = useRef<ScrollView>(null);

    const validImages = useMemo(
      () =>
        Array.isArray(images)
          ? images.filter((uri) => typeof uri === 'string' && uri.trim().length > 0)
          : [],
      [images]
    );

    const slideWidth = measuredWidth > 0 ? measuredWidth : fallbackWidth;

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      if (w > 0) {
        setMeasuredWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
      }
    }, []);

    const handleScrollEnd = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (slideWidth <= 0 || validImages.length <= 1) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        const idx = Math.round(offsetX / slideWidth);
        const clamped = Math.max(0, Math.min(idx, validImages.length - 1));
        setActiveIndex((prev) => (prev === clamped ? prev : clamped));
      },
      [slideWidth, validImages.length]
    );

    const goToIndex = useCallback(
      (nextIndex: number) => {
        const clamped = Math.max(0, Math.min(nextIndex, validImages.length - 1));
        setActiveIndex(clamped);
        scrollViewRef.current?.scrollTo({
          x: clamped * slideWidth,
          animated: true,
        });
      },
      [validImages.length, slideWidth]
    );

    if (validImages.length === 0) {
      return (
        <View
          style={[styles.emptyContainer, { height }]}
          accessible
          accessibilityLabel={`${roomTitle} has no uploaded photos`}
        >
          <View style={styles.emptyIconCircle}>
            <Bed size={26} color={theme.colors.antiqueGold} />
          </View>
          <Text style={styles.emptyTitle}>No room photos available</Text>
          <Text style={styles.emptySubtitle}>Standard suite configuration</Text>
        </View>
      );
    }

    if (validImages.length === 1) {
      return (
        <View style={[styles.container, { height }]} onLayout={handleLayout}>
          <CarouselSlide uri={validImages[0]} width={slideWidth} height={height} />
        </View>
      );
    }

    const canGoPrev = activeIndex > 0;
    const canGoNext = activeIndex < validImages.length - 1;

    return (
      <View style={[styles.container, { height }]} onLayout={handleLayout}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          nestedScrollEnabled
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
        >
          {validImages.map((uri, idx) => (
            <CarouselSlide
              key={`${roomTitle}-${idx}-${uri}`}
              uri={uri}
              width={slideWidth}
              height={height}
            />
          ))}
        </ScrollView>

        {/* Left scroll control */}
        {canGoPrev && (
          <TouchableOpacity
            onPress={() => goToIndex(activeIndex - 1)}
            style={[styles.navButton, styles.navButtonLeft]}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Previous photo for ${roomTitle}`}
          >
            <ChevronLeft size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Right scroll control */}
        {canGoNext && (
          <TouchableOpacity
            onPress={() => goToIndex(activeIndex + 1)}
            style={[styles.navButton, styles.navButtonRight]}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Next photo for ${roomTitle}`}
          >
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Top-right position counter */}
        <View style={styles.counterBadge} pointerEvents="none">
          <Text style={styles.counterText}>
            {activeIndex + 1} / {validImages.length}
          </Text>
        </View>

        {/* Bottom-center pagination dots */}
        <View style={styles.dotsContainer} pointerEvents="none">
          {validImages.slice(0, 8).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      </View>
    );
  }
);

RoomImageCarousel.displayName = 'RoomImageCarousel';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  errorSlide: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    gap: 6,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
    gap: 4,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(184, 134, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  emptySubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonLeft: {
    left: 10,
  },
  navButtonRight: {
    right: 10,
  },
  counterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 14,
    backgroundColor: '#FBBF24',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
});
