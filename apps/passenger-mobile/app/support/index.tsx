import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  ShieldAlert,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Clock,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader, PrimaryButton } from '../../src/components';
import { useTranslation } from '../../src/i18n';
import {
  PassengerSupportService,
  SupportTicketSummary,
} from '../../src/services/passengerSupport.service';

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
  const router = useRouter();
  const { t } = useTranslation(['profile', 'common', 'navigation']);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoadError(null);
      const res = await PassengerSupportService.getMyTickets({ limit: 10 });
      setTickets(res.items || []);
    } catch (err: any) {
      setLoadError(err.message || 'Unable to load tickets');
    } finally {
      setLoadingTickets(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const toggleFaq = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Open' };
      case 'IN_PROGRESS':
        return { bg: '#FEF3C7', text: '#92400E', label: 'In Progress' };
      case 'WAITING_FOR_PASSENGER':
        return { bg: '#FFEDD5', text: '#9A3412', label: 'Reply Needed' };
      case 'RESOLVED':
        return { bg: '#DCFCE7', text: '#166534', label: 'Resolved' };
      case 'CLOSED':
        return { bg: '#F3F4F6', text: '#4B5563', label: 'Closed' };
      default:
        return { bg: '#F3F4F6', text: '#4B5563', label: status };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title={t('navigation:titles.support')} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
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

        {/* Primary Support Action: File New Ticket */}
        <View style={styles.newTicketCard}>
          <View style={styles.newTicketHeader}>
            <View style={styles.newTicketIconCircle}>
              <LifeBuoy size={22} color="#502D0A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.newTicketTitle}>Need Help With Your Trip or Booking?</Text>
              <Text style={styles.newTicketSubtitle}>
                Submit a ticket to our dedicated Gondar customer support team.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createTicketButton}
            onPress={() => router.push('/support/create')}
            activeOpacity={0.8}
          >
            <PlusCircle size={18} color="#FFFFFF" />
            <Text style={styles.createTicketButtonText}>Create Support Ticket</Text>
          </TouchableOpacity>
        </View>

        {/* My Support Tickets Section */}
        <View style={styles.ticketsSection}>
          <View style={styles.ticketsSectionHeader}>
            <Text style={styles.sectionHeaderTitle}>My Support Tickets</Text>
            <TouchableOpacity onPress={onRefresh}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {loadingTickets ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading support tickets...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyTicketsBox}>
              <Text style={styles.emptyTicketsTitle}>No active tickets</Text>
              <Text style={styles.emptyTicketsSubtitle}>
                You have not submitted any support inquiries yet.
              </Text>
            </View>
          ) : (
            <View style={styles.ticketsList}>
              {tickets.map((ticket) => {
                const badge = getStatusBadgeStyle(ticket.status);
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={styles.ticketCard}
                    onPress={() => router.push(`/support/${ticket.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.ticketCardHeader}>
                      <View style={styles.ticketNumberWrap}>
                        <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                        {ticket.unreadCount > 0 && (
                          <View style={styles.unreadPill}>
                            <Text style={styles.unreadPillText}>
                              {ticket.unreadCount} NEW
                            </Text>
                          </View>
                        )}
                      </View>
                      <View
                        style={[styles.statusBadge, { backgroundColor: badge.bg }]}
                      >
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.ticketSubject} numberOfLines={1}>
                      {ticket.subject}
                    </Text>

                    {ticket.latestMessage ? (
                      <Text style={styles.ticketSnippet} numberOfLines={2}>
                        {ticket.latestMessage}
                      </Text>
                    ) : null}

                    <View style={styles.ticketFooter}>
                      <View style={styles.timeWrap}>
                        <Clock size={12} color={theme.colors.textMuted} />
                        <Text style={styles.timeText}>
                          {new Date(ticket.lastMessageAt || ticket.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.viewThreadRow}>
                        <Text style={styles.viewThreadText}>View Conversation</Text>
                        <ChevronRight size={14} color={theme.colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 24/7 Customer Care Channels */}
        <View style={styles.supportChannelsCard}>
          <Text style={styles.sectionTitle}>Contact Kings Taxi Support</Text>
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => Linking.openURL('tel:+251911000000')}
          >
            <Phone size={20} color={theme.colors.primary} />
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}>24/7 Passenger Hotline</Text>
              <Text style={styles.channelValue}>+251 91 100 0000</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => Linking.openURL('mailto:support@kingstaxi.et')}
          >
            <MessageSquare size={20} color={theme.colors.primary} />
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
  newTicketCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  newTicketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.sm,
  },
  newTicketIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF2D3',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTicketTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#502D0A',
  },
  newTicketSubtitle: {
    fontSize: 12,
    color: '#7B5836',
    marginTop: 2,
  },
  createTicketButton: {
    backgroundColor: theme.colors.antiqueGold,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
    ...theme.shadows.subtle,
  },
  createTicketButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ticketsSection: {
    marginBottom: theme.spacing.md,
  },
  ticketsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  refreshText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6D3A3',
  },
  loadingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
  },
  emptyTicketsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6D3A3',
  },
  emptyTicketsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#502D0A',
  },
  emptyTicketsSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  ticketsList: {
    gap: theme.spacing.sm,
  },
  ticketCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  ticketCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ticketNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A36B31',
    fontFamily: 'monospace',
  },
  unreadPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unreadPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  ticketSnippet: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3EAD3',
    paddingTop: 8,
    marginTop: 4,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  viewThreadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewThreadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A36B31',
  },
  supportChannelsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  sectionTitle: {
    ...theme.typography.h4,
    color: '#502D0A',
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  sectionHeaderTitle: {
    ...theme.typography.h4,
    color: '#502D0A',
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGold,
    gap: theme.spacing.md,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    ...theme.typography.body,
    fontWeight: '700',
    color: '#502D0A',
  },
  channelValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  faqsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3EAD3',
    paddingVertical: theme.spacing.sm,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    ...theme.typography.body,
    fontWeight: '600',
    color: '#502D0A',
  },
  faqAnswer: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
});
