import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail, Shield } from 'lucide-react-native';
import { CardShadow, Colors, Radius, Spacing } from '../../src/theme/tokens';
import {
  mockCompletePasswordReset,
  mockRequestPasswordResetOtp,
  mockVerifyResetOtp,
} from '../../src/services/mockDriverService';

type ResetStep = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ResetStep>('EMAIL');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await mockRequestPasswordResetOtp(email);
      if (!res.success) {
        setError(res.error || 'Unable to send simulated OTP.');
        return;
      }
      setMaskedEmail(res.maskedEmail || email);
      setStep('OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await mockVerifyResetOtp(otp);
      if (!res.success) {
        setError(res.error || 'Invalid simulated OTP.');
        return;
      }
      setStep('NEW_PASSWORD');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await mockCompletePasswordReset(newPassword, confirmPassword);
      if (!res.success) {
        setError(res.error || 'Unable to update password.');
        return;
      }
      setStep('SUCCESS');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} style={styles.backRow} hitSlop={10}>
            <ArrowLeft size={18} color={Colors.primaryBlack} />
            <Text style={styles.backText}>Back to Sign In</Text>
          </Pressable>

          <View style={styles.card}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>
                {step === 'EMAIL' && 'STEP 1 OF 3 • REGISTERED EMAIL'}
                {step === 'OTP' && 'STEP 2 OF 3 • SIMULATED OTP'}
                {step === 'NEW_PASSWORD' && 'STEP 3 OF 3 • NEW PASSWORD'}
                {step === 'SUCCESS' && 'COMPLETED'}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 'EMAIL' && (
              <>
                <Text style={styles.title}>Reset Driver Password</Text>
                <Text style={styles.subtitle}>
                  Enter your registered driver email address to preview the OTP recovery workflow (no real email is sent in Phase 1).
                </Text>

                <Text style={styles.label}>Registered Email</Text>
                <View style={styles.inputWrap}>
                  <Mail size={18} color={Colors.secondaryText} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="abebe.kebede@kingstaxi.et"
                    placeholderTextColor={Colors.metallicMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <Pressable
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.cardWhite} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send Simulated OTP</Text>
                  )}
                </Pressable>
              </>
            )}

            {step === 'OTP' && (
              <>
                <Text style={styles.title}>Verify Simulated OTP</Text>
                <Text style={styles.subtitle}>
                  Simulated OTP prepared for <Text style={styles.bold}>{maskedEmail}</Text>. Enter any 6 digits (e.g. 123456) to continue.
                </Text>

                <Text style={styles.label}>6-Digit Verification Code</Text>
                <View style={styles.inputWrap}>
                  <Shield size={18} color={Colors.secondaryText} />
                  <TextInput
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="123456"
                    placeholderTextColor={Colors.metallicMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                <Pressable
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.cardWhite} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify OTP</Text>
                  )}
                </Pressable>

                <Pressable onPress={() => setStep('EMAIL')} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Change Email</Text>
                </Pressable>
              </>
            )}

            {step === 'NEW_PASSWORD' && (
              <>
                <Text style={styles.title}>Set New Password</Text>
                <Text style={styles.subtitle}>
                  Choose a strong permanent password with at least 8 characters.
                </Text>

                <Text style={styles.label}>New Password</Text>
                <View style={[styles.inputWrap, { marginBottom: Spacing.md }]}>
                  <KeyRound size={18} color={Colors.secondaryText} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="At least 8 characters"
                    placeholderTextColor={Colors.metallicMuted}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                    {showNew ? (
                      <EyeOff size={18} color={Colors.secondaryText} />
                    ) : (
                      <Eye size={18} color={Colors.secondaryText} />
                    )}
                  </Pressable>
                </View>

                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrap}>
                  <KeyRound size={18} color={Colors.secondaryText} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Re-enter new password"
                    placeholderTextColor={Colors.metallicMuted}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                    {showConfirm ? (
                      <EyeOff size={18} color={Colors.secondaryText} />
                    ) : (
                      <Eye size={18} color={Colors.secondaryText} />
                    )}
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  style={styles.primaryBtn}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.cardWhite} size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Update Password</Text>
                  )}
                </Pressable>
              </>
            )}

            {step === 'SUCCESS' && (
              <View style={styles.successBox}>
                <CheckCircle2 size={48} color={Colors.success} />
                <Text style={styles.successTitle}>Password Reset Simulated</Text>
                <Text style={styles.successSubtitle}>
                  Your simulated password reset flow completed. In production, this updates your driver account credentials.
                </Text>
                <Pressable
                  onPress={() => router.replace('/(auth)/login')}
                  style={[styles.primaryBtn, { width: '100%' }]}
                >
                  <Text style={styles.primaryBtnText}>Return to Sign In</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.screenBg },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryBlack,
  },
  card: {
    backgroundColor: Colors.cardWhite,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...CardShadow,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    marginBottom: Spacing.md,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondaryText,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primaryBlack,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.secondaryText,
    marginTop: 6,
    marginBottom: Spacing.xl,
  },
  bold: { fontWeight: '700', color: Colors.primaryBlack },
  errorBox: {
    backgroundColor: Colors.errorBg,
    borderWidth: 1,
    borderColor: '#F5C2C2',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primaryBlack,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.screenBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.primaryBlack,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: Colors.primaryBlack,
    borderRadius: Radius.md,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  primaryBtnText: {
    color: Colors.cardWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.secondaryText,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.primaryBlack,
  },
  successSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.secondaryText,
    textAlign: 'center',
  },
});
