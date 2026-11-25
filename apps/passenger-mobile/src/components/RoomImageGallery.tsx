import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Camera, Bed, ImageOff, Maximize2 } from 'lucide-react-native';
import { theme } from '../theme';

export interface RoomImageGalleryProps {
  images: string[];
  roomTitle: string;
  onImagePress?: (index: number) => void;
  height?: number;
}

const DEFAULT_HEIGHT = 180;

export const RoomImageGallery: React.FC<RoomImageGalleryProps> = React.memo(
  ({ images, roomTitle, onImagePress, height = DEFAULT_HEIGHT }) => {
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
    const [errorMap, setErrorMap] = useState<Record<number, boolean>>({});
    const flatListRef = useRef<FlatList<string>>(null);

    const validImages = useMemo(
      () =>
        Array.isArray(images)
          ? images.filter((uri) => typeof uri === 'string' && uri.trim().length > 0)
          : [],
      [images]
    );

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
      const width = Math.round(e.nativeEvent.layout.width);
      if (width > 0) {
        setContainerWidth((prev) => (prev === width ? prev : width));
      }
    }, []);

    const handleScrollEnd = useCallback(
      (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (containerWidth <= 0) return;
        const offsetX = e.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / containerWidth);
        const clamped = Math.max(0, Math.min(index, validImages.length - 1));
        setActiveIndex(clamped);
      },
      [containerWidth, validImages.length]
    );

    const handleLoadStart = useCallback((index: number) => {
      setLoadingMap((prev) => (prev[index] === true ? prev : { ...prev, [index]: true }));
    }, []);

    const handleLoadEnd = useCallback((index: number) => {
      setLoadingMap((prev) => (prev[index] === false ? prev : { ...prev, [index]: false }));
    }, []);

    const handleError = useCallback((index: number) => {
      setLoadingMap((prev) => (prev[index] === false ? prev : { ...prev, [index]: false }));
      setErrorMap((prev) => (prev[index] === true ? prev : { ...prev, [index]: true }));
    }, []);

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

    const renderSlide = ({ item, index }: { item: string; index: number }) => {
      const isLoading = loadingMap[index] === true;
      const isError = errorMap[index] === true;

      return (
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => onImagePress?.(index)}
          style={[styles.slide, { width: containerWidth || '100%', height }]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`View ${roomTitle} photo ${index + 1} of ${validImages.length} in full screen`}
          accessibilityHint="Double tap to open full-screen zoomable gallery"
        >
          {isError ? (
            <View style={styles.errorSlide}>
              <ImageOff size={24} color={theme.colors.textMuted} />
              <Text style={styles.errorText}>Image unavailable</Text>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="cover"
                onLoadStart={() => handleLoadStart(index)}
                onLoadEnd={() => handleLoadEnd(index)}
                onError={() => handleError(index)}
              />
              {isLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="small" color={theme.colors.antiqueGold} />
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <View style={[styles.container, { height }]} onLayout={handleLayout}>
        {containerWidth > 0 && (
          <FlatList
            ref={flatListRef}
            data={validImages}
            keyExtractor={(uri, idx) => `${roomTitle}-img-${idx}-${uri.slice(-16)}`}
            renderItem={renderSlide}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
            decelerationRate="fast"
            snapToInterval={containerWidth}
            snapToAlignment="start"
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            getItemLayout={(_, index) => ({
              length: containerWidth,
              offset: containerWidth * index,
              index,
            })}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {/* Top-right position indicator: e.g. 1 / 4 */}
        <View
          style={styles.positionBadge}
          pointerEvents="none"
          accessible
          accessibilityLabel={`Photo ${activeIndex + 1} of ${validImages.length}`}
        >
          <Camera size={11} color="#FFFFFF" />
          <Text style={styles.positionText}>
            {activeIndex + 1} / {validImages.length}
          </Text>
        </View>

        {/* Bottom-left tap to zoom hint */}
        <View style={styles.zoomHintBadge} pointerEvents="none">
          <Maximize2 size={10} color="#FFFFFF" />
          <Text style={styles.zoomHintText}>Tap to zoom</Text>
        </View>

        {/* Bottom-center pagination dots */}
        {validImages.length > 1 && (
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
        )}
      </View>
    );
  }
);

RoomImageGallery.displayName = 'RoomImageGallery';

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  slide: {
    position: 'relative',
    backgroundColor: theme.colors.surfaceMuted,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.55)',
  },
  errorSlide: {
    flex: 1,
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
  positionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  positionText: {
    ...theme.typography.captionBold,
    color: '#FFFFFF',
    fontSize: 11,
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
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
