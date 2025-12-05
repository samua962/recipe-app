// components/admin/OverviewSection.js - UPDATED WITH DARK MODE
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
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function OverviewSection({ stats, onNavigate, navigation, users, recipes, refreshing, onRefresh }) {
  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  const getLocalizedText = (field, recipe) => {
    if (!recipe || !recipe[field]) return '';
    
    const fieldData = recipe[field];
    
    if (typeof fieldData === 'string') return fieldData;
    
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
          colors={[colors.primary]}
          tintColor={colors.primary}
          title={t('common.pullToRefresh')}
          titleColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Stats Cards - 2x2 Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="people" size={24} color={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalUsers}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('admin.overview.stats.totalUsers')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="restaurant" size={24} color={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{stats.totalRecipes}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('admin.overview.stats.totalRecipes')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="time" size={24} color={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{stats.pendingRecipes}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('admin.overview.stats.pending')}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          <Text style={[styles.statNumber, { color: colors.text }]}>{stats.approvedRecipes}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('admin.overview.stats.approved')}</Text>
        </View>
      </View>

      {/* Quick Actions - 2x2 Grid */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin.overview.quickActions')}</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: colors.background }]}
              onPress={action.onPress}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={24} color="#fff" />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
              <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{action.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('admin.overview.recentActivity')}</Text>
        <View style={styles.activityList}>
          {getRecentActivity().length > 0 ? (
            getRecentActivity().map((activity, index) => (
              <View key={index} style={[styles.activityItem, { backgroundColor: colors.background }]}>
                <View style={[styles.activityIcon, { backgroundColor: activity.color }]}>
                  <Ionicons name={activity.icon} size={16} color="#fff" />
                </View>
                <View style={styles.activityContent}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{activity.title}</Text>
                  <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>{activity.description}</Text>
                  <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                    {formatTimeAgo(new Date(activity.time))}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.noActivityText, { color: colors.textSecondary }]}>{t('admin.overview.noActivity')}</Text>
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 70) / 2,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
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
    textAlign: 'center',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
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
  },
  activityDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    marginTop: 2,
  },
  noActivityText: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});