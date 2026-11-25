import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { X, ImageOff, ZoomIn } from 'lucide-react-native';

export interface FullScreenImageModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  title?: string;
  onClose: () => void;
}

interface ZoomableSlideProps {
  uri: string;
  width: number;
  height: number;
  isActive: boolean;
  onZoomChange: (zoomed: boolean) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

const ZoomableImageSlide: React.FC<ZoomableSlideProps> = React.memo(
  ({ uri, width, height, isActive, onZoomChange }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const wasActiveRef = useRef(isActive);

    // Reset zoom & pan only when an active slide becomes inactive
    useEffect(() => {
      if (wasActiveRef.current && !isActive) {
        scale.value = withTiming(1, { duration: 150 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 150 });
        translateY.value = withTiming(0, { duration: 150 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        onZoomChange(false);
      }
      wasActiveRef.current = isActive;
    }, [isActive, onZoomChange, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

    const notifyZoom = useCallback(
      (zoomed: boolean) => {
        onZoomChange(zoomed);
      },
      [onZoomChange]
    );

    const pinchGesture = Gesture.Pinch()
      .onUpdate((e) => {
        const nextScale = Math.max(MIN_SCALE, Math.min(savedScale.value * e.scale, MAX_SCALE));
        scale.value = nextScale;
        if (nextScale > 1.05) {
          runOnJS(notifyZoom)(true);
        }
      })
      .onEnd(() => {
        if (scale.value <= 1.05) {
          scale.value = withTiming(1, { duration: 180 });
          savedScale.value = 1;
          translateX.value = withTiming(0, { duration: 180 });
          translateY.value = withTiming(0, { duration: 180 });
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          runOnJS(notifyZoom)(false);
        } else {
          savedScale.value = scale.value;
          runOnJS(notifyZoom)(true);
        }
      });

    const panGesture = Gesture.Pan()
      .manualActivation(true)
      .onTouchesMove((_e, stateManager) => {
        if (scale.value > 1.05) {
          stateManager.activate();
        } else {
          stateManager.fail();
        }
      })
      .onUpdate((e) => {
        if (scale.value <= 1.05) return;
        const maxX = ((scale.value - 1) * width) / 2;
        const maxY = ((scale.value - 1) * height) / 2;
        const nextX = savedTranslateX.value + e.translationX;
        const nextY = savedTranslateY.value + e.translationY;
        translateX.value = Math.max(-maxX, Math.min(maxX, nextX));
        translateY.value = Math.max(-maxY, Math.min(maxY, nextY));
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const doubleTapGesture = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        if (scale.value > 1.05) {
          scale.value = withTiming(1, { duration: 220 });
          savedScale.value = 1;
          translateX.value = withTiming(0, { duration: 220 });
          translateY.value = withTiming(0, { duration: 220 });
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
          runOnJS(notifyZoom)(false);
        } else {
          scale.value = withTiming(DOUBLE_TAP_SCALE, { duration: 220 });
          savedScale.value = DOUBLE_TAP_SCALE;
          runOnJS(notifyZoom)(true);
        }
      });

    const composedGesture = Gesture.Simultaneous(
      pinchGesture,
      Gesture.Race(doubleTapGesture, panGesture)
    );

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    return (
      <View style={[styles.slideContainer, { width, height }]}>
        {hasError ? (
          <View style={styles.errorContainer}>
            <ImageOff size={36} color="#94A3B8" />
            <Text style={styles.errorText}>Unable to load image</Text>
          </View>
        ) : (
          <GestureDetector gesture={composedGesture}>
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
              <Animated.Image
                source={{ uri }}
                style={{ width, height: height * 0.78 }}
                resizeMode="contain"
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            </Animated.View>
          </GestureDetector>
        )}

        {isLoading && !hasError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#FBBF24" />
          </View>
        )}
      </View>
    );
  }
);

ZoomableImageSlide.displayName = 'ZoomableImageSlide';

export const FullScreenImageModal: React.FC<FullScreenImageModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  title,
  onClose,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<string>>(null);

  const validImages = useMemo(
    () =>
      Array.isArray(images)
        ? images.filter((uri) => typeof uri === 'string' && uri.trim().length > 0)
        : [],
    [images]
  );

  const safeInitialIndex = Math.max(
    0,
    Math.min(initialIndex, Math.max(0, validImages.length - 1))
  );

  const [activeIndex, setActiveIndex] = useState<number>(safeInitialIndex);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setActiveIndex(safeInitialIndex);
      setIsZoomed(false);
      // Ensure FlatList jumps to tapped image when modal opens
      requestAnimationFrame(() => {
        if (flatListRef.current && validImages.length > 0 && safeInitialIndex < validImages.length) {
          flatListRef.current.scrollToIndex({
            index: safeInitialIndex,
            animated: false,
          });
        }
      });
    }
  }, [visible, safeInitialIndex, validImages.length]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) return;
      const offsetX = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offsetX / width);
      const clamped = Math.max(0, Math.min(idx, validImages.length - 1));
      if (clamped !== activeIndex) {
        setActiveIndex(clamped);
        setIsZoomed(false);
      }
    },
    [width, validImages.length, activeIndex]
  );

  const handleZoomChange = useCallback((zoomed: boolean) => {
    setIsZoomed(zoomed);
  }, []);

  if (!visible || validImages.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        {/* Top Safe-Area Header */}
        <View
          style={[
            styles.headerBar,
            { paddingTop: Math.max(insets.top, 16) + 8 },
          ]}
        >
          <View style={styles.headerTextWrap}>
            {title ? (
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            <Text
              style={styles.counterText}
              accessible
              accessibilityLabel={`Image ${activeIndex + 1} of ${validImages.length}`}
            >
              {activeIndex + 1} / {validImages.length}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close full-screen image gallery"
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Horizontal Swipeable Zoomable Gallery */}
        <FlatList
          ref={flatListRef}
          data={validImages}
          keyExtractor={(uri, idx) => `fullscreen-${idx}-${uri.slice(-16)}`}
          renderItem={({ item, index }) => (
            <ZoomableImageSlide
              uri={item}
              width={width}
              height={height}
              isActive={index === activeIndex}
              onZoomChange={handleZoomChange}
            />
          )}
          horizontal
          pagingEnabled
          scrollEnabled={!isZoomed}
          showsHorizontalScrollIndicator={false}
          bounces={false}
          initialScrollIndex={safeInitialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        {/* Bottom Safe-Area Pagination & Zoom Hint */}
        <View
          style={[
            styles.footerBar,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
          pointerEvents="none"
        >
          {validImages.length > 1 && (
            <View style={styles.dotsRow}>
              {validImages.slice(0, 10).map((_, idx) => (
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
          <View style={styles.hintRow}>
            <ZoomIn size={13} color="rgba(255,255,255,0.72)" />
            <Text style={styles.hintText}>
              {isZoomed
                ? 'Drag to pan • Double-tap to reset'
                : 'Pinch or double-tap to zoom • Swipe for more'}
            </Text>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(10, 10, 15, 0.72)',
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  counterText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(10, 10, 15, 0.72)',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 16,
    backgroundColor: '#FBBF24',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 12,
  },
});
