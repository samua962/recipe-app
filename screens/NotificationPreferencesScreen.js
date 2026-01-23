// screens/NotificationPreferencesScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { auth } from '../firebaseConfig';
import { UserPreferences } from '../services/notificationService';

export default function NotificationPreferencesScreen({ navigation }) {
  const [preferences, setPreferences] = useState(UserPreferences.defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { colors, isDarkMode } = useTheme();
  const { t, locale } = useLanguage();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please login to manage preferences');
        navigation.goBack();
        return;
      }
      
      setLoading(true);
      const userPrefs = await UserPreferences.getUserPreferences(user.uid);
      setPreferences(userPrefs);
      console.log('✅ Loaded preferences:', userPrefs);
    } catch (error) {
      console.error('❌ Error loading preferences:', error);
      Alert.alert('Error', 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'Please login to save preferences');
        return;
      }
      
      setSaving(true);
      await UserPreferences.saveUserPreferences(user.uid, preferences);
      
      // Show success
      Alert.alert(
        'Success',
        'Notification preferences saved!',
        [{ text: 'OK', onPress: () => console.log('Preferences saved') }]
      );
      
      console.log('✅ Saved preferences:', preferences);
    } catch (error) {
      console.error('❌ Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleAllNotifications = () => {
    const newValue = !preferences.allNotifications;
    setPreferences(prev => ({
      ...prev,
      allNotifications: newValue,
    }));
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Preferences',
      'Reset all preferences to default settings?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setPreferences(UserPreferences.defaultPreferences);
          }
        }
      ]
    );
  };

  // Translation mapping
  const getPreferenceText = (key) => {
    const translations = {
      allNotifications: {
        title: t('notificationPreferences.allNotifications'),
        description: t('notificationPreferences.allNotificationsDesc')
      },
      newRecipesFromFollowed: {
        title: t('notificationPreferences.newRecipesFromFollowed'),
        description: t('notificationPreferences.newRecipesFromFollowedDesc')
      },
      recipeApproved: {
        title: t('notificationPreferences.recipeApproved'),
        description: t('notificationPreferences.recipeApprovedDesc')
      },
      recipeRejected: {
        title: t('notificationPreferences.recipeRejected'),
        description: t('notificationPreferences.recipeRejectedDesc')
      },
      newComments: {
        title: t('notificationPreferences.newComments'),
        description: t('notificationPreferences.newCommentsDesc')
      },
      newRatings: {
        title: t('notificationPreferences.newRatings'),
        description: t('notificationPreferences.newRatingsDesc')
      },
      moderationAlerts: {
        title: t('notificationPreferences.moderationAlerts'),
        description: t('notificationPreferences.moderationAlertsDesc')
      }
    };
    
    return translations[key] || { 
      title: UserPreferences.getPreferenceLabel(key), 
      description: '' 
    };
  };

  const PreferenceItem = ({ preferenceKey, icon }) => {
    const { title, description } = getPreferenceText(preferenceKey);
    const isDisabled = preferenceKey !== 'allNotifications' && !preferences.allNotifications;
    
    return (
      <View style={[
        styles.preferenceItem, 
        { 
          backgroundColor: colors.card,
          opacity: isDisabled ? 0.6 : 1
        }
      ]}>
        <View style={styles.preferenceIcon}>
          <Ionicons 
            name={icon} 
            size={24} 
            color={isDisabled ? colors.textSecondary : colors.primary} 
          />
        </View>
        <View style={styles.preferenceContent}>
          <Text style={[
            styles.preferenceTitle, 
            { 
              color: isDisabled ? colors.textSecondary : colors.text 
            }
          ]}>
            {title}
          </Text>
          {description ? (
            <Text style={[
              styles.preferenceDescription, 
              { color: colors.textSecondary }
            ]}>
              {description}
            </Text>
          ) : null}
        </View>
        <Switch
          value={preferences[preferenceKey]}
          onValueChange={() => togglePreference(preferenceKey)}
          disabled={isDisabled}
          trackColor={{ 
            false: isDarkMode ? '#555' : '#ddd', 
            true: colors.primary 
          }}
          thumbColor="#fff"
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading preferences...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('notificationPreferences.title')}
        </Text>
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={resetToDefaults}
        >
          <Ionicons name="refresh-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Switch */}
        <View style={[styles.masterSection, { backgroundColor: colors.card }]}>
          <View style={styles.masterContent}>
            <View style={styles.masterIcon}>
              <Ionicons name="notifications" size={28} color={colors.primary} />
            </View>
            <View style={styles.masterText}>
              <Text style={[styles.masterTitle, { color: colors.text }]}>
                {t('notificationPreferences.allNotifications')}
              </Text>
              <Text style={[styles.masterDescription, { color: colors.textSecondary }]}>
                {t('notificationPreferences.allNotificationsDesc')}
              </Text>
            </View>
            <Switch
              value={preferences.allNotifications}
              onValueChange={toggleAllNotifications}
              trackColor={{ 
                false: isDarkMode ? '#555' : '#ddd', 
                true: colors.primary 
              }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Notification Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('notificationPreferences.categories')}
          </Text>
          
          <PreferenceItem
            preferenceKey="newRecipesFromFollowed"
            icon="people"
          />

          <PreferenceItem
            preferenceKey="recipeApproved"
            icon="checkmark-circle"
          />

          <PreferenceItem
            preferenceKey="recipeRejected"
            icon="alert-circle"
          />

          <PreferenceItem
            preferenceKey="newComments"
            icon="chatbubble"
          />

          <PreferenceItem
            preferenceKey="newRatings"
            icon="star"
          />

          <PreferenceItem
            preferenceKey="moderationAlerts"
            icon="shield-checkmark"
          />
        </View>

        {/* Info Text */}
        <View style={[styles.infoBox, { 
          backgroundColor: isDarkMode ? 'rgba(243, 125, 28, 0.1)' : '#f0f7ff',
          borderLeftColor: colors.primary 
        }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.text }]}>
            {t('notificationPreferences.info')}
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, { 
            backgroundColor: saving ? colors.border : colors.primary,
            opacity: saving ? 0.7 : 1
          }]}
          onPress={savePreferences}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {t('notificationPreferences.savePreferences')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    padding: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  masterSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  masterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  masterIcon: {
    marginRight: 16,
  },
  masterText: {
    flex: 1,
  },
  masterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  masterDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    opacity: 0.8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  preferenceIcon: {
    marginRight: 16,
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 18,
    marginLeft: 12,
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});