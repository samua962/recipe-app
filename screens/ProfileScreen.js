// screens/ProfileScreen.js - IMPROVED WITH BETTER LOGOUT
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function ProfileScreen({ navigation }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const { locale, t } = useLanguage();

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

  // IMPROVED: Enhanced logout function
  const handleLogout = () => {
    Alert.alert(
      t('profile.logout.title'),
      t('profile.logout.confirmMessage'),
      [
        { 
          text: t('common.cancel'), 
          style: 'cancel' 
        },
        {
          text: t('profile.logout.button'),
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  // IMPROVED: Separate logout function with loading state
  const performLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut(auth);
      console.log('Logout successful');
      
      // IMPROVED: Clear navigation stack completely
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert(
        t('profile.errors.title'),
        t('profile.errors.logoutFailed')
      );
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f37d1c" />
        <Text style={styles.loadingText}>{t('profile.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.userName}>{userData?.name || t('profile.defaultName')}</Text>
        <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>
        
        {userData?.role && (
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userData.role) }]}>
            <Ionicons name={getRoleIcon(userData.role)} size={16} color="#fff" />
            <Text style={styles.roleText}>{getLocalizedRole(userData.role)}</Text>
          </View>
        )}
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        {/* Language Switcher */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="language-outline" size={24} color="#666" />
          <Text style={styles.menuText}>{t('profile.language')}</Text>
          <LanguageSwitcher />
        </TouchableOpacity>

        {/* Edit Profile */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.menuText}>{t('profile.editProfile')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.menuText}>{t('profile.notifications')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Settings */}
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={24} color="#666" />
          <Text style={styles.menuText}>{t('profile.settings')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* My Recipes */}
        {/* <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('MyRecipes')}
        >
          <Ionicons name="restaurant-outline" size={24} color="#666" />
          <Text style={styles.menuText}>{t('profile.myRecipes')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity> */}

        {/* Favorites */}
        {/* <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Ionicons name="heart-outline" size={24} color="#666" />
          <Text style={styles.menuText}>{t('profile.favorites')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity> */}

        {/* Divider before logout */}
        <View style={styles.divider} />

        {/* IMPROVED: Logout Button with Loading State */}
        <TouchableOpacity 
          style={[styles.logoutButton, logoutLoading && styles.logoutButtonDisabled]}
          onPress={handleLogout}
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
        <Text style={styles.versionText}>{t('profile.version')} 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    backgroundColor: '#f37d1c',
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
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  // IMPROVED: Logout specific styles
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff0f0',
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
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
    color: '#999',
    fontWeight: '500',
  },
});