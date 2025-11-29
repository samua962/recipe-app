// screens/ProfileScreen.js - UPDATED WITH DARK MODE AND CUSTOM DIALOG
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext'; // Import theme hook
import LanguageSwitcher from '../components/LanguageSwitcher';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [dialogAnimation] = useState(new Animated.Value(0));

  const { locale, t } = useLanguage();
  const { colors, isDarkMode, toggleTheme } = useTheme(); // Theme hook

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Show custom logout dialog
  const showCustomLogoutDialog = () => {
    setShowLogoutDialog(true);
    Animated.spring(dialogAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  // Hide custom logout dialog
  const hideCustomLogoutDialog = () => {
    Animated.timing(dialogAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLogoutDialog(false);
    });
  };

  // Handle logout confirmation
  const handleLogoutConfirm = () => {
    hideCustomLogoutDialog();
    performLogout();
  };

  // Separate logout function with loading state
  const performLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut(auth);
      console.log('Logout successful');
      
      // Clear navigation stack completely
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('Error signing out:', error);
      // You could show an error dialog here if needed
    } finally {
      setLogoutLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#ff6b6b';
      case 'moderator': return '#4ecdc4';
      case 'user': return '#45b7d1';
      default: return '#95a5a6';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return 'shield';
      case 'moderator': return 'shield-checkmark';
      case 'user': return 'person';
      default: return 'help';
    }
  };

  const getLocalizedRole = (role) => {
    return t(`profile.roles.${role}`) || role;
  };

  // Custom Dialog Component
  const LogoutDialog = () => {
    const translateY = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });

    const opacity = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Modal
        visible={showLogoutDialog}
        transparent
        animationType="none"
        onRequestClose={hideCustomLogoutDialog}
      >
        <View style={styles.dialogOverlay}>
          <Animated.View style={[styles.dialogContainer, { 
            backgroundColor: colors.card,
            opacity,
            transform: [{ translateY }] 
          }]}>
            <View style={styles.dialogIcon}>
              <Ionicons name="log-out-outline" size={48} color="#e74c3c" />
            </View>
            
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {t('profile.logout.title')}
            </Text>
            
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
              {t('profile.logout.confirmMessage')}
            </Text>
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={[styles.dialogButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={hideCustomLogoutDialog}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dialogButton, styles.confirmButton]}
                onPress={handleLogoutConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  {t('profile.logout.button')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{t('profile.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{userData?.name || t('profile.defaultName')}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{auth.currentUser?.email}</Text>
        
        {userData?.role && (
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userData.role) }]}>
            <Ionicons name={getRoleIcon(userData.role)} size={16} color="#fff" />
            <Text style={styles.roleText}>{getLocalizedRole(userData.role)}</Text>
          </View>
        )}
      </View>

      {/* Menu Items */}
      <View style={[styles.menu, { backgroundColor: colors.card }]}>
        {/* Dark Mode Toggle */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={toggleTheme}
        >
          <Ionicons 
            name={isDarkMode ? "sunny" : "moon"} 
            size={24} 
            color={colors.textSecondary} 
          />
          <Text style={[styles.menuText, { color: colors.text }]}>
            {isDarkMode ? t('profile.lightMode') : t('profile.darkMode')}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Language Switcher */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="language-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.language')}</Text>
          <LanguageSwitcher />
        </TouchableOpacity>

        {/* Edit Profile */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.editProfile')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.notifications')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Settings */}
        {/* <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.settings')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity> */}

        {/* My Recipes */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('MyRecipes')}
        >
          <Ionicons name="restaurant-outline" size={24} color={colors.textSecondary} />
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.myRecipes')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Divider before logout */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Logout Button with Loading State */}
        <TouchableOpacity 
          style={[
            styles.logoutButton, 
            { backgroundColor: colors.card, borderLeftColor: '#e74c3c' },
            logoutLoading && styles.logoutButtonDisabled
          ]}
          onPress={showCustomLogoutDialog}
          disabled={logoutLoading}
        >
          {logoutLoading ? (
            <ActivityIndicator size="small" color="#e74c3c" />
          ) : (
            <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          )}
          <Text style={styles.logoutText}>
            {logoutLoading ? t('profile.logout.loggingOut') : t('profile.logout.button')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* App Version */}
      <View style={styles.footer}>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          {t('profile.version')} 1.0.0
        </Text>
      </View>

      {/* Custom Logout Dialog */}
      <LogoutDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  roleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  menu: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderLeftWidth: 4,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    color: '#e74c3c',
    marginLeft: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Custom Dialog Styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dialogButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 2,
  },
  confirmButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});