// screens/SignupScreen.js - UPDATED WITH STATUS BAR VISIBLE
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
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTheme } from '../contexts/ThemeContext';
import CustomDialog from '../components/CustomDialog';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogType, setDialogType] = useState("error");

  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  const handleSignup = async () => {
    if (!email || !password || !name || !confirmPassword) {
      showDialog(t('signup.errors.title'), t('signup.errors.requiredFields'), "error");
      return;
    }

    if (password.length < 6) {
      showDialog(t('signup.errors.title'), t('signup.errors.passwordLength'), "error");
      return;
    }

    if (password !== confirmPassword) {
      showDialog(t('signup.errors.title'), t('signup.errors.passwordMismatch'), "error");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Small delay to ensure auth is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateProfile(user, {
        displayName: name.trim()
      });

      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: "user",
        createdAt: new Date(),
        uid: user.uid,
        verified: false,
        preferredLanguage: locale
      };

      await setDoc(doc(db, "users", user.uid), userData);
      await sendEmailVerification(user);

      showDialog(
        t('signup.success.verifyEmailTitle'),
        t('signup.success.verifyEmailMessage'),
        "success"
      );

    } catch (error) {
      console.error("Signup error details:", error);
      
      let errorMessage = t('signup.errors.generic');
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('signup.errors.emailInUse');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('signup.errors.invalidEmail');
      } else if (error.code === 'auth/weak-password') {
        errorMessage = t('signup.errors.weakPassword');
      } else if (error.code === 'permission-denied') {
        errorMessage = t('signup.errors.permissionDenied');
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = t('signup.errors.networkError');
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = t('signup.errors.operationNotAllowed');
      }
      
      showDialog(t('signup.errors.title'), errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const showDialog = (title, message, type = "error") => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogType(type);
    setDialogVisible(true);

    if (type === "success") {
      setTimeout(() => {
        setDialogVisible(false);
        manualSignOutAndNavigate();
      }, 5000);
    }
  };

  const manualSignOutAndNavigate = async () => {
    try {
      await auth.signOut();
      navigation.replace('Login');
    } catch (error) {
      console.error("Error during manual sign out:", error);
      navigation.replace('Login');
    }
  };

  const closeDialog = () => {
    setDialogVisible(false);
    if (dialogType === "success") {
      manualSignOutAndNavigate();
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
            <Text style={[styles.title, { color: colors.text }]}>{t('signup.title')}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('signup.subtitle')}</Text>
          </View>

          {/* Name */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>{t('signup.name')}</Text>
            <View style={[
              styles.inputRow, 
              { 
                backgroundColor: colors.card,
                borderColor: colors.border,
              }
            ]}>
              <Ionicons name="person-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={t('signup.namePlaceholder')}
                placeholderTextColor={colors.placeholder}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!loading}
                autoComplete="name"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>{t('signup.email')}</Text>
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
                placeholder={t('signup.emailPlaceholder')}
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

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>{t('signup.password')}</Text>
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
                placeholder={t('signup.passwordPlaceholder')}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword((s) => !s)} 
                style={styles.eyeButton}
                disabled={loading}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>{t('signup.confirmPassword')}</Text>
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
                placeholder={t('signup.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!loading}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword((s) => !s)} 
                style={styles.eyeButton}
                disabled={loading}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={20} 
                  color={colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Signup button */}
          <TouchableOpacity
            style={[
              styles.button, 
              { backgroundColor: colors.primary },
              loading && styles.buttonDisabled
            ]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>{t('signup.signupButton')}</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>{t('signup.haveAccount')}{" "}</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={[styles.loginLink, { color: colors.primary }]}>{t('signup.loginLink')}</Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Privacy */}
          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              {t('signup.termsText')}{" "}
              <Text style={[styles.termsLink, { color: colors.primary }]}>{t('signup.termsLink')}</Text>{" "}
              {t('signup.and')}{" "}
              <Text style={[styles.termsLink, { color: colors.primary }]}>{t('signup.privacyLink')}</Text>
            </Text>
          </View>

          {/* Custom Dialog */}
          <CustomDialog
            visible={dialogVisible}
            title={dialogTitle}
            message={dialogMessage}
            type={dialogType}
            onClose={closeDialog}
            confirmText={dialogType === "success" ? t('signup.success.goToLogin') : t('dialog.ok')}
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
    textAlign: 'center'
  },
  subtitle: { 
    fontSize: 15, 
    marginBottom: 20,
    textAlign: 'center'
  },
 
  inputContainer: {
    marginBottom: 20,
  },
  label: {
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
    height: 50, 
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: { 
    fontSize: 15,
  },
  loginLink: { 
    fontWeight: '700',
    fontSize: 15,
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    fontWeight: '600',
  },
});