// LoginScreen.js - WITH DARK THEME SUPPORT
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTheme } from '../contexts/ThemeContext';
import CustomDialog from '../components/CustomDialog';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogType, setDialogType] = useState('error');

  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  const showDialog = (title, message, type = 'error') => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogType(type);
    setDialogVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showDialog(t('login.errors.title'), t('login.errors.requiredFields'), 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        await signOut(auth);
        showDialog(
          t('login.errors.emailNotVerifiedTitle'),
          t('login.errors.emailNotVerifiedMessage'),
          'warning'
        );
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

    } catch (error) {
      let errorMessage = t('login.errors.generic');
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = t('login.errors.invalidEmail');
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = t('login.errors.userNotFound');
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = t('login.errors.wrongPassword');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = t('login.errors.tooManyRequests');
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = t('login.errors.networkError');
      }
      
      showDialog(t('login.errors.title'), errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      showDialog(t('login.errors.title'), t('login.errors.enterEmailFirst'), 'error');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showDialog(
        t('login.resetPassword.successTitle'),
        t('login.resetPassword.successMessage'),
        'success'
      );
    } catch (error) {
      let errorMessage = error.message;
      
      if (error.code === 'auth/invalid-email') {
        errorMessage = t('login.errors.invalidEmail');
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = t('login.errors.userNotFound');
      }
      
      showDialog(t('login.errors.title'), errorMessage, 'error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
        translucent={false}
      />
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with Language Switcher */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('login.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('login.subtitle')}</Text>
            <View style={styles.languageSwitcherContainer}>
              <LanguageSwitcher />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('login.email')}</Text>
            <View style={[
              styles.inputRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              }
            ]}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>{t('login.password')}</Text>
            <View style={[
              styles.inputRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              }
            ]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword((s) => !s)} 
                style={styles.eyeButton}
                disabled={loading}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[
              styles.button, 
              { backgroundColor: colors.primary },
              loading && styles.buttonDisabled
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('login.loginButton')}</Text>
            )}
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity 
            onPress={handleResetPassword} 
            style={styles.forgotButton}
            disabled={loading}
          >
            <Text style={[styles.forgotText, { color: colors.textSecondary }]}>
              {t('login.forgotPassword')}
            </Text>
          </TouchableOpacity>

          {/* Signup Link */}
          <View style={styles.signupContainer}>
            <Text style={[styles.signupText, { color: colors.textSecondary }]}>
              {t('login.noAccount')}{" "}
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Signup')}
              disabled={loading}
            >
              <Text style={[styles.signupLink, { color: colors.primary }]}>
                {t('login.signupLink')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Custom Dialog */}
          <CustomDialog
            visible={dialogVisible}
            title={dialogTitle}
            message={dialogMessage}
            type={dialogType}
            onClose={() => setDialogVisible(false)}
            confirmText={t('dialog.ok')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { 
    flexGrow: 1,
    justifyContent: 'center', 
    padding: 24,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  title: { 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: { 
    fontSize: 15, 
    marginBottom: 20,
    textAlign: 'center',
  },
  languageSwitcherContainer: {
    marginTop: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  inputIcon: { 
    marginRight: 8 
  },
  input: { 
    flex: 1, 
    height: 48, 
    fontSize: 16,
    paddingHorizontal: 4,
  },
  eyeButton: { 
    padding: 6,
    marginLeft: 4,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  forgotButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: { 
    fontSize: 14,
    fontWeight: '500',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  signupText: { 
    fontSize: 14,
  },
  signupLink: { 
    fontSize: 14,
    fontWeight: '700',
  },
});