import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Android Native Text Input Reliability & Build Configuration Audit', () => {
  const passengerDir = path.resolve(__dirname, '../..');
  const appJsonPath = path.join(passengerDir, 'app.json');
  const proguardPath = path.join(passengerDir, 'android/app/proguard-rules.pro');

  it('configures softwareKeyboardLayoutMode to "resize" in app.json', () => {
    const raw = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(raw);
    expect(appConfig.expo.android.softwareKeyboardLayoutMode).toBe('resize');
  });

  it('configures ProGuard extra rules in app.json for React Native TextInput and Props', () => {
    const raw = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(raw);
    const plugins = appConfig.expo.plugins;
    const buildPropsPlugin = plugins.find(
      (p: any) => Array.isArray(p) && p[0] === 'expo-build-properties'
    );
    expect(buildPropsPlugin).toBeDefined();

    const extraRules = buildPropsPlugin[1].android.extraProguardRules;
    expect(extraRules).toContain('com.facebook.react.views.textinput.**');
    expect(extraRules).toContain('com.facebook.react.views.text.**');
    expect(extraRules).toContain('com.facebook.react.uimanager.annotations.ReactProp');
    expect(extraRules).toContain('com.facebook.react.uimanager.annotations.ReactPropGroup');
    expect(extraRules).toContain('com.facebook.react.uimanager.ViewManager');
  });

  it('configures android/app/proguard-rules.pro with comprehensive keep rules for native IME support', () => {
    const content = fs.readFileSync(proguardPath, 'utf8');
    expect(content).toContain('com.facebook.react.views.textinput.**');
    expect(content).toContain('com.facebook.react.views.text.**');
    expect(content).toContain('@com.facebook.react.uimanager.annotations.ReactProp <methods>;');
    expect(content).toContain('@com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;');
    expect(content).toContain('class * extends com.facebook.react.uimanager.ViewManager');
    expect(content).toContain('class * extends com.facebook.react.uimanager.ReactShadowNode');
  });

  it('verifies FormInput.tsx contains pressable touch forwarding and Android text input attributes', () => {
    const formInputSrc = fs.readFileSync(
      path.join(passengerDir, 'src/components/FormInput.tsx'),
      'utf8'
    );
    expect(formInputSrc).toContain('React.forwardRef');
    expect(formInputSrc).toContain('innerRef.current.focus()');
    expect(formInputSrc).toContain('underlineColorAndroid="transparent"');
    expect(formInputSrc).toContain("textAlignVertical: 'center'");
    // Verify dynamic elevation is NOT applied on Android during focus
    expect(formInputSrc).not.toContain('elevation: 2');
  });

  it('verifies PasswordInput.tsx contains pressable touch forwarding, Android padding and valid autoComplete', () => {
    const pwdInputSrc = fs.readFileSync(
      path.join(passengerDir, 'src/components/authentication/PasswordInput.tsx'),
      'utf8'
    );
    expect(pwdInputSrc).toContain('React.forwardRef');
    expect(pwdInputSrc).toContain('innerRef.current.focus()');
    expect(pwdInputSrc).toContain("isNewPassword ? 'new-password' : 'current-password'");
    expect(pwdInputSrc).toContain("textAlignVertical: 'center'");
    expect(pwdInputSrc).toContain('underlineColorAndroid="transparent"');
  });

  it('verifies login.tsx, register.tsx, and forgot-password.tsx have keyboardShouldPersistTaps="handled"', () => {
    const loginSrc = fs.readFileSync(path.join(passengerDir, 'app/(auth)/login.tsx'), 'utf8');
    const registerSrc = fs.readFileSync(path.join(passengerDir, 'app/(auth)/register.tsx'), 'utf8');
    const forgotSrc = fs.readFileSync(path.join(passengerDir, 'app/(auth)/forgot-password.tsx'), 'utf8');

    expect(loginSrc).toContain('keyboardShouldPersistTaps="handled"');
    expect(registerSrc).toContain('keyboardShouldPersistTaps="handled"');
    expect(forgotSrc).toContain('keyboardShouldPersistTaps="handled"');
  });
});
