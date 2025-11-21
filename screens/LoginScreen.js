// LoginScreen.js - MULTI-LANGUAGE VERSION
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from '../contexts/LanguageContext'; // ADDED
import LanguageSwitcher from '../components/LanguageSwitcher'; // ADDED

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Custom dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  // ADDED: Multi-language hook
  const { locale, t } = useLanguage();

  const showDialog = (title, message) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showDialog(t('login.errors.title'), t('login.errors.requiredFields'));
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ✅ Enforce email verification
      if (!user.emailVerified) {
        await signOut(auth);
        showDialog(t('login.errors.emailNotVerifiedTitle'), t('login.errors.emailNotVerifiedMessage'));
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });

    } catch (error) {
      let errorMessage = error.message;
      
      // ADDED: Localized error messages
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
      
      showDialog(t('login.errors.title'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      showDialog(t('login.errors.title'), t('login.errors.enterEmailFirst'));
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showDialog(t('login.resetPassword.successTitle'), t('login.resetPassword.successMessage'));
    } catch (error) {
      let errorMessage = error.message;
      
      // ADDED: Localized error messages for password reset
      if (error.code === 'auth/invalid-email') {
        errorMessage = t('login.errors.invalidEmail');
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = t('login.errors.userNotFound');
      }
      
      showDialog(t('login.errors.title'), errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Language Switcher */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
          <LanguageSwitcher />
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('login.email')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color="#f37d1cff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('login.emailPlaceholder')}
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>{t('login.password')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color="#f37d1cff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('login.passwordPlaceholder')}
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="password"
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeButton}>
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>{t('login.loginButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity onPress={handleResetPassword} style={styles.forgotButton}>
          <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
        </TouchableOpacity>

        {/* Signup Link */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>
            {t('login.noAccount')}{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}>{t('login.signupLink')}</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Dialog */}
        <Modal
          visible={dialogVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDialogVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogBox}>
              <Ionicons
                name={
                  dialogTitle.toLowerCase().includes("error") || 
                  dialogTitle.toLowerCase().includes(t('login.errors.title').toLowerCase())
                    ? "alert-circle-outline"
                    : dialogTitle.toLowerCase().includes("verify") ||
                      dialogTitle.toLowerCase().includes(t('login.errors.emailNotVerifiedTitle').toLowerCase())
                    ? "mail-outline"
                    : "checkmark-circle-outline"
                }
                size={48}
                color={
                  dialogTitle.toLowerCase().includes("error") || 
                  dialogTitle.toLowerCase().includes(t('login.errors.title').toLowerCase()) ||
                  dialogTitle.toLowerCase().includes("verify") ||
                  dialogTitle.toLowerCase().includes(t('login.errors.emailNotVerifiedTitle').toLowerCase())
                    ? "#ff9800"
                    : "#4caf50"
                }
                style={{ marginBottom: 10 }}
              />
              <Text style={styles.dialogTitle}>{dialogTitle}</Text>
              <Text style={styles.dialogMessage}>{dialogMessage}</Text>

              <TouchableOpacity
                style={styles.dialogButton}
                onPress={() => setDialogVisible(false)}
              >
                <Text style={styles.dialogButtonText}>{t('common.ok')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  scrollContent: { 
    flexGrow: 1,
    justifyContent: 'center', 
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: { 
    color: '#222', 
    fontSize: 28, 
    fontWeight: '800', 
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: { 
    color: '#666', 
    fontSize: 15, 
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 12,
  },
  inputIcon: { 
    marginRight: 8 
  },
  input: { 
    flex: 1, 
    height: 48, 
    color: '#222',
    fontSize: 16,
  },
  eyeButton: { 
    padding: 6 
  },
  button: {
    backgroundColor: '#f37d1cff',
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
    opacity: 0.8,
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
    color: '#888', 
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
    color: '#444', 
    fontSize: 14,
  },
  signupLink: { 
    color: '#f37d1cff', 
    fontSize: 14,
    fontWeight: '700',
  },

  // Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogBox: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dialogTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 8, 
    color: '#333',
    textAlign: 'center',
  },
  dialogMessage: { 
    fontSize: 15, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 20,
    lineHeight: 20,
  },
  dialogButton: {
    backgroundColor: '#f37d1cff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 100,
  },
  dialogButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700',
    textAlign: 'center',
  },
});