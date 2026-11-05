import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  ShieldAlert,
  Phone,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton } from '../../src/components';
import { useTranslation } from '../../src/i18n';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How do I pay with Telebirr or CBE Birr?',
    answer:
      'Select your preferred gateway on the payment screen. When you tap Pay, Kings Taxi will seamlessly open the gateway confirmation or SMS prompt to finalize the transaction securely.',
  },
  {
    question: 'How does full-contract transportation work for heritage tours?',
    answer:
      'You can select multiple destinations (such as Gondar castles, Fasilides Bath, and Debre Berhan) and request a dedicated vehicle with an experienced driver for 1 or more days. An estimated quotation is generated immediately.',
  },
  {
    question: 'What is the hotel cancellation policy?',
    answer:
      'Hotel reservations adhere strictly to each hotel’s verified terms. Most properties offer free cancellation up to 24–48 hours before check-in. You can check individual policies on each hotel’s detail page.',
  },
  {
    question: 'What if GPS permission is disabled on my phone?',
    answer:
      'Kings Taxi does not block you if GPS is unavailable. You can easily tap the pickup or destination field and select from popular landmarks, or search by name.',
  },
];

export default function SupportScreen() {
  const { t } = useTranslation(['profile', 'common', 'navigation']);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('navigation:titles.support')} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Safety Alert Box */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyIconCircle}>
            <ShieldAlert size={28} color="#FFFFFF" />
          </View>
          <View style={styles.emergencyTextWrap}>
            <Text style={styles.emergencyTitle}>Emergency Dispatch & Assistance</Text>
            <Text style={styles.emergencyDesc}>
              In an immediate emergency during a trip, tap below to contact national emergency services or Kings Taxi 24/7 Security.
            </Text>
          </View>
          <View style={styles.emergencyButtonsRow}>
            <TouchableOpacity
              style={styles.sosButton}
              onPress={() => Linking.openURL('tel:991')}
            >
              <Text style={styles.sosButtonText}>Call Police (991)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ambulanceButton}
              onPress={() => Linking.openURL('tel:907')}
            >
              <Text style={styles.ambulanceButtonText}>Ambulance (907)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 24/7 Customer Care Channels */}
        <View style={styles.supportChannelsCard}>
          <Text style={styles.sectionTitle}>Contact Kings Taxi Support</Text>
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => Linking.openURL('tel:+251911000000')}
          >
            <Phone size={20} color={theme.colors.secondary} />
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>24/7 Passenger Hotline</Text>
              <Text style={styles.channelValue}>+251 91 100 0000</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => Linking.openURL('mailto:support@kingstaxi.et')}
          >
            <MessageSquare size={20} color={theme.colors.secondary} />
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>Support Email & Inquiry</Text>
              <Text style={styles.channelValue}>support@kingstaxi.et</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Frequently Asked Questions */}
        <Text style={styles.sectionHeaderTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqsCard}>
          {faqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={styles.faqItem}>
                <TouchableOpacity
                  style={styles.faqHeader}
                  onPress={() => toggleFaq(index)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                  {isExpanded ? (
                    <ChevronUp size={18} color={theme.colors.textMuted} />
                  ) : (
                    <ChevronDown size={18} color={theme.colors.textMuted} />
                  )}
                </TouchableOpacity>
                {isExpanded && (
                  <Text style={styles.faqAnswer}>{faq.answer}</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
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
    paddingBottom: theme.spacing.xxl,
  },
  emergencyCard: {
    backgroundColor: '#991B1B',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  emergencyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  emergencyTextWrap: {
    marginBottom: theme.spacing.md,
  },
  emergencyTitle: {
    ...theme.typography.h3,
    color: '#FFFFFF',
  },
  emergencyDesc: {
    ...theme.typography.caption,
    color: '#FEE2E2',
    marginTop: 4,
    lineHeight: 18,
  },
  emergencyButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sosButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  sosButtonText: {
    ...theme.typography.captionBold,
    color: '#991B1B',
  },
  ambulanceButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  ambulanceButtonText: {
    ...theme.typography.captionBold,
    color: '#FFFFFF',
  },
  supportChannelsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadows.subtle,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
  },
  channelValue: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  sectionHeaderTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  faqsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.subtle,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  faqAnswer: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
});
