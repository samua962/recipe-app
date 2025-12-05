// components/admin/AnalyticsSection.js - WITH DARK THEME SUPPORT
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
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function AnalyticsSection({ stats, users, recipes, refreshing, onRefresh }) {
  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

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

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: colors.background,
    },
    section: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      elevation: isDarkMode ? 0 : 2,
      shadowColor: isDarkMode ? 'transparent' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0 : 0.1,
      shadowRadius: 4,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    analyticCard: {
      width: (width - 80) / 2,
      backgroundColor: isDarkMode ? colors.background : '#f8f9fa',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
      elevation: isDarkMode ? 0 : 1,
      shadowColor: isDarkMode ? 'transparent' : '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0 : 0.1,
      shadowRadius: 2,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: colors.border,
    },
    analyticNumber: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 8,
      marginBottom: 4,
    },
    analyticLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
      textAlign: 'center',
    },
    categoryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: isDarkMode ? colors.background : '#f8f9fa',
      borderRadius: 10,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: colors.border,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    categoryCount: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    statItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: isDarkMode ? colors.background : '#f8f9fa',
      borderRadius: 8,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: colors.border,
    },
    statItemText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    statItemValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.primary,
    },
    noDataText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontStyle: 'italic',
      padding: 20,
    },
    contributorItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: isDarkMode ? colors.background : '#f8f9fa',
      borderRadius: 8,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: colors.border,
    },
    contributorName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    contributorCount: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    contributorApproved: {
      fontSize: 12,
      color: colors.textSecondary,
      opacity: 0.7,
      marginLeft: 4,
    },
  });

  // Static styles that don't change with theme
  const staticStyles = StyleSheet.create({
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    categoriesList: {
      gap: 8,
    },
    categoryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    categoryRank: {
      backgroundColor: colors.primary,
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
    statsList: {
      gap: 12,
    },
    contributorsList: {
      gap: 8,
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
    contributorStats: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

  return (
    <ScrollView 
      style={dynamicStyles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          title={t('common.pullToRefresh')}
          titleColor={colors.textSecondary}
        />
      }
    >
      {/* User Analytics - 2x2 Grid */}
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('admin.analytics.userAnalytics')}</Text>
        <View style={staticStyles.statsGrid}>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="shield" size={24} color="#ff6b6b" />
            <Text style={dynamicStyles.analyticNumber}>{totalAdmins}</Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.admins')}</Text>
          </View>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="shield-checkmark" size={24} color="#4ecdc4" />
            <Text style={dynamicStyles.analyticNumber}>{totalModerators}</Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.moderators')}</Text>
          </View>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="people" size={24} color="#45b7d1" />
            <Text style={dynamicStyles.analyticNumber}>{totalRegularUsers}</Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.users')}</Text>
          </View>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="person-add" size={24} color={colors.primary} />
            <Text style={dynamicStyles.analyticNumber}>{stats.totalUsers}</Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.totalUsers')}</Text>
          </View>
        </View>
      </View>

      {/* Recipe Analytics */}
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('admin.analytics.recipeAnalytics')}</Text>
        <View style={staticStyles.statsGrid}>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="restaurant" size={24} color={colors.primary} />
            <Text style={dynamicStyles.analyticNumber}>{stats.totalRecipes}</Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.totalRecipes')}</Text>
          </View>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
            <Text style={dynamicStyles.analyticNumber}>{approvedRecipes}</Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.approved')}</Text>
          </View>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="time" size={24} color="#ff9800" />
            <Text style={dynamicStyles.analyticNumber}>{pendingRecipes}</Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.pending')}</Text>
          </View>
          <View style={dynamicStyles.analyticCard}>
            <Ionicons name="trending-up" size={24} color="#2196f3" />
            <Text style={dynamicStyles.analyticNumber}>
              {stats.totalRecipes > 0 
                ? Math.round((approvedRecipes / stats.totalRecipes) * 100) 
                : 0
              }%
            </Text>
            <Text style={dynamicStyles.analyticLabel}>{t('admin.analytics.approvalRate')}</Text>
          </View>
        </View>
      </View>

      {/* Top Categories */}
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('admin.analytics.topCategories')}</Text>
        <View style={staticStyles.categoriesList}>
          {topCategories.length > 0 ? (
            topCategories.map(([category, count], index) => (
              <View key={category} style={dynamicStyles.categoryItem}>
                <View style={staticStyles.categoryInfo}>
                  <View style={staticStyles.categoryRank}>
                    <Text style={staticStyles.rankText}>#{index + 1}</Text>
                  </View>
                  <Text style={dynamicStyles.categoryName} numberOfLines={1}>
                    {category}
                  </Text>
                </View>
                <Text style={dynamicStyles.categoryCount}>{count} {t('admin.analytics.recipes')}</Text>
              </View>
            ))
          ) : (
            <Text style={dynamicStyles.noDataText}>{t('admin.analytics.noCategories')}</Text>
          )}
        </View>
      </View>

      {/* Platform Statistics */}
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>{t('admin.analytics.platformStats')}</Text>
        <View style={staticStyles.statsList}>
          <View style={dynamicStyles.statItem}>
            <Ionicons name="trending-up" size={20} color="#4caf50" />
            <Text style={dynamicStyles.statItemText}>{t('admin.analytics.approvalRate')}</Text>
            <Text style={dynamicStyles.statItemValue}>
              {stats.totalRecipes > 0 
                ? Math.round((approvedRecipes / stats.totalRecipes) * 100) 
                : 0
              }%
            </Text>
          </View>
          <View style={dynamicStyles.statItem}>
            <Ionicons name="people" size={20} color="#2196f3" />
            <Text style={dynamicStyles.statItemText}>{t('admin.analytics.activeUsers')}</Text>
            <Text style={dynamicStyles.statItemValue}>{users.length}</Text>
          </View>
          <View style={dynamicStyles.statItem}>
            <Ionicons name="restaurant" size={20} color="#ff9800" />
            <Text style={dynamicStyles.statItemText}>{t('admin.analytics.recipesPerUser')}</Text>
            <Text style={dynamicStyles.statItemValue}>
              {recipesPerUser}
            </Text>
          </View>
          <View style={dynamicStyles.statItem}>
            <Ionicons name="time" size={20} color="#f44336" />
            <Text style={dynamicStyles.statItemText}>{t('admin.analytics.pendingRatio')}</Text>
            <Text style={dynamicStyles.statItemValue}>
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
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>{t('admin.analytics.topContributors')}</Text>
          <View style={staticStyles.contributorsList}>
            {userRecipeCounts.map((user, index) => (
              <View key={index} style={dynamicStyles.contributorItem}>
                <View style={staticStyles.contributorInfo}>
                  <View style={staticStyles.contributorRank}>
                    <Text style={staticStyles.rankText}>#{index + 1}</Text>
                  </View>
                  <Text style={dynamicStyles.contributorName} numberOfLines={1}>
                    {user.name}
                  </Text>
                </View>
                <View style={staticStyles.contributorStats}>
                  <Text style={dynamicStyles.contributorCount}>
                    {user.recipeCount} {t('admin.analytics.recipes')}
                  </Text>
                  <Text style={dynamicStyles.contributorApproved}>
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

// Cleaner approach - keeping original styles as fallback but they won't be used
// since we're using dynamicStyles and staticStyles
const originalStyles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoriesList: {
    gap: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryRank: {
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
  statsList: {
    gap: 12,
  },
  contributorsList: {
    gap: 8,
  },
  contributorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contributorRank: {
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contributorStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});