// screens/MyRecipesScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLocalizedRecipes } from "../hooks/useLocalizedRecipes";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const TABS = [
  { id: 'all', label: 'All', icon: 'albums-outline' },
  { id: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
  { id: 'pending', label: 'Pending', icon: 'time-outline' },
  // { id: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
];

export default function MyRecipesScreen() {
  const navigation = useNavigation();
  const { t, locale } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const { getLocalizedRecipe } = useLocalizedRecipes();
  
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [dialogAnimation] = useState(new Animated.Value(0));
  
  const currentUser = auth.currentUser;

  // Load recipes
  const loadRecipes = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      const recipesRef = collection(db, "recipes");
      let q;
      
      // Build query based on active tab
      if (activeTab === 'approved') {
        q = query(
          recipesRef,
          where("authorId", "==", currentUser.uid),
          where("approved", "==", true),
          orderBy("createdAt", "desc")
        );
      } else if (activeTab === 'pending') {
        q = query(
          recipesRef,
          where("authorId", "==", currentUser.uid),
          where("approved", "==", false),
          orderBy("createdAt", "desc")
        );
      } else {
        // All recipes
        q = query(
          recipesRef,
          where("authorId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
      }
      
      const snapshot = await getDocs(q);
      const recipeList = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      
      setRecipes(recipeList);
    } catch (error) {
      console.error("Error loading recipes:", error);
      Alert.alert(
        t('myRecipes.errors.loadTitle'),
        t('myRecipes.errors.loadMessage')
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, activeTab, t]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecipes();
  }, [loadRecipes]);

  // Filter recipes by search query
  const filteredRecipes = recipes.filter(recipe => {
    if (!searchQuery.trim()) return true;
    
    const localizedRecipe = getLocalizedRecipe(recipe);
    const searchTerm = searchQuery.toLowerCase();
    
    return (
      localizedRecipe.title?.toLowerCase().includes(searchTerm) ||
      localizedRecipe.description?.toLowerCase().includes(searchTerm) ||
      localizedRecipe.category?.toLowerCase().includes(searchTerm)
    );
  });

  // Handle recipe press
  const handleRecipePress = (recipe) => {
    navigation.navigate('RecipeDetail', { recipe });
  };

  // Handle edit recipe
  const handleEditRecipe = (recipe) => {
    // Navigate to EditRecipe screen (you'll need to create this)
    // navigation.navigate('EditRecipe', { recipe });
    Alert.alert(
      t('myRecipes.comingSoon.title'),
      t('myRecipes.comingSoon.edit'),
      [{ text: t('common.ok') }]
    );
  };

  // Show delete confirmation dialog
  const showDeleteConfirmation = (recipe) => {
    setSelectedRecipe(recipe);
    setShowDeleteDialog(true);
    Animated.spring(dialogAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  // Hide delete dialog
  const hideDeleteDialog = () => {
    Animated.timing(dialogAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowDeleteDialog(false);
      setSelectedRecipe(null);
    });
  };

  // Handle delete recipe
  const handleDeleteRecipe = async () => {
    if (!selectedRecipe) return;
    
    try {
      await deleteDoc(doc(db, "recipes", selectedRecipe.id));
      
      // Update local state
      setRecipes(prev => prev.filter(recipe => recipe.id !== selectedRecipe.id));
      
      Alert.alert(
        t('myRecipes.success.deleteTitle'),
        t('myRecipes.success.deleteMessage'),
        [{ text: t('common.ok') }]
      );
    } catch (error) {
      console.error("Error deleting recipe:", error);
      Alert.alert(
        t('myRecipes.errors.deleteTitle'),
        t('myRecipes.errors.deleteMessage')
      );
    } finally {
      hideDeleteDialog();
    }
  };

  // Get image source
  const getImageSource = (recipe) => {
    if (recipe.imageBase64) {
      return { uri: `data:image/jpeg;base64,${recipe.imageBase64}` };
    } else if (recipe.imageURL) {
      return { uri: recipe.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "";
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now - d);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return t('common.today');
      if (diffDays === 1) return t('common.yesterday');
      if (diffDays < 7) return `${diffDays} ${t('common.daysAgo')}`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${t('common.weeksAgo')}`;
      
      return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'am-ET', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return "";
    }
  };

  // Render recipe card
  const renderRecipeCard = ({ item, index }) => {
    const localizedRecipe = getLocalizedRecipe(item);
    
    return (
      <TouchableOpacity
        style={[
          styles.recipeCard,
          { 
            backgroundColor: colors.card,
            marginLeft: index % 2 === 0 ? 0 : 12,
            marginBottom: 12
          }
        ]}
        onPress={() => handleRecipePress(item)}
        activeOpacity={0.9}
      >
        {/* Recipe Image */}
        <Image source={getImageSource(item)} style={styles.recipeImage} />
        
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          { 
            backgroundColor: item.approved ? '#4CAF50' : '#FF9800',
          }
        ]}>
          <Ionicons 
            name={item.approved ? "checkmark-circle" : "time-outline"} 
            size={12} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {item.approved ? t('myRecipes.approved') : t('myRecipes.pending')}
          </Text>
        </View>
        
        {/* Recipe Info */}
        <View style={styles.recipeInfo}>
          <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={2}>
            {localizedRecipe.title}
          </Text>
          
          <Text style={[styles.recipeCategory, { color: colors.textSecondary }]} numberOfLines={1}>
            {localizedRecipe.category}
          </Text>
          
          <Text style={[styles.recipeDate, { color: colors.textSecondary }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        
        {/* Action Buttons */}
        <View style={[styles.actionButtons, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { borderRightColor: colors.border }]}
            onPress={() => handleEditRecipe(item)}
          >
            <Ionicons name="create-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              {t('myRecipes.edit')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => showDeleteConfirmation(item)}
          >
            <Ionicons name="trash-outline" size={18} color="#E53935" />
            <Text style={[styles.actionButtonText, { color: "#E53935" }]}>
              {t('myRecipes.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Delete Dialog Component
  const DeleteDialog = () => {
    const translateY = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });

    const opacity = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    if (!selectedRecipe) return null;

    const localizedRecipe = getLocalizedRecipe(selectedRecipe);

    return (
      <Modal
        visible={showDeleteDialog}
        transparent
        animationType="none"
        onRequestClose={hideDeleteDialog}
      >
        <View style={styles.dialogOverlay}>
          <Animated.View style={[styles.dialogContainer, { 
            backgroundColor: colors.card,
            opacity,
            transform: [{ translateY }] 
          }]}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(229, 57, 53, 0.1)" }]}>
              <Ionicons name="trash-outline" size={48} color="#E53935" />
            </View>
            
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {t('myRecipes.deleteDialog.title')}
            </Text>
            
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
              {t('myRecipes.deleteDialog.message', { title: localizedRecipe.title })}
            </Text>
            
            <Text style={[styles.dialogWarning, { color: "#E53935" }]}>
              {t('myRecipes.deleteDialog.warning')}
            </Text>
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={[styles.dialogButton, styles.cancelButton, { 
                  borderColor: colors.border,
                  backgroundColor: colors.background 
                }]}
                onPress={hideDeleteDialog}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dialogButton, styles.deleteButton, { backgroundColor: "#E53935" }]}
                onPress={handleDeleteRecipe}
              >
                <Text style={styles.deleteButtonText}>
                  {t('myRecipes.deleteDialog.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('myRecipes.title')}
        </Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('AddRecipe')}
        >
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t('myRecipes.searchPlaceholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsContainer, { backgroundColor: colors.card }]}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              { backgroundColor: colors.background ,height: 50, marginBottom: 10},
              activeTab === tab.id && [styles.activeTab, { backgroundColor: colors.primary }]
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons 
              name={tab.icon} 
              size={16} 
              color={activeTab === tab.id ? "#fff" : colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? "#fff" : colors.textSecondary }
            ]}>
              {t(`myRecipes.tabs.${tab.id}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recipe List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('myRecipes.loading')}
          </Text>
        </View>
      ) : filteredRecipes.length === 0 ? (
        <ScrollView 
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.emptyContainer}
        >
          <Ionicons 
            name={activeTab === 'approved' ? "checkmark-circle-outline" : "restaurant-outline"} 
            size={80} 
            color={colors.border} 
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {searchQuery 
              ? t('myRecipes.empty.search')
              : activeTab === 'approved' 
                ? t('myRecipes.empty.approved')
                : activeTab === 'pending'
                  ? t('myRecipes.empty.pending')
                  : t('myRecipes.empty.all')
            }
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {searchQuery 
              ? t('myRecipes.empty.searchHint')
              : activeTab === 'approved' 
                ? t('myRecipes.empty.approvedHint')
                : activeTab === 'pending'
                  ? t('myRecipes.empty.pendingHint')
                  : t('myRecipes.empty.allHint')
            }
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('AddRecipe')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>
                {t('myRecipes.empty.addRecipe')}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipeCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.recipesGrid}
          columnWrapperStyle={styles.recipeRow}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsText, { color: colors.text }]}>
                {t('myRecipes.results', { count: filteredRecipes.length })}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 30 }} />}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.floatingAddButton, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('AddRecipe')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Delete Dialog */}
      <DeleteDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addButton: {
    padding: 8,
    marginRight: -8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    paddingVertical: 12,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  activeTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: "500",
  },
  recipesGrid: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  recipeRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  recipeCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImage: {
    width: "100%",
    height: 120,
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  recipeInfo: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    lineHeight: 18,
    height: 36,
  },
  recipeCategory: {
    fontSize: 12,
    marginBottom: 4,
  },
  recipeDate: {
    fontSize: 10,
    fontStyle: "italic",
  },
  actionButtons: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    borderRightWidth: 1,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Dialog styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogContainer: {
    width: "85%",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  dialogMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 8,
  },
  dialogWarning: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 24,
  },
  dialogButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: "#E53935",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});