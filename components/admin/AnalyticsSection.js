// components/admin/AnalyticsSection.js - WITHOUT LANGUAGE DISTRIBUTION
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';

const { width } = Dimensions.get('window');

export default function AnalyticsSection({ stats, users, recipes, refreshing, onRefresh }) {
  const { locale, t } = useLanguage();

  // Safe function to get localized text from recipe data
  const getLocalizedText = (field, recipe) => {
    if (!recipe || !recipe[field]) return '';
    
    const fieldData = recipe[field];
    
    if (typeof fieldData === 'string') return fieldData;
    
    if (typeof fieldData === 'object' && fieldData !== null) {
      return fieldData[locale] || fieldData.en || fieldData.am || '';
    }
    
    return '';
  };

  // Calculate additional analytics with proper localization support
  const totalAdmins = users.filter(user => user.role === 'admin').length;
  const totalModerators = users.filter(user => user.role === 'moderator').length;
  const totalRegularUsers = users.filter(user => user.role === 'user').length;
  
  // Recipes by category with localization support
  const recipesByCategory = recipes.reduce((acc, recipe) => {
    // Use localized category if available
    const category = getLocalizedText('category', recipe) || recipe.category || t('admin.analytics.uncategorized');
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const topCategories = Object.entries(recipesByCategory)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // Calculate recipes by approval status
  const approvedRecipes = recipes.filter(recipe => recipe.approved).length;
  const pendingRecipes = recipes.filter(recipe => !recipe.approved).length;
  
  // Calculate average recipes per user
  const recipesPerUser = users.length > 0 ? (recipes.length / users.length).toFixed(1) : 0;
  
  // Get most active users
  const userRecipeCounts = users.map(user => {
    const userRecipes = recipes.filter(recipe => recipe.authorId === user.id);
    return {
      name: user.name,
      recipeCount: userRecipes.length,
      approvedCount: userRecipes.filter(recipe => recipe.approved).length
    };
  }).filter(user => user.recipeCount > 0)
    .sort((a, b) => b.recipeCount - a.recipeCount)
    .slice(0, 5);

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#f37d1c']}
          tintColor="#f37d1c"
          title={t('common.pullToRefresh')}
        />
      }
    >
      {/* User Analytics - 2x2 Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.analytics.userAnalytics')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.analyticCard}>
            <Ionicons name="shield" size={24} color="#ff6b6b" />
            <Text style={styles.analyticNumber}>{totalAdmins}</Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.admins')}</Text>
          </View>
          <View style={styles.analyticCard}>
            <Ionicons name="shield-checkmark" size={24} color="#4ecdc4" />
            <Text style={styles.analyticNumber}>{totalModerators}</Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.moderators')}</Text>
          </View>
          <View style={styles.analyticCard}>
            <Ionicons name="people" size={24} color="#45b7d1" />
            <Text style={styles.analyticNumber}>{totalRegularUsers}</Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.users')}</Text>
          </View>
          <View style={styles.analyticCard}>
            <Ionicons name="person-add" size={24} color="#f37d1c" />
            <Text style={styles.analyticNumber}>{stats.totalUsers}</Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.totalUsers')}</Text>
          </View>
        </View>
      </View>

      {/* Recipe Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.analytics.recipeAnalytics')}</Text>
        <View style={styles.statsGrid}>
          <View style={styles.analyticCard}>
            <Ionicons name="restaurant" size={24} color="#f37d1c" />
            <Text style={styles.analyticNumber}>{stats.totalRecipes}</Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.totalRecipes')}</Text>
          </View>
          <View style={styles.analyticCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
            <Text style={styles.analyticNumber}>{approvedRecipes}</Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.approved')}</Text>
          </View>
          <View style={styles.analyticCard}>
            <Ionicons name="time" size={24} color="#ff9800" />
            <Text style={styles.analyticNumber}>{pendingRecipes}</Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.pending')}</Text>
          </View>
          <View style={styles.analyticCard}>
            <Ionicons name="trending-up" size={24} color="#2196f3" />
            <Text style={styles.analyticNumber}>
              {stats.totalRecipes > 0 
                ? Math.round((approvedRecipes / stats.totalRecipes) * 100) 
                : 0
              }%
            </Text>
            <Text style={styles.analyticLabel}>{t('admin.analytics.approvalRate')}</Text>
          </View>
        </View>
      </View>

      {/* Top Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.analytics.topCategories')}</Text>
        <View style={styles.categoriesList}>
          {topCategories.length > 0 ? (
            topCategories.map(([category, count], index) => (
              <View key={category} style={styles.categoryItem}>
                <View style={styles.categoryInfo}>
                  <View style={styles.categoryRank}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category}
                  </Text>
                </View>
                <Text style={styles.categoryCount}>{count} {t('admin.analytics.recipes')}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>{t('admin.analytics.noCategories')}</Text>
          )}
        </View>
      </View>

      {/* Platform Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('admin.analytics.platformStats')}</Text>
        <View style={styles.statsList}>
          <View style={styles.statItem}>
            <Ionicons name="trending-up" size={20} color="#4caf50" />
            <Text style={styles.statItemText}>{t('admin.analytics.approvalRate')}</Text>
            <Text style={styles.statItemValue}>
              {stats.totalRecipes > 0 
                ? Math.round((approvedRecipes / stats.totalRecipes) * 100) 
                : 0
              }%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color="#2196f3" />
            <Text style={styles.statItemText}>{t('admin.analytics.activeUsers')}</Text>
            <Text style={styles.statItemValue}>{users.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="restaurant" size={20} color="#ff9800" />
            <Text style={styles.statItemText}>{t('admin.analytics.recipesPerUser')}</Text>
            <Text style={styles.statItemValue}>
              {recipesPerUser}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={20} color="#f44336" />
            <Text style={styles.statItemText}>{t('admin.analytics.pendingRatio')}</Text>
            <Text style={styles.statItemValue}>
              {stats.totalRecipes > 0 
                ? Math.round((pendingRecipes / stats.totalRecipes) * 100) 
                : 0
              }%
            </Text>
          </View>
        </View>
      </View>

      {/* Top Contributors */}
      {userRecipeCounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('admin.analytics.topContributors')}</Text>
          <View style={styles.contributorsList}>
            {userRecipeCounts.map((user, index) => (
              <View key={index} style={styles.contributorItem}>
                <View style={styles.contributorInfo}>
                  <View style={styles.contributorRank}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <Text style={styles.contributorName} numberOfLines={1}>
                    {user.name}
                  </Text>
                </View>
                <View style={styles.contributorStats}>
                  <Text style={styles.contributorCount}>
                    {user.recipeCount} {t('admin.analytics.recipes')}
                  </Text>
                  <Text style={styles.contributorApproved}>
                    ({user.approvedCount} {t('admin.analytics.approved')})
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticCard: {
    width: (width - 56) / 2,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  analyticNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  analyticLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  categoriesList: {
    gap: 8,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryRank: {
    backgroundColor: '#f37d1c',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statsList: {
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statItemValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f37d1c',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  contributorsList: {
    gap: 8,
  },
  contributorItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  contributorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contributorRank: {
    backgroundColor: '#4ecdc4',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contributorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  contributorStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contributorCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  contributorApproved: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
});