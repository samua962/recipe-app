// screens/AdminDashboard.js - UPDATED WITH DARK MODE
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext'; // Import theme hook

// Import modular components
import OverviewSection from '../components/admin/OverviewSection';
import UsersSection from '../components/admin/UsersSection';
import RecipesSection from '../components/admin/RecipesSection';
import AnalyticsSection from '../components/admin/AnalyticsSection';

export default function AdminDashboard({ navigation }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRecipes: 0,
    pendingRecipes: 0,
    approvedRecipes: 0,
    adminUsers: 0,
    moderatorUsers: 0,
    regularUsers: 0
  });

  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme(); // Theme hook

  const tabs = [
    { id: 'overview', title: t('admin.tabs.overview'), icon: 'grid' },
    { id: 'users', title: t('admin.tabs.users'), icon: 'people' },
    { id: 'recipes', title: t('admin.tabs.recipes'), icon: 'restaurant' },
    { id: 'analytics', title: t('admin.tabs.analytics'), icon: 'stats-chart' },
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([loadUsers(), loadRecipes()]);
      calculateStats();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUsers = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadRecipes = async () => {
    try {
      const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const recipesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(recipesList);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const calculateStats = () => {
    const totalUsers = users.length;
    const totalRecipes = recipes.length;
    const pendingRecipes = recipes.filter(recipe => !recipe.approved).length;
    const approvedRecipes = recipes.filter(recipe => recipe.approved).length;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    const moderatorUsers = users.filter(user => user.role === 'moderator').length;
    const regularUsers = users.filter(user => user.role === 'user').length;

    setStats({
      totalUsers,
      totalRecipes,
      pendingRecipes,
      approvedRecipes,
      adminUsers,
      moderatorUsers,
      regularUsers
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewSection 
            stats={stats} 
            onNavigate={setActiveTab}
            navigation={navigation}
            users={users}
            recipes={recipes}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      case 'users':
        return (
          <UsersSection 
            users={users} 
            recipes={recipes}
            onRefresh={loadAllData}
            refreshing={refreshing}
            onRefreshParent={onRefresh}
          />
        );
      case 'recipes':
        return (
          <RecipesSection 
            recipes={recipes}
            onRefresh={loadAllData}
            refreshing={refreshing}
            onRefreshParent={onRefresh}
          />
        );
      case 'analytics':
        return (
          <AnalyticsSection 
            stats={stats}
            users={users}
            recipes={recipes}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('admin.title')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {t('admin.subtitle')}
        </Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab, 
              activeTab === tab.id && [styles.activeTab, { backgroundColor: isDarkMode ? 'rgba(243, 125, 28, 0.1)' : '#fef6e6' }]
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={20} 
              color={activeTab === tab.id ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.tabText, 
              { color: colors.textSecondary },
              activeTab === tab.id && [styles.activeTabText, { color: colors.primary }]
            ]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 8,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    marginLeft: 2,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
});