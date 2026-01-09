// components/GuestRestrictionDialog.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const { width, height } = Dimensions.get('window');

export default function GuestRestrictionDialog({
  visible,
  onClose,
  onLoginPress,
  title,
  message,
  featureName,
}) {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();

  // Use provided title/message or default ones
  const dialogTitle = title || t('guestDialog.defaultTitle') || "Feature Restricted";
  
  let dialogMessage = message;
  if (!dialogMessage) {
    if (featureName) {
      dialogMessage = (t('guestDialog.defaultMessageWithFeature') || `Please sign up or log in to access ${featureName}.`).replace('{{feature}}', featureName);
    } else {
      dialogMessage = t('guestDialog.defaultMessage') || "Please sign up or log in to access this feature.";
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.dialogContainer,
          { 
            backgroundColor: colors.card,
            shadowColor: isDarkMode ? '#000' : '#333',
          }
        ]}>
          {/* Dialog Icon */}
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(149, 165, 166, 0.1)' }]}>
            <Ionicons name="lock-closed" size={48} color="#95a5a6" />
          </View>

          {/* Dialog Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {dialogTitle}
          </Text>

          {/* Dialog Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {dialogMessage}
          </Text>

          {/* Feature Benefits for Guests */}
          <View style={[styles.benefitsContainer, { backgroundColor: 'rgba(149, 165, 166, 0.05)' }]}>
            <View style={styles.benefitItem}>
              <Ionicons name="heart-outline" size={20} color="#95a5a6" />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                {t('guestDialog.benefitSave') || "Save favorite recipes"}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="add-circle-outline" size={20} color="#95a5a6" />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                {t('guestDialog.benefitPost') || "Post your own recipes"}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="notifications-outline" size={20} color="#95a5a6" />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                {t('guestDialog.benefitNotifications') || "Get notifications"}
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                {t('guestDialog.cancelButton') || "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={onLoginPress}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.loginButtonText}>
                {t('guestDialog.loginButton') || "Login"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Continue as Guest Option */}
          <TouchableOpacity
            style={styles.continueAsGuest}
            onPress={onClose}
          >
            <Text style={[styles.continueAsGuestText, { color: colors.textSecondary }]}>
              {t('guestDialog.continueAsGuest') || "Continue as guest"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  benefitsContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    borderWidth: 2,
  },
  loginButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  continueAsGuest: {
    marginTop: 20,
    paddingVertical: 8,
  },
  continueAsGuestText: {
    fontSize: 14,
    fontWeight: '500',
  },
});