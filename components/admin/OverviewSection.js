// components/admin/OverviewSection.js - WITH RECIPE STRUCTURE SUPPORT
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';

const { width } = Dimensions.get('window');

export default function OverviewSection({ stats, onNavigate, navigation, users, recipes, refreshing, onRefresh }) {
  const { locale, t } = useLanguage();

  // ADDED: Safe function to get localized text from recipe data
  const getLocalizedText = (field, recipe) => {
    if (!recipe || !recipe[field]) return '';
    
    const fieldData = recipe[field];
    
    // If it's already a string, return it directly
    if (typeof fieldData === 'string') return fieldData;
    
    // If it's an object with language properties, return the current locale's value
    if (typeof fieldData === 'object' && fieldData !== null) {
      return fieldData[locale] || fieldData.en || fieldData.am || '';
    }
    
    return '';
  };

  const quickActions = [
    {
      id: 'users',
      title: t('admin.overview.actions.manageUsers'),
      description: t('admin.overview.actions.manageUsersDesc'),
      icon: 'people-outline',
      color: '#4ecdc4',
      onPress: () => onNavigate('users')
    },
    {
      id: 'recipes',
      title: t('admin.overview.actions.manageRecipes'),
      description: t('admin.overview.actions.manageRecipesDesc'),
      icon: 'restaurant-outline',
      color: '#45b7d1',
      onPress: () => onNavigate('recipes')
    },
    {
      id: 'analytics',
      title: t('admin.overview.actions.viewAnalytics'),
      description: t('admin.overview.actions.viewAnalyticsDesc'),
      icon: 'stats-chart-outline',
      color: '#f37d1c',
      onPress: () => onNavigate('analytics')
    },
    {
      id: 'notifications',
      title: t('admin.overview.actions.sendNotification'),
      description: t('admin.overview.actions.sendNotificationDesc'),
      icon: 'notifications-outline',
      color: '#ff6b6b',
      onPress: () => navigation.navigate('Notifications')
    },
  ];

  // UPDATED: Get recent activity with proper localization
  const getRecentActivity = () => {
    const recentUsers = users.slice(0, 2).map(user => ({
      type: 'user',
      title: t('admin.overview.activity.newUser'),
      description: `${user.name} ${t('admin.overview.activity.joined')}`,
      time: user.createdAt?.toDate?.() || new Date(),
      icon: 'person-add',
      color: '#4ecdc4'
    }));

    const recentRecipes = recipes.slice(0, 2).map(recipe => {
      // ADDED: Get localized title for recipe
      const localizedTitle = getLocalizedText('title', recipe);
      
      return {
        type: 'recipe',
        title: recipe.approved ? t('admin.overview.activity.recipeApproved') : t('admin.overview.activity.newRecipe'),
        description: `"${localizedTitle || recipe.title}" ${recipe.approved ? t('admin.overview.activity.wasApproved') : t('admin.overview.activity.waitingApproval')}`,
        time: recipe.createdAt?.toDate?.() || new Date(),
        icon: 'restaurant',
        color: recipe.approved ? '#4caf50' : '#ff9800'
      };
    });

    return [...recentUsers, ...recentRecipes]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 4);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return t('common.time.justNow');
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} ${t('common.time.minutesAgo')}`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ${t('common.time.hoursAgo')}`;
    return `${Math.floor(diffInSeconds / 86400)} ${t('common.time.daysAgo')}`;
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#f37d1c']}
          tintColor="#f37d1c"
          title={t('common.pullToRefresh')}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#f37d1c" />
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>{t('admin.overview.stats.totalUsers')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="restaurant" size={24} color="#f37d1c" />
          <Text style={styles.statNumber}>{stats.totalRecipes}</Text>
          <Text style={styles.statLabel}>{t('admin.overview.stats.totalRecipes')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#f37d1c" />
          <Text style={styles.statNumber}>{stats.pendingRecipes}</Text>
          <Text style={styles.statLabel}>{t('admin.overview.stats.pending')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#f37d1c" />
          <Text style={styles.statNumber}>{stats.approvedRecipes}</Text>
          <Text style={styles.statLabel}>{t('admin.overview.stats.approved')}</Text>
        </View>
      </View>

      {/* Quick Actions - 2x2 Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.overview.quickActions')}</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionCard}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={24} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity - Dynamic */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.overview.recentActivity')}</Text>
        <View style={styles.activityList}>
          {getRecentActivity().length > 0 ? (
            getRecentActivity().map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: activity.color }]}>
                  <Ionicons name={activity.icon} size={16} color="#fff" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityTime}>
                    {formatTimeAgo(new Date(activity.time))}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noActivityText}>{t('admin.overview.noActivity')}</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 56) / 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  noActivityText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
});