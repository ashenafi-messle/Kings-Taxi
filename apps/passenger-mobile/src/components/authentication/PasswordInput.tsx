import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Lock, Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../../theme/colors';

interface PasswordInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  isNewPassword?: boolean;
  showStrengthMeter?: boolean;
  style?: ViewStyle;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  isNewPassword = false,
  showStrengthMeter = false,
  style,
}) => {
  const [isSecure, setIsSecure] = useState(true);

  // Compute password strength
  const getStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: colors.border };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: colors.error };
    if (score <= 3) return { score: 2, label: 'Medium', color: colors.warning };
    return { score: 3, label: 'Strong', color: colors.success };
  };

  const strength = getStrength(value);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <Lock size={18} color={colors.secondaryText} style={styles.leftIcon} />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isNewPassword ? 'new-password' : 'password'}
          textContentType={isNewPassword ? 'newPassword' : 'password'}
        />

        <TouchableOpacity
          onPress={() => setIsSecure(!isSecure)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.eyeBtn}
          accessibilityRole="button"
          accessibilityLabel={isSecure ? 'Show password' : 'Hide password'}
        >
          {isSecure ? (
            <EyeOff size={18} color={colors.secondaryText} />
          ) : (
            <Eye size={18} color={colors.primaryGold} />
          )}
        </TouchableOpacity>
      </View>

      {/* Optional Password Strength Indicator */}
      {showStrengthMeter && value.length > 0 && (
        <View style={styles.meterContainer}>
          <View style={styles.meterBars}>
            <View
              style={[
                styles.bar,
                { backgroundColor: strength.score >= 1 ? strength.color : colors.border },
              ]}
            />
            <View
              style={[
                styles.bar,
                { backgroundColor: strength.score >= 2 ? strength.color : colors.border },
              ]}
            />
            <View
              style={[
                styles.bar,
                { backgroundColor: strength.score >= 3 ? strength.color : colors.border },
              ]}
            />
          </View>
          <Text style={[styles.strengthLabel, { color: strength.color }]}>
            {strength.label}
          </Text>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.dark,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: {
    borderColor: colors.error,
  },
  leftIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.dark,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 6,
  },
  meterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  meterBars: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  bar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});

