// screens/ModeratorDashboard.js - FIXED MULTI-LANGUAGE ISSUES
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

export default function ModeratorDashboard() {
  const [pendingRecipes, setPendingRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  const { locale, t } = useLanguage();

  useEffect(() => {
    loadPendingRecipes();
  }, []);

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
      showCustomDialog(t('moderator.errors.loadFailed'), `${t('moderator.errors.loadFailedMessage')} ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ADDED: Enhanced pull-to-refresh handler
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadPendingRecipes();
  }, []);

  const showCustomDialog = (title, message) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setShowDialog(true);
  };

  const handleApprove = async (recipeId, recipeTitle, authorId) => {
    try {
      const recipeRef = doc(db, 'recipes', recipeId);
      await updateDoc(recipeRef, {
        approved: true,
        reviewedAt: new Date(),
      });
      
      try {
        await NotificationService.notifyRecipeAuthor(authorId, recipeTitle, 'approved');
        console.log('Author notified about recipe approval');
      } catch (notifyError) {
        console.error('Error notifying author:', notifyError);
      }
      
      showCustomDialog(t('moderator.success.title'), t('moderator.success.approved'));
      loadPendingRecipes();
      
    } catch (error) {
      console.error('Error approving recipe:', error);
      showCustomDialog(t('moderator.errors.title'), `${t('moderator.errors.approveFailed')} ${error.message}`);
    }
  };

  const handleReject = async (recipeId, recipeTitle, authorId) => {
    Alert.alert(
      t('moderator.reject.title'),
      t('moderator.reject.confirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('moderator.reject.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              const recipeDoc = await getDoc(doc(db, 'recipes', recipeId));
              const recipeData = recipeDoc.data();
              
              await deleteDoc(doc(db, 'recipes', recipeId));
              
              try {
                await NotificationService.notifyRecipeAuthor(authorId, recipeTitle, 'rejected');
                console.log('Author notified about recipe rejection');
              } catch (notifyError) {
                console.error('Error notifying author:', notifyError);
              }
              
              showCustomDialog(t('moderator.success.title'), t('moderator.success.rejected'));
              loadPendingRecipes();
            } catch (error) {
              console.error('Error rejecting recipe:', error);
              showCustomDialog(t('moderator.errors.title'), `${t('moderator.errors.rejectFailed')} ${error.message}`);
            }
          },
        },
      ]
    );
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

  const renderRecipeItem = ({ item }) => {
    // Use the safe function to get localized text
    const localizedTitle = getLocalizedText('title', item);
    const localizedCategory = getLocalizedText('category', item);
    const localizedDescription = getLocalizedText('description', item);
    
    return (
      <View style={styles.recipeCard}>
        <Image source={getImageSource(item)} style={styles.recipeImage} />
        <View style={styles.recipeContent}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {localizedTitle || item.title || 'Untitled Recipe'}
          </Text>
          
          <Text style={styles.recipeCategory}>
            {localizedCategory || item.category || 'Uncategorized'}
          </Text>
          
          <Text style={styles.recipeAuthor}>
            {t('moderator.byAuthor')}: {item.authorName || item.authorEmail || 'Unknown Author'}
          </Text>
          
          <Text style={styles.recipeDate}>
            {t('moderator.submitted')}: {item.createdAt?.toDate?.()?.toLocaleDateString() || t('moderator.recently')}
          </Text>
          
          {/* ADDED: Description preview */}
          {localizedDescription ? (
            <Text style={styles.recipeDescription} numberOfLines={2}>
              {localizedDescription}
            </Text>
          ) : null}
          
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={styles.approveButton}
              onPress={() => handleApprove(item.id, localizedTitle || item.title, item.authorId)}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.approveButtonText}>{t('moderator.approve')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.rejectButton}
              onPress={() => handleReject(item.id, localizedTitle || item.title, item.authorId)}
            >
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.rejectButtonText}>{t('moderator.reject.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f37d1c" />
        <Text style={styles.loadingText}>{t('moderator.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('moderator.title')}</Text>
        <Text style={styles.headerSubtitle}>
          {pendingRecipes.length} {t('moderator.pendingRecipes')}
        </Text>
      </View>

      {pendingRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle" size={80} color="#ddd" />
          <Text style={styles.emptyStateTitle}>{t('moderator.emptyState.title')}</Text>
          <Text style={styles.emptyStateText}>{t('moderator.emptyState.message')}</Text>
          
          {/* ADDED: Refresh button for empty state */}
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={20} color="#f37d1c" />
            <Text style={styles.refreshButtonText}>{t('common.refresh')}</Text>
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
              colors={['#f37d1c']}
              tintColor="#f37d1c"
              title={t('common.pullToRefresh')}
              titleColor="#f37d1c"
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <CustomDialog
        visible={showDialog}
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => setShowDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f37d1c',
  },
  refreshButtonText: {
    color: '#f37d1c',
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
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
    color: '#333',
    marginBottom: 4,
  },
  recipeCategory: {
    fontSize: 14,
    color: '#f37d1c',
    fontWeight: '600',
    marginBottom: 4,
  },
  recipeAuthor: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  recipeDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 13,
    color: '#666',
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
    backgroundColor: '#4caf50',
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
    backgroundColor: '#f44336',
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
});