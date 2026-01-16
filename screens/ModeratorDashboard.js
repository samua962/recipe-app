
// screens/ModeratorDashboard.js - FIXED VERSION WITH PROPER DARK MODE DIALOGS
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import CustomDialog from '../components/CustomDialog';
import { NotificationService } from '../services/notificationService';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function ModeratorDashboard({ navigation }) {
  const [pendingRecipes, setPendingRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogIcon, setDialogIcon] = useState('information-circle');
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [dialogAnimation] = useState(new Animated.Value(0));

  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    loadPendingRecipes();
  }, []);

  const getLocalizedText = (field, recipe) => {
    if (!recipe || !recipe[field]) return '';
    
    const fieldData = recipe[field];
    
    if (typeof fieldData === 'string') return fieldData;
    
    if (typeof fieldData === 'object' && fieldData !== null) {
      return fieldData[locale] || fieldData.en || fieldData.am || '';
    }
    
    return '';
  };

  const loadPendingRecipes = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'recipes'),
        where('approved', '==', false),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingRecipes(recipes);
    } catch (error) {
      console.error('Error loading pending recipes:', error);
      showCustomDialog(
        t('moderator.errors.loadFailed'), 
        `${t('moderator.errors.loadFailedMessage')} ${error.message}`, 
        "close-circle-outline"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPendingRecipes();
  }, []);

  const showCustomDialog = (title, message, icon = "information-circle-outline") => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogIcon(icon);
    setShowDialog(true);
  };

  // Custom Action Dialog
  const showActionConfirmation = (recipe, type) => {
    setCurrentRecipe(recipe);
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
      setCurrentRecipe(null);
      setActionType('');
    });
  };

  const handleActionConfirm = async () => {
    if (!currentRecipe) return;
    
    setActionLoading(true);
    
    try {
      if (actionType === 'approve') {
        await handleApproveAction(currentRecipe);
      } else if (actionType === 'reject') {
        await handleRejectAction(currentRecipe);
      }
    } finally {
      setActionLoading(false);
      hideActionDialog();
    }
  };

  const handleApproveAction = async (recipe) => {
    try {
      const recipeRef = doc(db, 'recipes', recipe.id);
      await updateDoc(recipeRef, {
        approved: true,
        reviewedAt: new Date(),
      });
      
      try {
        await NotificationService.notifyRecipeAuthor(
          recipe.authorId, 
          getLocalizedText('title', recipe) || recipe.title, 
          'approved'
        );
      } catch (notifyError) {
        console.error('Error notifying author:', notifyError);
      }
      
      showCustomDialog(
        t('moderator.success.title'), 
        t('moderator.success.approved'), 
        "checkmark-circle-outline"
      );
      loadPendingRecipes();
      
    } catch (error) {
      console.error('Error approving recipe:', error);
      showCustomDialog(
        t('moderator.errors.title'), 
        `${t('moderator.errors.approveFailed')} ${error.message}`, 
        "close-circle-outline"
      );
    }
  };

  const handleRejectAction = async (recipe) => {
    try {
      await deleteDoc(doc(db, 'recipes', recipe.id));
      
      try {
        await NotificationService.notifyRecipeAuthor(
          recipe.authorId, 
          getLocalizedText('title', recipe) || recipe.title, 
          'rejected'
        );
      } catch (notifyError) {
        console.error('Error notifying author:', notifyError);
      }
      
      showCustomDialog(
        t('moderator.success.title'), 
        t('moderator.success.rejected'), 
        "checkmark-circle-outline"
      );
      loadPendingRecipes();
    } catch (error) {
      console.error('Error rejecting recipe:', error);
      showCustomDialog(
        t('moderator.errors.title'), 
        `${t('moderator.errors.rejectFailed')} ${error.message}`, 
        "close-circle-outline"
      );
    }
  };

  const getImageSource = (recipe) => {
    if (recipe.imageBase64) {
      return { uri: `data:image/jpeg;base64,${recipe.imageBase64}` };
    } else if (recipe.imageURL) {
      return { uri: recipe.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  const navigateToRecipeDetail = (recipe) => {
    navigation.navigate('RecipeDetail', { recipe });
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
      const recipeTitle = getLocalizedText('title', currentRecipe) || currentRecipe?.title || 'Untitled Recipe';
      
      if (actionType === 'approve') {
        return {
          icon: "checkmark-circle-outline",
          iconColor: isDarkMode ? "#4caf50" : "#2e7d32",
          title: t('moderator.approveConfirm.title'),
          message: t('moderator.approveConfirm.message', { title: recipeTitle }),
          confirmText: t('moderator.approve'),
          confirmColor: isDarkMode ? "#4caf50" : "#2e7d32"
        };
      } else {
        return {
          icon: "close-circle-outline",
          iconColor: isDarkMode ? "#f44336" : "#c62828",
          title: t('moderator.rejectConfirm.title'),
          message: t('moderator.rejectConfirm.message', { title: recipeTitle }),
          confirmText: t('moderator.reject.button'),
          confirmColor: isDarkMode ? "#f44336" : "#c62828"
        };
      }
    };

    const content = getDialogContent();

    return (
      <Modal
        visible={showActionDialog}
        transparent
        animationType="none"
        onRequestClose={hideActionDialog}
      >
        <View style={[styles.dialogOverlay, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
          <Animated.View style={[styles.dialogContainer, { 
            backgroundColor: colors.card,
            opacity,
            transform: [{ translateY }],
            shadowColor: isDarkMode ? '#000' : colors.primary,
          }]}>
            <View style={[
              styles.dialogIcon, 
              { backgroundColor: isDarkMode ? `${content.iconColor}20` : `${content.iconColor}10` }
            ]}>
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
                  {t('moderator.processing')}
                </Text>
              </View>
            )}
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={[
                  styles.dialogButton, 
                  styles.cancelButton, 
                  { 
                    borderColor: colors.textSecondary,
                    backgroundColor: 'transparent'
                  }
                ]}
                onPress={hideActionDialog}
                disabled={actionLoading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.dialogButton, 
                  { 
                    backgroundColor: content.confirmColor,
                    shadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
                  }
                ]}
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
        style={[styles.recipeCard, { 
          backgroundColor: colors.card,
          shadowColor: isDarkMode ? '#000' : colors.primary,
        }]}
        onPress={() => navigateToRecipeDetail(item)}
        activeOpacity={0.9}
      >
        <Image source={getImageSource(item)} style={styles.recipeImage} />
        <View style={styles.recipeContent}>
          <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={2}>
            {localizedTitle || item.title || 'Untitled Recipe'}
          </Text>
          
          <Text style={[styles.recipeCategory, { color: colors.primary }]}>
            {localizedCategory || item.category || 'Uncategorized'}
          </Text>
          
          <Text style={[styles.recipeAuthor, { color: colors.textSecondary }]}>
            {t('moderator.byAuthor')}: {item.authorName || item.authorEmail || 'Unknown Author'}
          </Text>
          
          <Text style={[styles.recipeDate, { color: colors.textSecondary }]}>
            {t('moderator.submitted')}: {item.createdAt?.toDate?.()?.toLocaleDateString() || t('moderator.recently')}
          </Text>
          
          {localizedDescription ? (
            <Text style={[styles.recipeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {localizedDescription}
            </Text>
          ) : null}
          
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[
                styles.approveButton,
                { backgroundColor: isDarkMode ? '#2e7d32' : '#4caf50' }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                showActionConfirmation(item, 'approve');
              }}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.approveButtonText}>{t('moderator.approve')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.rejectButton,
                { backgroundColor: isDarkMode ? '#c62828' : '#f44336' }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                showActionConfirmation(item, 'reject');
              }}
            >
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.rejectButtonText}>{t('moderator.reject.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{t('moderator.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { 
        backgroundColor: colors.card,
        borderBottomColor: colors.border,
        shadowColor: isDarkMode ? '#000' : colors.primary,
      }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('moderator.title')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {pendingRecipes.length} {t('moderator.pendingRecipes')}
        </Text>
      </View>

      {pendingRecipes.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <Ionicons 
            name="checkmark-done-circle-outline" 
            size={80} 
            color={colors.border} 
          />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {t('moderator.emptyState.title')}
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {t('moderator.emptyState.message')}
          </Text>
          
          <TouchableOpacity 
            style={[styles.refreshButton, { 
              backgroundColor: colors.card, 
              borderColor: colors.primary 
            }]}
            onPress={onRefresh}
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
            <Text style={[styles.refreshButtonText, { color: colors.primary }]}>
              {t('common.refresh')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pendingRecipes}
          renderItem={renderRecipeItem}
          keyExtractor={item => item.id}
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
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* CustomDialog for success/error messages */}
      <CustomDialog
        visible={showDialog}
        title={dialogTitle}
        message={dialogMessage}
        icon={dialogIcon}
        onClose={() => setShowDialog(false)}
        confirmColor={dialogIcon === 'checkmark-circle-outline' ? 
          (isDarkMode ? '#4caf50' : '#2e7d32') : 
          (dialogIcon === 'close-circle-outline' ? 
            (isDarkMode ? '#f44336' : '#c62828') : 
            colors.primary)}
      />

      {/* Custom Action Dialog */}
      <ActionDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  refreshButtonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  recipeCard: {
    borderRadius: 12,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  recipeImage: {
    width: '100%',
    height: 150,
  },
  recipeContent: {
    padding: 16,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recipeCategory: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeAuthor: {
    fontSize: 14,
    marginBottom: 2,
  },
  recipeDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  // Custom Dialog Styles
  dialogOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
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
