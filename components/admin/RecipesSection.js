// components/admin/RecipesSection.js - FIXED IMPORT
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext'; // FIXED: Changed from '../contexts' to '../../contexts'

export default function RecipesSection({ recipes, onRefresh, refreshing, onRefreshParent }) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { locale, t } = useLanguage();

  // ... rest of the component remains the same
  const getLocalizedText = (field, recipe) => {
    if (!recipe || !recipe[field]) return '';
    
    const fieldData = recipe[field];
    
    if (typeof fieldData === 'string') return fieldData;
    
    if (typeof fieldData === 'object' && fieldData !== null) {
      return fieldData[locale] || fieldData.en || fieldData.am || '';
    }
    
    return '';
  };

  const filteredRecipes = recipes.filter(recipe => {
    const localizedTitle = getLocalizedText('title', recipe);
    const localizedCategory = getLocalizedText('category', recipe);
    
    return (
      localizedTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      localizedCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.authorName?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleApproveRecipe = async (recipeId) => {
    try {
      const recipeRef = doc(db, 'recipes', recipeId);
      await updateDoc(recipeRef, {
        approved: true,
        reviewedAt: new Date(),
      });
      Alert.alert(t('admin.recipes.success.title'), t('admin.recipes.success.approved'));
      onRefresh();
    } catch (error) {
      console.error('Error approving recipe:', error);
      Alert.alert(t('admin.recipes.errors.title'), t('admin.recipes.errors.approveFailed'));
    }
  };

  const handleDeleteRecipe = (recipe) => {
    const localizedTitle = getLocalizedText('title', recipe) || recipe.title;
    
    Alert.alert(
      t('admin.recipes.delete.title'),
      `${t('admin.recipes.delete.confirmMessage')} "${localizedTitle}"? ${t('admin.recipes.delete.warning')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.recipes.delete.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'recipes', recipe.id));
              Alert.alert(t('admin.recipes.success.title'), t('admin.recipes.success.deleted'));
              onRefresh();
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert(t('admin.recipes.errors.title'), t('admin.recipes.errors.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (approved) => {
    return approved ? '#4caf50' : '#ff9800';
  };

  const renderRecipeItem = ({ item }) => {
    const localizedTitle = getLocalizedText('title', item);
    const localizedCategory = getLocalizedText('category', item);
    
    return (
      <View style={styles.recipeCard}>
        <View style={styles.recipeHeader}>
          <View style={styles.recipeInfo}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.approved) }]}>
              <Ionicons name={item.approved ? "checkmark" : "time"} size={12} color="#fff" />
              <Text style={styles.statusText}>
                {item.approved ? t('admin.recipes.status.approved') : t('admin.recipes.status.pending')}
              </Text>
            </View>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {localizedTitle || item.title || t('admin.recipes.untitled')}
            </Text>
          </View>
        </View>
        
        <View style={styles.recipeDetails}>
          <Text style={styles.recipeCategory}>
            {localizedCategory || item.category || t('admin.recipes.uncategorized')}
          </Text>
          <Text style={styles.recipeAuthor}>
            {t('admin.recipes.by')}: {item.authorName || t('common.unknown')}
          </Text>
        </View>

        <Text style={styles.recipeDate}>
          {t('admin.recipes.created')}: {item.createdAt?.toDate?.()?.toLocaleDateString() || t('common.unknown')}
        </Text>
        
        <View style={styles.recipeActions}>
          {!item.approved && (
            <TouchableOpacity 
              style={styles.approveButton}
              onPress={() => handleApproveRecipe(item.id)}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.approveButtonText}>{t('admin.recipes.approve')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.deleteRecipeButton}
            onPress={() => handleDeleteRecipe(item)}
          >
            <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            <Text style={styles.deleteRecipeText}>{t('admin.recipes.delete.button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('admin.recipes.searchPlaceholder')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Recipe List */}
      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={80} color="#ddd" />
          <Text style={styles.emptyStateTitle}>{t('admin.recipes.emptyState.title')}</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery ? t('admin.recipes.emptyState.adjustSearch') : t('admin.recipes.emptyState.noRecipes')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipeItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshParent}
              colors={['#f37d1c']}
              tintColor="#f37d1c"
              title={t('common.pullToRefresh')}
            />
          }
        />
      )}
    </View>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  recipeHeader: {
    marginBottom: 8,
  },
  recipeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  recipeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeCategory: {
    fontSize: 14,
    color: '#f37d1c',
    fontWeight: '600',
  },
  recipeAuthor: {
    fontSize: 14,
    color: '#666',
  },
  recipeDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  recipeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  deleteRecipeText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});