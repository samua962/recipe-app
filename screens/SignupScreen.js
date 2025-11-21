// screens/SignupScreen.js - MULTI-LANGUAGE VERSION
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
  Platform
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useLanguage } from '../contexts/LanguageContext'; // ADDED
import LanguageSwitcher from '../components/LanguageSwitcher'; // ADDED

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

  // ADDED: Multi-language hook
  const { locale, t } = useLanguage();

  const handleSignup = async () => {
    if (!email || !password || !name || !confirmPassword) {
      showDialog(t('signup.errors.title'), t('signup.errors.requiredFields'));
      return;
    }

    if (password.length < 6) {
      showDialog(t('signup.errors.title'), t('signup.errors.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      showDialog(t('signup.errors.title'), t('signup.errors.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      console.log("Step 1: Creating user in Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User created in Auth:", user.uid);

      // Small delay to ensure auth is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("Step 2: Updating user profile...");
      await updateProfile(user, {
        displayName: name.trim()
      });

      console.log("Step 3: Storing user data in Firestore...");
      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: "user",
        createdAt: new Date(),
        uid: user.uid
      };

      await setDoc(doc(db, "users", user.uid), userData);
      console.log("User data stored in Firestore successfully");

      console.log("Step 4: Sending verification email...");
      await sendEmailVerification(user);
      console.log("Verification email sent successfully");

      // SUCCESS - Show verification dialog
      showDialog(
        t('signup.success.verifyEmailTitle'),
        t('signup.success.verifyEmailMessage'),
        true
      );

    } catch (error) {
      console.error("Signup error details:", error);
      
      let errorMessage = t('signup.errors.generic');
      
      // ADDED: Localized error messages
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
      
      showDialog(t('signup.errors.title'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showDialog = (title, message, isSuccess = false) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);

    if (isSuccess) {
      setTimeout(() => {
        setDialogVisible(false);
        manualSignOutAndNavigate();
      }, 5000);
    }
  };

  const manualSignOutAndNavigate = async () => {
    try {
      await auth.signOut();
      console.log("Manual sign out completed");
      navigation.replace('Login');
    } catch (error) {
      console.error("Error during manual sign out:", error);
      navigation.replace('Login');
    }
  };

  const closeDialog = () => {
    setDialogVisible(false);
    if (dialogTitle === t('signup.success.verifyEmailTitle')) {
      manualSignOutAndNavigate();
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
      >
        {/* Header with Language Switcher */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('signup.title')}</Text>
          <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>
       
        </View>

        {/* Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('signup.name')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={20} color="#f37d1cff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('signup.namePlaceholder')}
              placeholderTextColor="#999"
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
          <Text style={styles.label}>{t('signup.email')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color="#f37d1cff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('signup.emailPlaceholder')}
              placeholderTextColor="#999"
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
          <Text style={styles.label}>{t('signup.password')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color="#f37d1cff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('signup.passwordPlaceholder')}
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>{t('signup.confirmPassword')}</Text>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color="#f37d1cff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder={t('signup.confirmPasswordPlaceholder')}
              placeholderTextColor="#999"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!loading}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword((s) => !s)} style={styles.eyeButton}>
              <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Signup button */}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>{t('signup.signupButton')}</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>{t('signup.haveAccount')}{" "}</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.loginLink}>{t('signup.loginLink')}</Text>
          </TouchableOpacity>
        </View>

        {/* Terms and Privacy - ADDED */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            {t('signup.termsText')}{" "}
            <Text style={styles.termsLink}>{t('signup.termsLink')}</Text>{" "}
            {t('signup.and')}{" "}
            <Text style={styles.termsLink}>{t('signup.privacyLink')}</Text>
          </Text>
        </View>

        {/* Custom Dialog */}
        <Modal
          visible={dialogVisible}
          transparent
          animationType="fade"
          onRequestClose={closeDialog}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.dialogBox}>
              <Ionicons
                name={
                  dialogTitle.toLowerCase().includes(t('signup.errors.title').toLowerCase())
                    ? "alert-circle-outline"
                    : "checkmark-circle-outline"
                }
                size={48}
                color={
                  dialogTitle.toLowerCase().includes(t('signup.errors.title').toLowerCase()) 
                    ? "#ff5252" 
                    : "#4caf50"
                }
                style={{ marginBottom: 16 }}
              />
              <Text style={styles.dialogTitle}>{dialogTitle}</Text>
              <Text style={styles.dialogMessage}>{dialogMessage}</Text>
              <TouchableOpacity
                style={styles.dialogButton}
                onPress={closeDialog}
              >
                <Text style={styles.dialogButtonText}>
                  {dialogTitle === t('signup.success.verifyEmailTitle') 
                    ? t('signup.success.goToLogin') 
                    : t('common.ok')
                  }
                </Text>
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
    padding: 24 
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
    textAlign: 'center'
  },
  subtitle: { 
    color: '#666', 
    fontSize: 15, 
    marginBottom: 20,
    textAlign: 'center'
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
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
    borderColor: '#ddd',
    paddingHorizontal: 12,
  },
  inputIcon: { 
    marginRight: 8 
  },
  input: { 
    flex: 1, 
    height: 50, 
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
    color: '#444', 
    fontSize: 15,
  },
  loginLink: { 
    color: '#f37d1cff', 
    fontWeight: '700',
    fontSize: 15,
  },
  termsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  termsText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#f37d1cff',
    fontWeight: '600',
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  dialogTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 12, 
    color: '#333', 
    textAlign: 'center' 
  },
  dialogMessage: { 
    fontSize: 16, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 20, 
    lineHeight: 22 
  },
  dialogButton: {
    backgroundColor: '#f37d1cff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  dialogButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
});