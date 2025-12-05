// components/admin/RecipesSection.js - UPDATED WITH USE NAVIGATION
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // ADDED
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import CustomDialog from '../CustomDialog';

const { width } = Dimensions.get('window');

export default function RecipesSection({ recipes, onRefresh, refreshing, onRefreshParent }) {
  const navigation = useNavigation(); // ADDED
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  const [targetRecipe, setTargetRecipe] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogIcon, setDialogIcon] = useState('information-circle');
  const [dialogAnimation] = useState(new Animated.Value(0));

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

  const filteredRecipes = recipes.filter(recipe => {
    const localizedTitle = getLocalizedText('title', recipe);
    const localizedCategory = getLocalizedText('category', recipe);
    
    return (
      localizedTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      localizedCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.authorEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const showCustomDialog = (title, message, icon = "information-circle") => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogIcon(icon);
    setShowInfoDialog(true);
  };

  const showActionConfirmation = (recipe, type) => {
    setTargetRecipe(recipe);
    setActionType(type);
    setShowActionDialog(true);
    Animated.spring(dialogAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const hideActionDialog = () => {
    Animated.timing(dialogAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowActionDialog(false);
      setTargetRecipe(null);
      setActionType('');
    });
  };

  const handleApproveRecipe = async () => {
    if (!targetRecipe) return;
    
    setActionLoading(true);
    try {
      const recipeRef = doc(db, 'recipes', targetRecipe.id);
      await updateDoc(recipeRef, {
        approved: true,
        reviewedAt: new Date(),
      });
      
      const localizedTitle = getLocalizedText('title', targetRecipe);
      showCustomDialog(t('admin.recipes.success.title'), t('admin.recipes.success.approved'), "checkmark-circle");
      onRefresh();
    } catch (error) {
      console.error('Error approving recipe:', error);
      showCustomDialog(t('admin.recipes.errors.title'), t('admin.recipes.errors.approveFailed'), "close-circle");
    } finally {
      setActionLoading(false);
      hideActionDialog();
    }
  };

  const handleDeleteRecipe = async () => {
    if (!targetRecipe) return;
    
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'recipes', targetRecipe.id));
      const localizedTitle = getLocalizedText('title', targetRecipe);
      showCustomDialog(t('admin.recipes.success.title'), t('admin.recipes.success.deleted'), "checkmark-circle");
      onRefresh();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      showCustomDialog(t('admin.recipes.errors.title'), t('admin.recipes.errors.deleteFailed'), "close-circle");
    } finally {
      setActionLoading(false);
      hideActionDialog();
    }
  };

  const handleActionConfirm = async () => {
    if (!targetRecipe) return;
    
    if (actionType === 'approve') {
      await handleApproveRecipe();
    } else if (actionType === 'delete') {
      await handleDeleteRecipe();
    }
  };

  const navigateToRecipeDetail = (recipe) => {
    navigation.navigate('RecipeDetail', { recipe });
  };

  const getStatusColor = (approved) => {
    return approved ? '#4caf50' : '#ff9800';
  };

  const getStatusIcon = (approved) => {
    return approved ? "checkmark-circle" : "time";
  };

  const ActionDialog = () => {
    const translateY = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });

    const opacity = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const getDialogContent = () => {
      const localizedTitle = getLocalizedText('title', targetRecipe) || targetRecipe?.title || t('admin.recipes.untitled');
      
      if (actionType === 'approve') {
        return {
          icon: "checkmark-circle",
          iconColor: "#4caf50",
          title: t('admin.recipes.approveConfirm.title'),
          message: t('admin.recipes.approveConfirm.message', { title: localizedTitle }),
          confirmText: t('admin.recipes.approve'),
          confirmColor: "#4caf50"
        };
      } else if (actionType === 'delete') {
        return {
          icon: "trash-outline",
          iconColor: "#e74c3c",
          title: t('admin.recipes.delete.title'),
          message: `${t('admin.recipes.delete.confirmMessage')} "${localizedTitle}"? ${t('admin.recipes.delete.warning')}`,
          confirmText: t('admin.recipes.delete.button'),
          confirmColor: "#e74c3c"
        };
      }
      return null;
    };

    const content = getDialogContent();
    if (!content) return null;

    return (
      <Modal
        visible={showActionDialog}
        transparent
        animationType="none"
        onRequestClose={hideActionDialog}
      >
        <View style={styles.dialogOverlay}>
          <Animated.View style={[styles.dialogContainer, { 
            backgroundColor: colors.card,
            opacity,
            transform: [{ translateY }] 
          }]}>
            <View style={[styles.dialogIcon, { backgroundColor: `${content.iconColor}20` }]}>
              <Ionicons name={content.icon} size={48} color={content.iconColor} />
            </View>
            
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {content.title}
            </Text>
            
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
              {content.message}
            </Text>
            
            {actionLoading && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color={content.iconColor} />
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {t('admin.recipes.processing')}
                </Text>
              </View>
            )}
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={[styles.dialogButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={hideActionDialog}
                disabled={actionLoading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dialogButton, { backgroundColor: content.confirmColor }]}
                onPress={handleActionConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {content.confirmText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const renderRecipeItem = ({ item }) => {
    const localizedTitle = getLocalizedText('title', item);
    const localizedCategory = getLocalizedText('category', item);
    const localizedDescription = getLocalizedText('description', item);
    
    return (
      <TouchableOpacity 
        style={[styles.recipeCard, { backgroundColor: colors.card }]}
        onPress={() => navigateToRecipeDetail(item)}
        activeOpacity={0.9}
      >
        <View style={styles.recipeHeader}>
          <View style={styles.recipeInfo}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.approved) }]}>
              <Ionicons name={getStatusIcon(item.approved)} size={12} color="#fff" />
              <Text style={styles.statusText}>
                {item.approved ? t('admin.recipes.status.approved') : t('admin.recipes.status.pending')}
              </Text>
            </View>
            <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={2}>
              {localizedTitle || item.title || t('admin.recipes.untitled')}
            </Text>
          </View>
        </View>
        
        {localizedDescription ? (
          <Text style={[styles.recipeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {localizedDescription}
          </Text>
        ) : null}
        
        <View style={styles.recipeDetails}>
          <Text style={[styles.recipeCategory, { color: colors.primary }]}>
            {localizedCategory || item.category || t('admin.recipes.uncategorized')}
          </Text>
          <Text style={[styles.recipeAuthor, { color: colors.textSecondary }]}>
            {t('admin.recipes.by')}: {item.authorName || item.authorEmail || t('common.unknown')}
          </Text>
        </View>

        <Text style={[styles.recipeDate, { color: colors.textSecondary }]}>
          {t('admin.recipes.created')}: {item.createdAt?.toDate?.()?.toLocaleDateString() || t('common.unknown')}
        </Text>
        
        <View style={styles.recipeActions}>
          {!item.approved && (
            <TouchableOpacity 
              style={styles.approveButton}
              onPress={(e) => {
                e.stopPropagation();
                showActionConfirmation(item, 'approve');
              }}
            >
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.approveButtonText}>{t('admin.recipes.approve')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.deleteRecipeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={(e) => {
              e.stopPropagation();
              showActionConfirmation(item, 'delete');
            }}
          >
            <Ionicons name="trash-outline" size={16} color="#e74c3c" />
            <Text style={styles.deleteRecipeText}>{t('admin.recipes.delete.button')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { 
        backgroundColor: colors.card, 
        borderColor: colors.border 
      }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('admin.recipes.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Recipe List */}
      {filteredRecipes.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <Ionicons name="restaurant-outline" size={80} color={colors.border} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {t('admin.recipes.emptyState.title')}
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
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
              colors={[colors.primary]}
              tintColor={colors.primary}
              title={t('common.pullToRefresh')}
              titleColor={colors.primary}
            />
          }
        />
      )}

      {/* Info Dialog */}
      <CustomDialog
        visible={showInfoDialog}
        title={dialogTitle}
        message={dialogMessage}
        icon={dialogIcon}
        onClose={() => setShowInfoDialog(false)}
      />

      {/* Action Dialog */}
      <ActionDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  recipeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    flex: 1,
  },
  recipeDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  recipeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  recipeAuthor: {
    fontSize: 14,
  },
  recipeDate: {
    fontSize: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Dialog Styles
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
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
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