import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Switch,
  Share,
  Linking,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Globe,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Star,
  Info,
  Share2,
  KeyRound,
  Calendar,
  CheckCircle2,
  X,
  Sparkles,
  Camera,
  Trash2,
  Fingerprint,
  Edit2,
  AlertCircle,
  Lock,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { colors } from '../../src/theme/colors';
import { ConfirmationModal, PrimaryButton } from '../../src/components';
import { useAuthStore, useSettingsStore } from '../../src/stores';
import { useTranslation, SUPPORTED_LANGUAGES } from '../../src/i18n';
import { APP_CONFIG, SHARE_APP_MESSAGE } from '../../src/config/appLinks';
import {
  BiometricAuthService,
  BiometricCapability,
} from '../../src/services/biometricAuth.service';
import { PassengerProfileService } from '../../src/services/passengerProfile.service';

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation(['profile', 'common']);
  const { user, token, logout, updateProfile } = useAuthStore();
  const { language, biometricLoginEnabled, setBiometricLoginEnabled } = useSettingsStore();

  // Modals state
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  // Biometric capability state
  const [biometricCapability, setBiometricCapability] = useState<BiometricCapability>({
    hasHardware: false,
    isEnrolled: false,
    canAuthenticate: false,
    biometricType: 'NONE',
    label: 'Biometric Login',
  });

  // Profile picture upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Editable personal info state
  const [editFullName, setEditFullName] = useState(user?.fullName || '');
  const [editCity, setEditCity] = useState(user?.city || 'Gondar City');
  const [editEmergencyName, setEditEmergencyName] = useState(user?.emergencyContactName || '');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState(user?.emergencyContactPhone || '');
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  // 2-Step contact verification state (for email or phone update)
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [newContactValue, setNewContactValue] = useState('');
  const [contactStep, setContactStep] = useState<'INPUT' | 'OTP'>('INPUT');
  const [contactSessionId, setContactSessionId] = useState('');
  const [contactOtpCode, setContactOtpCode] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactDevOtp, setContactDevOtp] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [localAvatarCache, setLocalAvatarCache] = useState<string | null>(null);

  // Initial synchronization with PostgreSQL backend & native biometric inspection
  useEffect(() => {
    // 1. Inspect device biometric capabilities
    BiometricAuthService.checkCapability().then((cap) => {
      setBiometricCapability(cap);
    });

    // 2. Load locally cached avatar image ONLY for the authenticated passenger
    if (user?.id) {
      AsyncStorage.getItem(`@kings_taxi_local_avatar_${user.id}`)
        .then((cached) => {
          if (cached) setLocalAvatarCache(cached);
          else setLocalAvatarCache(null);
        })
        .catch(() => setLocalAvatarCache(null));
    } else {
      setLocalAvatarCache(null);
    }

    // 3. Fetch fresh profile from central backend
    if (token) {
      PassengerProfileService.getProfile(token).then((res) => {
        if (res.success && res.data) {
          const freshAvatar = res.data.profileImage || res.data.avatarUrl;
          if (freshAvatar) {
            setAvatarLoadError(false);
            if (user?.id) {
              AsyncStorage.setItem(`@kings_taxi_local_avatar_${user.id}`, freshAvatar).catch(() => null);
            }
          } else {
            setLocalAvatarCache(null);
            if (user?.id) {
              AsyncStorage.removeItem(`@kings_taxi_local_avatar_${user.id}`).catch(() => null);
            }
          }
          updateProfile({
            fullName: res.data.fullName,
            email: res.data.email,
            phone: res.data.phone || res.data.phoneNumber,
            city: res.data.city,
            avatarUrl: freshAvatar || undefined,
            profileImage: freshAvatar || null,
            emergencyContactName: res.data.emergencyContactName,
            emergencyContactPhone: res.data.emergencyContactPhone,
            biometricEnabled: res.data.biometricEnabled,
          });
          setEditFullName(res.data.fullName || '');
          setEditCity(res.data.city || 'Gondar City');
          setEditEmergencyName(res.data.emergencyContactName || '');
          setEditEmergencyPhone(res.data.emergencyContactPhone || '');
        }
      });
    }
  }, [token, user?.id]);

  const handleLogout = () => {
    setShowLogoutModal(false);
    setLocalAvatarCache(null);
    setAvatarLoadError(false);
    logout();
    router.replace('/(auth)/welcome');
  };

  const getLanguageLabel = (lang: string) => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
    return found ? `${found.nativeName} (${found.name})` : 'English';
  };

  // ---------------------------------------------------------------------------
  // Profile Picture Upload to Cloudinary & Cross-Platform Picker
  // ---------------------------------------------------------------------------
  const pickImageWebFallback = async (): Promise<ImagePicker.ImagePickerResult> => {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve({ canceled: true, assets: null });
        return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        try {
          document.body.removeChild(input);
        } catch {}
        if (!file) {
          resolve({ canceled: true, assets: null });
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            canceled: false,
            assets: [
              {
                uri: reader.result as string,
                width: 0,
                height: 0,
                fileName: file.name,
                fileSize: file.size,
                type: 'image',
                mimeType: file.type,
              },
            ],
          });
        };
        reader.onerror = () => resolve({ canceled: true, assets: null });
        reader.readAsDataURL(file);
      };

      input.click();
    });
  };

  const handlePickImage = async () => {
    setShowImagePickerModal(false);

    try {
      let result: ImagePicker.ImagePickerResult;

      if (Platform.OS === 'web') {
        try {
          if (ImagePicker && typeof ImagePicker.launchImageLibraryAsync === 'function') {
            result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
          } else {
            result = await pickImageWebFallback();
          }
        } catch {
          result = await pickImageWebFallback();
        }
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Photo Library Access Required',
            'Please grant access to your photo library to select a profile picture.'
          );
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedAsset = result.assets[0];
      setIsUploadingImage(true);
      setAvatarLoadError(false);
      setLocalAvatarCache(selectedAsset.uri);
      if (user?.id) {
        await AsyncStorage.setItem(`@kings_taxi_local_avatar_${user.id}`, selectedAsset.uri).catch(() => null);
      }

      const uploadRes = await PassengerProfileService.uploadProfilePicture(
        selectedAsset.uri,
        token,
        selectedAsset.fileSize,
        user?.id
      );

      if (uploadRes.success && uploadRes.data) {
        const newUrl = uploadRes.data.profileImage || uploadRes.data.avatarUrl || selectedAsset.uri;
        setLocalAvatarCache(newUrl);
        if (user?.id) {
          await AsyncStorage.setItem(`@kings_taxi_local_avatar_${user.id}`, newUrl).catch(() => null);
        }
        updateProfile({
          avatarUrl: newUrl,
          profileImage: newUrl,
        });
        Alert.alert('Profile Picture Updated', 'Your photo was securely updated and saved.');
      } else {
        Alert.alert('Upload Failed', uploadRes.error || 'Could not upload image. Please try again.');
      }
    } catch (err: any) {
      console.warn('Image picker error:', err);
      Alert.alert('Upload Error', err.message || 'An unexpected error occurred during photo selection.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    setShowImagePickerModal(false);
    setIsUploadingImage(true);
    setLocalAvatarCache(null);
    setAvatarLoadError(false);
    if (user?.id) {
      await AsyncStorage.removeItem(`@kings_taxi_local_avatar_${user.id}`).catch(() => null);
    }
    await AsyncStorage.removeItem('@kings_taxi_local_avatar').catch(() => null);

    try {
      const res = await PassengerProfileService.removeProfileImage(token);
      if (res.success) {
        updateProfile({
          avatarUrl: undefined,
          profileImage: null,
        });
        Alert.alert('Profile Picture Removed', 'Your profile picture has been reset to default.');
      } else {
        Alert.alert('Error', res.error || 'Could not remove profile picture.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to remove picture.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Biometric Preference Toggle
  // ---------------------------------------------------------------------------
  const handleToggleBiometrics = async (targetValue: boolean) => {
    if (targetValue) {
      // Enabling Biometrics
      if (!biometricCapability.hasHardware || !biometricCapability.isEnrolled) {
        Alert.alert(
          'Biometrics Not Enrolled',
          `Your device does not have biometric hardware active or enrolled. Please set up ${biometricCapability.label} in your phone device settings first.`
        );
        return;
      }

      const res = await BiometricAuthService.enableBiometricLogin(user?.id || '', token);
      if (res.success) {
        setBiometricLoginEnabled(true);
        Alert.alert(
          'Biometric Login Active',
          `${biometricCapability.label} is now enabled for secure, passwordless app re-entry.`
        );
      } else {
        Alert.alert('Biometric Setup Cancelled', res.error || 'Identity verification did not succeed.');
      }
    } else {
      // Disabling Biometrics
      await BiometricAuthService.disableBiometricLogin(token);
      setBiometricLoginEnabled(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save Editable Personal Information
  // ---------------------------------------------------------------------------
  const handleSavePersonalInfo = async () => {
    if (!editFullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required.');
      return;
    }

    setIsSavingInfo(true);
    setSaveSuccessMessage('');

    try {
      const res = await PassengerProfileService.updateProfile(
        {
          fullName: editFullName.trim(),
          city: editCity.trim(),
          emergencyContactName: editEmergencyName.trim() || null,
          emergencyContactPhone: editEmergencyPhone.trim() || null,
        },
        token
      );

      if (res.success && res.data) {
        updateProfile({
          fullName: res.data.fullName,
          city: res.data.city,
          emergencyContactName: res.data.emergencyContactName,
          emergencyContactPhone: res.data.emergencyContactPhone,
        });
        setSaveSuccessMessage('Personal information updated successfully!');
        setTimeout(() => {
          setShowPersonalInfoModal(false);
          setSaveSuccessMessage('');
        }, 1200);
      } else {
        Alert.alert('Update Failed', res.error || 'Failed to save changes.');
      }
    } catch (err: any) {
      Alert.alert('Update Error', err.message || 'Unable to save personal information.');
    } finally {
      setIsSavingInfo(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2-Step Email & Phone Contact Change Verification
  // ---------------------------------------------------------------------------
  const startContactChange = (type: 'email' | 'phone') => {
    setContactType(type);
    setNewContactValue('');
    setContactStep('INPUT');
    setContactError('');
    setContactSessionId('');
    setContactOtpCode('');
    setContactDevOtp(null);
    setShowContactModal(true);
  };

  const handleInitiateContactChange = async () => {
    if (!newContactValue.trim()) {
      setContactError(
        contactType === 'email' ? 'Please enter a valid email address' : 'Please enter a valid phone number'
      );
      return;
    }

    setContactLoading(true);
    setContactError('');

    try {
      const res = await PassengerProfileService.initiateContactChange(
        {
          type: contactType,
          newContact: newContactValue.trim(),
        },
        token
      );

      if (res.success && res.data?.sessionId) {
        setContactSessionId(res.data.sessionId);
        setContactDevOtp(res.data.devOtp || null);
        setContactStep('OTP');
      } else {
        setContactError(res.error || 'Could not send verification code.');
      }
    } catch (err: any) {
      setContactError(err.message || 'Failed to initiate contact verification.');
    } finally {
      setContactLoading(false);
    }
  };

  const handleVerifyContactChange = async () => {
    if (!contactOtpCode || contactOtpCode.trim().length !== 6) {
      setContactError('Please enter the 6-digit verification code.');
      return;
    }

    setContactLoading(true);
    setContactError('');

    try {
      const res = await PassengerProfileService.verifyContactChange(
        {
          sessionId: contactSessionId,
          code: contactOtpCode.trim(),
        },
        token
      );

      if (res.success && res.data) {
        if (contactType === 'email') {
          updateProfile({ email: res.data.email });
        } else {
          updateProfile({ phone: res.data.phone || res.data.phoneNumber });
        }
        setShowContactModal(false);
        Alert.alert(
          'Contact Updated',
          `Your ${contactType === 'email' ? 'email address' : 'phone number'} has been successfully updated.`
        );
      } else {
        setContactError(res.error || 'Verification code is invalid or expired.');
      }
    } catch (err: any) {
      setContactError(err.message || 'Verification failed. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  // Section 3: Share App Feature
  const handleShareApp = async () => {
    try {
      await Share.share({
        title: 'Kings Taxi Passengers App',
        message: SHARE_APP_MESSAGE,
        url: APP_CONFIG.downloadUrl,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  // Section 4: Rate App Feature
  const handleRateApp = async () => {
    if (APP_CONFIG.isStorePublished) {
      const storeUrl =
        Platform.OS === 'android'
          ? `market://details?id=${APP_CONFIG.playStoreId}`
          : `itms-apps://itunes.apple.com/app/id${APP_CONFIG.appStoreId}?action=write-review`;
      const fallbackUrl =
        Platform.OS === 'android' ? APP_CONFIG.playStoreUrl : APP_CONFIG.appStoreUrl;

      try {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
        } else {
          await Linking.openURL(fallbackUrl);
        }
      } catch {
        await Linking.openURL(fallbackUrl);
      }
    } else {
      setShowRateModal(true);
    }
  };

  const avatarDisplayUri = (!avatarLoadError && user?.profileImage)
    ? user.profileImage
    : (!avatarLoadError && user?.avatarUrl)
    ? user.avatarUrl
    : (user?.id ? localAvatarCache : null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card with Photo Upload Badge */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrap}>
              {isUploadingImage ? (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color={colors.primaryGold} />
                </View>
              ) : avatarDisplayUri ? (
                <Image
                  source={{ uri: avatarDisplayUri }}
                  style={styles.avatarImage}
                  onError={() => {
                    console.warn('[Profile] Remote avatar image failed to load, falling back to local cache');
                    setAvatarLoadError(true);
                  }}
                />
              ) : (
                <User size={36} color={theme.colors.secondary} />
              )}
            </View>

            {/* Camera Edit Badge */}
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={() => setShowImagePickerModal(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
            >
              <Camera size={14} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.profileDetails}>
            <Text style={styles.userName}>{user?.fullName || 'Valued Passenger'}</Text>
            <Text style={styles.userPhone}>{user?.phone || '+251 9X XXX XXXX'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.ratingBadge}>
                <Star size={12} color={theme.colors.primaryDark} fill={theme.colors.primary} />
                <Text style={styles.ratingText}>{user?.rating || 5.0} ★</Text>
              </View>
              <Text style={styles.tripsCount}>{t('verifiedPassenger')}</Text>
            </View>
          </View>
        </View>

        {/* 1. Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.account')}</Text>

          {/* Editable Personal Information */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => {
              setEditFullName(user?.fullName || '');
              setEditCity(user?.city || 'Gondar City');
              setEditEmergencyName(user?.emergencyContactName || '');
              setEditEmergencyPhone(user?.emergencyContactPhone || '');
              setSaveSuccessMessage('');
              setShowPersonalInfoModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('items.personalInfo')}
          >
            <View style={styles.menuIconCircle}>
              <User size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.personalInfo')}</Text>
              <Text style={styles.menuSubtitle}>Name, emergency contact & city</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* My Bookings */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(tabs)/bookings')}
            accessibilityRole="button"
            accessibilityLabel={t('items.myBookings')}
          >
            <View style={styles.menuIconCircle}>
              <Calendar size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.myBookings')}</Text>
              <Text style={styles.menuSubtitle}>Rides, hotel stays & tours</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Reset Password */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(auth)/forgot-password')}
            accessibilityRole="button"
            accessibilityLabel={t('items.resetPassword')}
          >
            <View style={styles.menuIconCircle}>
              <KeyRound size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.resetPassword')}</Text>
              <Text style={styles.menuSubtitle}>Recover via email or Telegram</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Payment Methods */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/payments/checkout')}
            accessibilityRole="button"
            accessibilityLabel={t('items.paymentMethods')}
          >
            <View style={styles.menuIconCircle}>
              <CreditCard size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.paymentMethods')}</Text>
              <Text style={styles.menuSubtitle}>Telebirr, CBE Birr, Chapa</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 2. Kings Taxi Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.kingsTaxi')}</Text>

          {/* About Us */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/profile/about')}
            accessibilityRole="button"
            accessibilityLabel={t('items.aboutUs')}
          >
            <View style={styles.menuIconCircle}>
              <Info size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.aboutUs')}</Text>
              <Text style={styles.menuSubtitle}>Vision, Mission & Ardab Tech Credits</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Share App */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleShareApp}
            accessibilityRole="button"
            accessibilityLabel={t('items.shareApp')}
          >
            <View style={styles.menuIconCircle}>
              <Share2 size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.shareApp')}</Text>
              <Text style={styles.menuSubtitle}>Telegram, WhatsApp, SMS & Email</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Rate App */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleRateApp}
            accessibilityRole="button"
            accessibilityLabel={t('items.rateApp')}
          >
            <View style={styles.menuIconCircle}>
              <Star size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.rateApp')}</Text>
              <Text style={styles.menuSubtitle}>Google Play & App Store</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 3. Preferences & Security Section (SMS/Push Toggles Cleanly Removed) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.preferences')}</Text>

          {/* Language Preferences */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/settings/language')}
            accessibilityRole="button"
            accessibilityLabel={t('items.language')}
          >
            <View style={styles.menuIconCircle}>
              <Globe size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.language')}</Text>
              <Text style={styles.menuSubtitle}>{getLanguageLabel(language)}</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Native Biometric Login Toggle */}
          <View style={styles.menuRow}>
            <View style={styles.menuIconCircle}>
              <Fingerprint size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{biometricCapability.label || 'Biometric Login'}</Text>
              <Text style={styles.menuSubtitle}>
                {biometricLoginEnabled
                  ? 'Active — Fast unlock without password'
                  : 'Fast & secure sign-in'}
              </Text>
            </View>
            <Switch
              value={biometricLoginEnabled}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: theme.colors.border, true: colors.primaryGold }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* 4. Support & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeaderTitle}>{t('sections.support')}</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/support')}
            accessibilityRole="button"
            accessibilityLabel={t('items.helpSupport')}
          >
            <View style={styles.menuIconCircle}>
              <HelpCircle size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.helpSupport')}</Text>
              <Text style={styles.menuSubtitle}>24/7 Safety & Dispatch</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/legal/terms')}
            accessibilityRole="button"
            accessibilityLabel={t('items.termsOfService')}
          >
            <View style={styles.menuIconCircle}>
              <FileText size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.termsOfService')}</Text>
              <Text style={styles.menuSubtitle}>Passenger Agreement & Regulations</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/legal/privacy')}
            accessibilityRole="button"
            accessibilityLabel={t('items.privacyPolicy')}
          >
            <View style={styles.menuIconCircle}>
              <Shield size={18} color={colors.primaryGold} />
            </View>
            <View style={styles.menuTextWrap}>
              <Text style={styles.menuTitle}>{t('items.privacyPolicy')}</Text>
              <Text style={styles.menuSubtitle}>Data Protection & GPS Policies</Text>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('items.logout')}
        >
          <LogOut size={18} color={theme.colors.danger} />
          <Text style={styles.logoutText}>{t('items.logout')}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>
          Kings Taxi Passenger Mobile v1.0.0 (Build 520) • Gondar City, Ethiopia
        </Text>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showLogoutModal}
        title={t('logoutModal.title')}
        message={t('logoutModal.message')}
        confirmTitle={t('logoutModal.confirm')}
        cancelTitle={t('logoutModal.cancel')}
        isDestructive
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Profile Picture Actions Modal */}
      <Modal
        visible={showImagePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImagePickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionSheetCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.infoModalTitle}>Profile Picture</Text>
              <TouchableOpacity onPress={() => setShowImagePickerModal(false)}>
                <X size={20} color={colors.dark} />
              </TouchableOpacity>
            </View>
            <Text style={styles.actionSheetSub}>
              Select a new profile photo to upload directly to Cloudinary.
            </Text>

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: colors.lightGold }]}>
                <Camera size={20} color={colors.deepGold} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.actionOptionTitle}>Choose from Photo Gallery</Text>
                <Text style={styles.menuSubtitle}>Select PNG or JPEG image</Text>
              </View>
            </TouchableOpacity>

            {avatarDisplayUri ? (
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={handleRemoveImage}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <Trash2 size={20} color="#DC2626" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={[styles.actionOptionTitle, { color: '#DC2626' }]}>Remove Photo</Text>
                  <Text style={styles.menuSubtitle}>Restore default passenger avatar</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <PrimaryButton
              title="Cancel"
              onPress={() => setShowImagePickerModal(false)}
              style={styles.modalCloseBtn}
            />
          </View>
        </View>
      </Modal>

      {/* Editable Personal Information Modal */}
      <Modal
        visible={showPersonalInfoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPersonalInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.infoModalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalTopRow}>
              <Text style={styles.infoModalTitle}>Personal Information</Text>
              <TouchableOpacity
                onPress={() => setShowPersonalInfoModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={colors.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {saveSuccessMessage ? (
                <View style={styles.successBanner}>
                  <CheckCircle2 size={16} color="#16A34A" />
                  <Text style={styles.successBannerText}>{saveSuccessMessage}</Text>
                </View>
              ) : null}

              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="Your full legal name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* City / Service Region */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>City / Primary Region</Text>
                <TextInput
                  style={styles.textInput}
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="e.g. Gondar City"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Email Address with 2-Step Change Button */}
              <View style={styles.contactFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <Text style={styles.contactDisplayValue}>{user?.email || 'passenger@kingstaxi.et'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeContactBtn}
                  onPress={() => startContactChange('email')}
                >
                  <Edit2 size={13} color={colors.deepGold} />
                  <Text style={styles.changeContactBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Phone Number with 2-Step Change Button */}
              <View style={styles.contactFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <Text style={styles.contactDisplayValue}>{user?.phone || '+251 91 123 4567'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeContactBtn}
                  onPress={() => startContactChange('phone')}
                >
                  <Edit2 size={13} color={colors.deepGold} />
                  <Text style={styles.changeContactBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Emergency Contact Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Contact Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmergencyName}
                  onChangeText={setEditEmergencyName}
                  placeholder="Family member or trusted contact"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Emergency Contact Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
                <TextInput
                  style={styles.textInput}
                  value={editEmergencyPhone}
                  onChangeText={setEditEmergencyPhone}
                  placeholder="+251 9X XXX XXXX"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Account Status Badge */}
              <View style={styles.verifiedRowContainer}>
                <CheckCircle2 size={18} color="#16A34A" />
                <Text style={styles.verifiedText}>Verified Passenger Profile • Central DB Active</Text>
              </View>

              {/* Save & Cancel Actions */}
              <PrimaryButton
                title={isSavingInfo ? 'Saving...' : 'Save Profile Changes'}
                onPress={handleSavePersonalInfo}
                disabled={isSavingInfo}
                style={styles.saveBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 2-Step OTP Verification Modal for Email/Phone Changes */}
      <Modal
        visible={showContactModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.modalTopRow}>
              <Text style={styles.infoModalTitle}>
                Change {contactType === 'email' ? 'Email Address' : 'Phone Number'}
              </Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <X size={20} color={colors.dark} />
              </TouchableOpacity>
            </View>

            {contactError ? (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{contactError}</Text>
              </View>
            ) : null}

            {contactStep === 'INPUT' ? (
              <View style={{ gap: 14 }}>
                <Text style={styles.stepDescription}>
                  To protect your account against unauthorized changes, a 6-digit verification code will
                  be dispatched to your new {contactType === 'email' ? 'email' : 'phone number'}.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    New {contactType === 'email' ? 'Email Address' : 'Phone Number (+251...)'}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={newContactValue}
                    onChangeText={setNewContactValue}
                    placeholder={
                      contactType === 'email' ? 'new.passenger@example.com' : '+251 9X XXX XXXX'
                    }
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    keyboardType={contactType === 'email' ? 'email-address' : 'phone-pad'}
                  />
                </View>

                <PrimaryButton
                  title={contactLoading ? 'Sending Code...' : 'Send Verification Code'}
                  onPress={handleInitiateContactChange}
                  disabled={contactLoading}
                  style={styles.saveBtn}
                />
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <Text style={styles.stepDescription}>
                  Enter the 6-digit verification code sent to {newContactValue}.
                </Text>

                {contactDevOtp ? (
                  <View style={styles.devOtpBox}>
                    <Text style={styles.devOtpText}>Development OTP: {contactDevOtp}</Text>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>6-Digit OTP Code</Text>
                  <TextInput
                    style={[styles.textInput, styles.otpInput]}
                    value={contactOtpCode}
                    onChangeText={setContactOtpCode}
                    placeholder="123456"
                    placeholderTextColor={colors.textMuted}
                    maxLength={6}
                    keyboardType="number-pad"
                  />
                </View>

                <PrimaryButton
                  title={contactLoading ? 'Verifying...' : 'Verify & Update Contact'}
                  onPress={handleVerifyContactChange}
                  disabled={contactLoading}
                  style={styles.saveBtn}
                />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Rate App Info Modal */}
      <Modal
        visible={showRateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.modalHeaderIcon}>
              <Sparkles size={28} color={colors.primaryGold} />
            </View>
            <Text style={styles.infoModalTitle}>Rate Kings Taxi</Text>
            <Text style={styles.infoModalBody}>
              The Kings Taxi official store listing on Google Play and Apple App Store
              is currently undergoing final review. Rating will become available as soon
              as the public store release is active.
            </Text>
            <Text style={[styles.infoModalBody, { marginTop: 8, fontWeight: '700' }]}>
              Thank you for supporting modern mobility in Gondar City!
            </Text>
            <PrimaryButton
              title="Close"
              onPress={() => setShowRateModal(false)}
              style={styles.modalCloseBtn}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.layout.tabBarContentPadding,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF4DC',
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FAF2D3',
    borderWidth: 2.5,
    borderColor: theme.colors.brightGold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryGold,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    ...theme.typography.h3,
    color: theme.colors.deepChocolate,
    fontWeight: '800',
  },
  userPhone: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  ratingText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  tripsCount: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    ...theme.shadows.cardGold,
  },
  sectionHeaderTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.deepChocolateLight,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF2D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.deepChocolate,
  },
  menuSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  logoutText: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    shadowColor: theme.colors.antiqueGold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  actionSheetCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  actionSheetSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    marginTop: 4,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
  },
  actionOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.deepChocolate,
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.deepChocolate,
  },
  modalHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.lightGold,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  infoModalBody: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalCloseBtn: {
    marginTop: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: colors.warmIvory,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.dark,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 8,
    color: colors.brandDark,
  },
  contactFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warmIvory,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  contactDisplayValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  changeContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.lightGold,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  changeContactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandDark,
  },
  verifiedRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
  },
  verifiedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  saveBtn: {
    marginTop: 8,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  devOtpBox: {
    backgroundColor: colors.lightGold,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  devOtpText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDark,
  },
});
