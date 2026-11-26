import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  LifeBuoy,
  Send,
  AlertCircle,
  ImagePlus,
  X,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components';
import {
  PassengerSupportService,
  SupportAttachmentInput,
  SupportCategory,
  SupportPriority,
} from '../../src/services/passengerSupport.service';
import { PassengerBookingsService } from '../../src/services/passengerBookings.service';
import { UnifiedBookingItem } from '../../src/types';

interface CategoryOption {
  value: SupportCategory;
  label: string;
  description: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    value: 'RIDE_ISSUE',
    label: 'Ride or Trip Issue',
    description: 'Pickup delays, route diversion, or meter fare mismatch',
  },
  {
    value: 'PAYMENT_ISSUE',
    label: 'Payment & Billing',
    description: 'Telebirr, Chapa, or CBE Birr deduction inquiry',
  },
  {
    value: 'BOOKING_ISSUE',
    label: 'Hotel or Tour Booking',
    description: 'Hotel room, airport transfer, or heritage tour reservation',
  },
  {
    value: 'DRIVER_BEHAVIOR',
    label: 'Driver Conduct',
    description: 'Professionalism, driving safety, or vehicle condition',
  },
  {
    value: 'SAFETY_CONCERN',
    label: 'Safety Concern',
    description: 'Urgent security hazard, lost property, or route safety',
  },
  {
    value: 'ACCOUNT_ISSUE',
    label: 'Account & Profile',
    description: 'Phone update, login access, or profile data inquiry',
  },
  {
    value: 'APP_TECHNICAL_ISSUE',
    label: 'App Technical Bug',
    description: 'Application error, crash, or map loading difficulty',
  },
  {
    value: 'OTHER',
    label: 'General Inquiry',
    description: 'Any other question or operational feedback',
  },
];

const PRIORITIES: { value: SupportPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: '#6B7280' },
  { value: 'MEDIUM', label: 'Medium', color: '#B45309' },
  { value: 'HIGH', label: 'High', color: '#C2410C' },
  { value: 'URGENT', label: 'Urgent', color: '#991B1B' },
];

export default function CreateSupportTicketScreen() {
  const router = useRouter();

  const [category, setCategory] = useState<SupportCategory>('RIDE_ISSUE');
  const [priority, setPriority] = useState<SupportPriority>('MEDIUM');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [bookingType, setBookingType] = useState<string | undefined>(undefined);
  const [recentBookings, setRecentBookings] = useState<UnifiedBookingItem[]>([]);
  const [attachments, setAttachments] = useState<Array<SupportAttachmentInput & { previewUri: string }>>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    PassengerBookingsService.getBookingsHistory({ limit: 6 })
      .then((res) => {
        if (res.success && res.data?.items) {
          setRecentBookings(res.data.items);
        }
      })
      .catch(() => {});
  }, []);

  const handlePickImage = async () => {
    if (attachments.length >= 4) {
      setErrorMessage('Maximum 4 screenshots can be attached.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrorMessage('Photo library permission is required to attach screenshots.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setErrorMessage('Could not read image data. Please try another image.');
      return;
    }
    const mimeType =
      asset.mimeType === 'image/png'
        ? 'image/png'
        : asset.mimeType === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg';
    setAttachments((prev) => [
      ...prev,
      {
        previewUri: asset.uri,
        fileData: `data:${mimeType};base64,${asset.base64}`,
        mimeType,
        originalFilename: asset.fileName || `support_${Date.now()}.jpg`,
      },
    ]);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < 3) {
      setErrorMessage('Please enter a descriptive subject (at least 3 characters).');
      return;
    }
    if (trimmedMessage.length < 5) {
      setErrorMessage('Please explain your issue in detail (at least 5 characters).');
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const trimmedBooking = bookingRef.trim();

    setSubmitting(true);
    try {
      const createdTicket = await PassengerSupportService.createTicket({
        category,
        priority,
        subject: trimmedSubject,
        message: trimmedMessage,
        bookingId: uuidRegex.test(trimmedBooking) ? trimmedBooking : undefined,
        bookingType: bookingType || (uuidRegex.test(trimmedBooking) ? 'BOOKING' : undefined),
        attachments: attachments.map(({ previewUri: _p, ...rest }) => rest),
      });

      // Navigate to the newly created ticket conversation
      router.replace(`/support/${createdTicket.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Submit Support Ticket" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro banner */}
        <View style={styles.introCard}>
          <LifeBuoy size={24} color="#A36B31" />
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Kings Taxi Customer Assistance</Text>
            <Text style={styles.introSubtitle}>
              Our dispatch specialists review tickets 24/7. Please select the topic below.
            </Text>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <AlertCircle size={18} color="#991B1B" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* 1. Category Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.groupLabel}>1. Select Category *</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && styles.categoryLabelSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                  <Text style={styles.categoryDesc} numberOfLines={2}>
                    {cat.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 2. Priority Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.groupLabel}>2. Urgency Level</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const isSelected = priority === p.value;
              return (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityPill,
                    isSelected && { backgroundColor: p.color, borderColor: p.color },
                  ]}
                  onPress={() => setPriority(p.value)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      isSelected && { color: '#FFFFFF', fontWeight: '800' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Subject Line */}
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.groupLabel}>3. Subject Line *</Text>
            <Text style={styles.charCount}>{subject.length}/160</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Telebirr deducted twice for trip from Piazza to Fasiledes"
            placeholderTextColor="#9CA3AF"
            value={subject}
            onChangeText={setSubject}
            maxLength={160}
          />
        </View>

        {/* 4. Booking Reference (Optional) */}
        <View style={styles.formGroup}>
          <Text style={styles.groupLabel}>4. Link a Recent Ride or Booking (Optional)</Text>
          {recentBookings.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {recentBookings.map((b) => {
                const selected = bookingRef === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.bookingChip,
                      selected && styles.bookingChipSelected,
                    ]}
                    onPress={() => {
                      if (selected) {
                        setBookingRef('');
                        setBookingType(undefined);
                      } else {
                        setBookingRef(b.id);
                        setBookingType(b.type);
                      }
                    }}
                  >
                    <Text style={[styles.bookingChipTitle, selected && { color: '#FFFFFF' }]} numberOfLines={1}>
                      {b.type} • {b.title}
                    </Text>
                    <Text style={[styles.bookingChipSub, selected && { color: '#FDE68A' }]} numberOfLines={1}>
                      {b.reference}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
          <TextInput
            style={styles.textInput}
            placeholder="Or paste Ride / Booking UUID"
            placeholderTextColor="#9CA3AF"
            value={bookingRef}
            onChangeText={(val) => {
              setBookingRef(val);
              if (!val.trim()) setBookingType(undefined);
            }}
            autoCapitalize="none"
          />
        </View>

        {/* 5. Detailed Message */}
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.groupLabel}>5. Detailed Description *</Text>
            <Text style={styles.charCount}>{message.length}/5000</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Please provide specific details (trip date, route, vehicle details, driver name) to help us resolve your issue swiftly..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            maxLength={5000}
            textAlignVertical="top"
          />
        </View>

        {/* 6. Optional Screenshot Attachments */}
        <View style={styles.formGroup}>
          <Text style={styles.groupLabel}>6. Screenshots / Receipts (Optional)</Text>
          <View style={styles.attachmentRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickImage} activeOpacity={0.8}>
              <ImagePlus size={18} color="#A36B31" />
              <Text style={styles.attachBtnText}>Add Image ({attachments.length}/4)</Text>
            </TouchableOpacity>
          </View>
          {attachments.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {attachments.map((att, idx) => (
                <View key={`${att.previewUri}-${idx}`} style={styles.thumbWrap}>
                  <Image source={{ uri: att.previewUri }} style={styles.thumbImg} />
                  <TouchableOpacity
                    style={styles.thumbRemove}
                    onPress={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <X size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Submit Support Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bookingChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 210,
  },
  bookingChipSelected: {
    backgroundColor: '#A36B31',
    borderColor: '#A36B31',
  },
  bookingChipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  bookingChipSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5D3B3',
    backgroundColor: '#FFFBF2',
  },
  attachBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78350F',
  },
  thumbWrap: {
    position: 'relative',
    marginRight: 10,
  },
  thumbImg: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  introCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  introTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#502D0A',
  },
  introSubtitle: {
    fontSize: 12,
    color: '#7B5836',
    marginTop: 2,
    lineHeight: 16,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: theme.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#502D0A',
    marginBottom: 6,
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  categoriesGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48.5%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  categoryCardSelected: {
    borderColor: theme.colors.brightGold,
    backgroundColor: theme.colors.paleGold,
    borderWidth: 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  categoryLabelSelected: {
    color: '#502D0A',
  },
  categoryDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 14,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  textInput: {
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.deepChocolate,
  },
  textArea: {
    minHeight: 120,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: theme.colors.antiqueGold,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: theme.spacing.sm,
    ...theme.shadows.cardGold,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

