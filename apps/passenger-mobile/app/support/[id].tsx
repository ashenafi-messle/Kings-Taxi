import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Send,
  Lock,
  Clock,
  User,
  Headphones,
  CheckCheck,
  AlertCircle,
} from 'lucide-react-native';
import { theme } from '../../src/theme';
import { AppHeader } from '../../src/components';
import {
  PassengerSupportService,
  SupportTicketDetail,
} from '../../src/services/passengerSupport.service';

export default function TicketConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const fetchTicket = async () => {
    if (!id || id === 'index' || !UUID_REGEX.test(id)) {
      setLoading(false);
      return;
    }
    try {
      setErrorMessage(null);
      const data = await PassengerSupportService.getTicketDetail(id);
      setTicket(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load ticket conversation');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id === 'index') {
      router.replace('/support');
      return;
    }
    fetchTicket();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTicket();
  };

  const handleSendReply = async () => {
    if (!id || !ticket) return;
    const trimmed = replyText.trim();
    if (!trimmed) return;

    setSendingReply(true);
    try {
      await PassengerSupportService.replyTicket(id, trimmed);
      setReplyText('');
      await fetchTicket();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status: string) => {
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

  const isClosed = ticket?.status === 'CLOSED';

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={ticket?.ticketNumber || 'Ticket Details'}
        showBack
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {loading && !ticket ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading conversation...</Text>
            </View>
          ) : ticket ? (
            <>
              {/* Ticket Overview Card */}
              <View style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                  <Text style={styles.ticketNumberText}>{ticket.ticketNumber}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadge(ticket.status).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusBadge(ticket.status).text },
                      ]}
                    >
                      {getStatusBadge(ticket.status).label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.subjectText}>{ticket.subject}</Text>

                <View style={styles.metaRow}>
                  <Text style={styles.categoryBadge}>
                    {ticket.category.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.metaDate}>
                    Opened: {new Date(ticket.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                {ticket.assignedAdminName ? (
                  <View style={styles.assignedRow}>
                    <Headphones size={14} color="#A36B31" />
                    <Text style={styles.assignedText}>
                      Assigned Agent: {ticket.assignedAdminName}
                    </Text>
                  </View>
                ) : null}

                {ticket.resolutionNotes ? (
                  <View style={styles.resolutionBox}>
                    <Text style={styles.resolutionTitle}>Resolution Summary:</Text>
                    <Text style={styles.resolutionBody}>{ticket.resolutionNotes}</Text>
                  </View>
                ) : null}
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#991B1B" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Message Thread */}
              <View style={styles.threadContainer}>
                {ticket.messages.map((msg) => {
                  const isPassenger = msg.senderType === 'PASSENGER';
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.bubbleWrapper,
                        isPassenger ? styles.bubbleWrapperPassenger : styles.bubbleWrapperAdmin,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isPassenger ? styles.bubblePassenger : styles.bubbleAdmin,
                        ]}
                      >
                        <View style={styles.bubbleHeader}>
                          <View style={styles.senderWrap}>
                            {isPassenger ? (
                              <User size={12} color="#502D0A" />
                            ) : (
                              <Headphones size={12} color="#A36B31" />
                            )}
                            <Text
                              style={[
                                styles.senderName,
                                isPassenger ? styles.senderNamePassenger : styles.senderNameAdmin,
                              ]}
                            >
                              {isPassenger ? 'You' : msg.senderName || 'Kings Customer Care'}
                            </Text>
                          </View>
                          <Text style={styles.msgTime}>
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>

                        <Text style={styles.msgBody}>{msg.message}</Text>

                        {isPassenger ? (
                          <View style={styles.readStatusRow}>
                            <CheckCheck
                              size={12}
                              color={msg.readAt ? '#15803D' : '#9CA3AF'}
                            />
                            <Text style={styles.readStatusText}>
                              {msg.readAt ? 'Seen by Support' : 'Sent'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.loadingBox}>
              <Text style={styles.errorText}>Unable to load ticket details.</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Reply Composer or Closed Notification */}
        {ticket ? (
          isClosed ? (
            <View style={styles.closedBar}>
              <Lock size={16} color="#6B7280" />
              <Text style={styles.closedBarText}>
                This support ticket is closed. Please submit a new inquiry if you require further assistance.
              </Text>
            </View>
          ) : (
            <View style={styles.composerBar}>
              <TextInput
                style={[styles.composerInput, { maxHeight: 100 }]}
                placeholder="Write a reply to support..."
                placeholderTextColor="#9CA3AF"
                value={replyText}
                onChangeText={setReplyText}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!replyText.trim() || sendingReply) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendReply}
                disabled={!replyText.trim() || sendingReply}
                activeOpacity={0.8}
              >
                {sendingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )
        ) : null}
      </KeyboardAvoidingView>
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
    paddingBottom: theme.spacing.lg,
  },
  loadingBox: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  overviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    ...theme.shadows.cardGold,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketNumberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#A36B31',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subjectText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.deepChocolate,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#FAF4E5',
    color: '#502D0A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  assignedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3EAD3',
  },
  assignedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#502D0A',
  },
  resolutionBox: {
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: theme.borderRadius.md,
    padding: 8,
  },
  resolutionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  resolutionBody: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: theme.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
  },
  threadContainer: {
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    width: '100%',
  },
  bubbleWrapperPassenger: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperAdmin: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    padding: 12,
  },
  bubblePassenger: {
    backgroundColor: '#FAF2D3',
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    borderBottomRightRadius: 2,
  },
  bubbleAdmin: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderGold,
    borderBottomLeftRadius: 2,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  senderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
  },
  senderNamePassenger: {
    color: '#502D0A',
  },
  senderNameAdmin: {
    color: '#A36B31',
  },
  msgTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  msgBody: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 19,
  },
  readStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  readStatusText: {
    fontSize: 10,
    color: '#6B7280',
  },
  closedBar: {
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closedBarText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
  composerBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1.5,
    borderTopColor: theme.colors.borderGold,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: theme.colors.borderGold,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.deepChocolate,
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.antiqueGold,
    borderWidth: 1,
    borderColor: theme.colors.brightGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
