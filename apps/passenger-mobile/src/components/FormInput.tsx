import React, { useState, useRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { theme } from '../theme';

export interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FormInput = React.forwardRef<TextInput, FormInputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      isPassword = false,
      secureTextEntry,
      style,
      containerStyle,
      onFocus,
      onBlur,
      autoCorrect = false,
      editable = true,
      selectTextOnFocus = false,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const innerRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => innerRef.current as TextInput);

    const hasError = Boolean(error);

    const handleContainerPress = () => {
      if (editable && innerRef.current) {
        innerRef.current.focus();
      }
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Pressable
          onPress={handleContainerPress}
          style={[
            styles.inputContainer,
            isFocused && styles.focused,
            hasError && styles.errorBorder,
          ]}
        >
          {leftIcon && <View style={styles.iconContainer}>{leftIcon}</View>}
          <TextInput
            ref={innerRef}
            placeholderTextColor={theme.colors.textLight}
            style={[styles.input, style]}
            underlineColorAndroid="transparent"
            autoCorrect={autoCorrect}
            editable={editable}
            selectTextOnFocus={selectTextOnFocus}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            secureTextEntry={isPassword ? !showPassword : secureTextEntry}
            {...props}
          />
          {isPassword ? (
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff size={20} color={theme.colors.textMuted} />
              ) : (
                <Eye size={20} color={theme.colors.textMuted} />
              )}
            </TouchableOpacity>
          ) : (
            rightIcon && <View style={styles.iconContainer}>{rightIcon}</View>
          )}
        </Pressable>
        {hasError ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : helperText ? (
          <Text style={styles.helperText}>{helperText}</Text>
        ) : null}
      </View>
    );
  }
);

FormInput.displayName = 'FormInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.bodyBold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    height: theme.layout.inputHeight,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#FFFDF9',
    borderWidth: 1.5,
    borderColor: '#EDD987',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  focused: {
    borderColor: '#A36B31',
    backgroundColor: '#FFFDF7',
    // Avoid dynamic elevation changes on Android during focus/blur to prevent keyboard disconnection
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#A36B31',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
        }
      : {}),
  },
  errorBorder: {
    borderColor: theme.colors.danger,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text,
    height: '100%',
    paddingVertical: Platform.OS === 'android' ? 0 : undefined,
    textAlignVertical: 'center',
    fontSize: 15,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: 4,
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});
