// screens/ExploreScreen.js - UPDATED WITH CONSISTENT CATEGORY HANDLING
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { collection, getDocs, query, orderBy, where, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import multi-language hooks and theme
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalizedRecipes } from '../hooks/useLocalizedRecipes';
import { useTheme } from '../contexts/ThemeContext';
import { useNetwork } from '../contexts/NetworkContext';
import OfflineBanner from '../components/OfflineBanner';

const { width, height } = Dimensions.get('window');

// CATEGORY DEFINITIONS - MATCHING AddRecipeScreen.js EXACTLY
const CATEGORIES = [
  { id: 'breakfast', en: "Breakfast", am: "ቁርስ", icon: 'cafe' },
  { id: 'lunch', en: "Lunch", am: "ምሳ", icon: 'restaurant' },
  { id: 'dinner', en: "Dinner", am: "እራት", icon: 'moon' },
  { id: 'dessert', en: "Dessert", am: "ምርጥ ምግብ", icon: 'ice-cream' },
  { id: 'drinks', en: "Drinks", am: "መጠጦች", icon: 'wine' },
  { id: 'vegetarian', en: "Vegetarian", am: "አትክልት", icon: 'leaf' },
  { id: 'meat', en: "Meat", am: "ስጋ ምግብ", icon: 'pizza' },
  { id: 'appetizer', en: "Appetizer", am: "መግቢያ", icon: 'fast-food' }
];

export default function ExploreScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [trendingRecipes, setTrendingRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const scrollY = useRef(new Animated.Value(0)).current;

  // Multi-language hooks
  const { locale, t } = useLanguage();
  const { getLocalizedRecipes, getLocalizedRecipe } = useLocalizedRecipes();
  
  // Theme hook
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  // Network hook
  const { isOnline, refreshNetworkStatus, isLoading: networkLoading } = useNetwork();

  // UPDATED FILTERS - Using same categories as AddRecipeScreen
  const filters = [
    { id: 'all', name: t('categories.all'), icon: 'grid' },
    ...CATEGORIES.map(cat => ({
      id: cat.id,
      name: t(`categories.${cat.id}`),
      icon: cat.icon
    })),
    { id: 'quick', name: t('explore.quick'), icon: 'flash' },
  ];

  const difficultyLevels = [
    { id: 'easy', name: t('explore.easy'), color: '#4caf50' },
    { id: 'medium', name: t('explore.medium'), color: '#ff9800' },
    { id: 'hard', name: t('explore.hard'), color: '#f44336' },
  ];

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    filterRecipes();
  }, [searchQuery, selectedFilter, recipes]);

  // Helper function to get category from recipe (consistent with AddRecipeScreen)
  const getRecipeCategory = (recipe) => {
    if (!recipe.category) return '';
    
    // If category is stored as multi-language object (new format)
    if (typeof recipe.category === 'object') {
      return recipe.category[locale] || recipe.category.en || recipe.category.am || '';
    }
    
    // If category is stored as string (old format)
    return recipe.category;
  };

  // Helper function to get normalized category ID for filtering
  const getNormalizedCategoryId = (recipe) => {
    const categoryString = getRecipeCategory(recipe).toLowerCase().trim();
    if (!categoryString) return '';
    
    // Try to match with predefined categories
    for (const cat of CATEGORIES) {
      if (categoryString === cat.en.toLowerCase() || categoryString === cat.am) {
        return cat.id;
      }
    }
    
    // Try partial matching
    if (categoryString.includes('breakfast') || categoryString.includes('ቁርስ')) return 'breakfast';
    if (categoryString.includes('lunch') || categoryString.includes('ምሳ')) return 'lunch';
    if (categoryString.includes('dinner') || categoryString.includes('እራት')) return 'dinner';
    if (categoryString.includes('dessert') || categoryString.includes('ምርጥ')) return 'dessert';
    if (categoryString.includes('drink') || categoryString.includes('መጠጥ')) return 'drinks';
    if (categoryString.includes('vegetarian') || categoryString.includes('አትክልት')) return 'vegetarian';
    if (categoryString.includes('meat') || categoryString.includes('ስጋ')) return 'meat';
    if (categoryString.includes('appetizer') || categoryString.includes('መግቢያ')) return 'appetizer';
    
    return '';
  };

  // Helper function to get title as string
  const getTitleString = (recipe) => {
    if (!recipe.title) return t('explore.untitledRecipe');
    
    // If title is stored as multi-language object
    if (typeof recipe.title === 'object') {
      return recipe.title[locale] || recipe.title.en || t('explore.untitledRecipe');
    }
    
    // If title is stored as string (old format)
    return recipe.title || t('explore.untitledRecipe');
  };

  // Helper function to get description as string
  const getDescriptionString = (recipe) => {
    if (!recipe.description) return t('explore.noDescription');
    
    // If description is stored as multi-language object
    if (typeof recipe.description === 'object') {
      return recipe.description[locale] || recipe.description.en || t('explore.noDescription');
    }
    
    // If description is stored as string (old format)
    return recipe.description || t('explore.noDescription');
  };

  // Handle retry connection
  const handleRetryConnection = async () => {
    const connected = await refreshNetworkStatus();
    if (connected) {
      loadRecipes();
    }
  };

  // Handle go to favourites
  const handleGoToFavourites = () => {
    navigation.navigate('Saved');
  };

  const loadRecipes = async () => {
    // Check if offline
    if (!isOnline) {
      console.log('Offline mode - recipes not loaded');
      setLoading(false);
      setRefreshing(false);
      setRecipes([]);
      setFilteredRecipes([]);
      setTrendingRecipes([]);
      return;
    }

    try {
      setRefreshing(true);
      
      // Load all approved recipes
      const recipesQuery = query(
        collection(db, 'recipes'),
        where('approved', '==', true),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      const snapshot = await getDocs(recipesQuery);
      const recipesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRecipes(recipesList);
      
      // Set trending recipes (first 6 for demo)
      setTrendingRecipes(recipesList.slice(0, 6));
      
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // UPDATED FILTER FUNCTION with consistent category handling
  const filterRecipes = () => {
    let filtered = [...recipes];

    // Apply search filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => {
        const title = getTitleString(recipe).toLowerCase();
        const description = getDescriptionString(recipe).toLowerCase();
        const category = getRecipeCategory(recipe).toLowerCase();
        
        // Check title, description, and category
        if (title.includes(queryLower) || 
            description.includes(queryLower) || 
            category.includes(queryLower)) {
          return true;
        }
        
        // Check ingredients
        if (recipe.ingredients) {
          let ingredientsText = '';
          
          if (typeof recipe.ingredients === 'object') {
            ingredientsText = recipe.ingredients[locale] || recipe.ingredients.en || '';
          } else {
            ingredientsText = recipe.ingredients || '';
          }
          
          if (ingredientsText.toLowerCase().includes(queryLower)) {
            return true;
          }
        }
        
        return false;
      });
    }

    // Apply category filter with consistent handling
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'quick') {
        filtered = filtered.filter(recipe => 
          recipe.cookingTime && parseInt(recipe.cookingTime) <= 30
        );
      } else {
        filtered = filtered.filter(recipe => {
          const normalizedCategoryId = getNormalizedCategoryId(recipe);
          return normalizedCategoryId === selectedFilter;
        });
      }
    }

    setFilteredRecipes(filtered);
  };

  const onRefresh = React.useCallback(() => {
    // Don't refresh if offline
    if (!isOnline) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    loadRecipes();
  }, [isOnline]);

  const getImageSource = (item) => {
    if (item?.imageBase64) {
      return { uri: `data:image/jpeg;base64,${item.imageBase64}` };
    } else if (item?.imageURL) {
      return { uri: item.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  const getDifficultyColor = (difficulty) => {
    const level = difficultyLevels.find(level => level.id === difficulty);
    return level ? level.color : '#666';
  };

  const renderRecipeGrid = ({ item }) => {
    const category = getRecipeCategory(item);
    const title = getTitleString(item);
    
    return (
      <TouchableOpacity
        style={[styles.recipeGridCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
        activeOpacity={0.9}
      >
        <Image 
          source={getImageSource(item)} 
          style={styles.recipeGridImage}
          defaultSource={require('../assets/placeholder-image.jpg')}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.recipeGridGradient}
        />
        <View style={styles.recipeGridContent}>
          <Text style={styles.recipeGridTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.recipeGridMeta}>
            <View style={[styles.recipeGridCategory, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="pricetag" size={10} color="#fff" />
              <Text style={styles.recipeGridCategoryText}>
                {category || t('categories.all')}
              </Text>
            </View>
            <View style={[
              styles.difficultyBadge,
              { backgroundColor: getDifficultyColor(item?.difficulty) }
            ]}>
              <Text style={styles.difficultyText}>
                {item?.difficulty || t('explore.easy')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecipeList = ({ item }) => {
    const category = getRecipeCategory(item);
    const title = getTitleString(item);
    const description = getDescriptionString(item);
    
    return (
      <TouchableOpacity
        style={[styles.recipeListItem, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
        activeOpacity={0.9}
      >
        <Image 
          source={getImageSource(item)} 
          style={styles.recipeListImage}
          defaultSource={require('../assets/placeholder-image.jpg')}
        />
        <View style={styles.recipeListContent}>
          <Text style={[styles.recipeListTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.recipeListDescription, { color: colors.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
          <View style={styles.recipeListMeta}>
            <View style={styles.recipeListMetaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.recipeListMetaText, { color: colors.textSecondary }]}>{item?.cookingTime || '30'} {t('recipe.minutes')}</Text>
            </View>
            <View style={styles.recipeListMetaItem}>
              <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.recipeListMetaText, { color: colors.textSecondary }]}>{item?.servings || '4'} {t('recipe.servingsUnit')}</Text>
            </View>
            <View style={[
              styles.difficultyBadgeList,
              { backgroundColor: getDifficultyColor(item?.difficulty) }
            ]}>
              <Text style={styles.difficultyTextList}>
                {item?.difficulty || t('explore.easy')}
              </Text>
            </View>
          </View>
          <View style={styles.recipeListFooter}>
            <Text style={[styles.recipeListCategory, { color: colors.primary }]}>
              {category || t('categories.all')}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>4.5</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterItem,
        { backgroundColor: colors.card, borderColor: colors.border },
        selectedFilter === item.id && [styles.activeFilterItem, { backgroundColor: colors.primary, borderColor: colors.primary }],
      ]}
      onPress={() => setSelectedFilter(item.id)}
    >
      <Ionicons 
        name={item.icon} 
        size={18} 
        color={selectedFilter === item.id ? "#fff" : colors.textSecondary} 
      />
      <Text style={[
        styles.filterText,
        { color: colors.textSecondary },
        selectedFilter === item.id && styles.activeFilterText,
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const RecipesGridView = () => (
    <FlatList
      data={filteredRecipes}
      renderItem={renderRecipeGrid}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      numColumns={2}
      contentContainerStyle={styles.recipesGrid}
      columnWrapperStyle={styles.recipesRow}
      key="grid"
    />
  );

  const RecipesListView = () => (
    <FlatList
      data={filteredRecipes}
      renderItem={renderRecipeList}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      contentContainerStyle={styles.recipesList}
      key="list"
    />
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [180, 120],
    extrapolate: 'clamp',
  });

  if ((loading && !refreshing) || networkLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{t('explore.loadingRecipes')}</Text>
      </View>
    );
  }

  const getResultsText = () => {
    // Different message when offline
    if (!isOnline) {
      return t('offline.exploreOffline');
    }
    
    let text = `${filteredRecipes.length} ${t('explore.recipesFound')}`;
    
    if (searchQuery) {
      text += ` ${t('explore.for')} "${searchQuery}"`;
    }
    
    if (selectedFilter !== 'all' && selectedFilter !== 'quick') {
      const filter = filters.find(f => f.id === selectedFilter);
      text += ` ${t('explore.in')} ${filter?.name}`;
    }
    
    if (selectedFilter === 'quick') {
      text += ` ${t('explore.in')} ${t('explore.quick')}`;
    }
    
    return text;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: headerOpacity,
          height: headerHeight,
        }
      ]}>
        <LinearGradient
          colors={[colors.primary, '#ff9d4d']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>{t('explore.title')}</Text>
              <Text style={styles.headerSubtitle}>
                {!isOnline ? t('offline.mode') : t('explore.subtitle', { count: recipes.length })}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {/* Dark Mode Toggle Button */}
              <TouchableOpacity 
                style={[styles.viewModeButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={toggleTheme}
              >
                <Ionicons 
                  name={isDarkMode ? "sunny" : "moon"} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.viewModeButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Ionicons 
                  name={viewMode === 'grid' ? 'list' : 'grid'} 
                  size={20} 
                  color="#fff" 
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title={t('home.pullToRefresh')}
            titleColor={colors.primary}
            enabled={isOnline}
          />
        }
      >
        {/* Offline Banner */}
        {!isOnline && (
          <OfflineBanner 
            onRetry={handleRetryConnection}
            onGoToFavourites={handleGoToFavourites}
            showFavouritesButton={true}
          />
        )}

        {/* Search Bar - Only show if online */}
        {isOnline && (
          <View style={styles.searchContainer}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={t('explore.searchPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                editable={isOnline}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        {/* Offline Message if no recipes */}
        {!isOnline && recipes.length === 0 && (
          <View style={[styles.offlineMessage, { backgroundColor: colors.card }]}>
            <Ionicons name="cloud-offline-outline" size={50} color={colors.textSecondary} />
            <Text style={[styles.offlineMessageTitle, { color: colors.text }]}>
              {t('offline.exploreOfflineTitle')}
            </Text>
            <Text style={[styles.offlineMessageText, { color: colors.textSecondary }]}>
              {t('offline.exploreOfflineMessage')}
            </Text>
            <TouchableOpacity 
              style={[styles.offlineActionButton, { backgroundColor: colors.primary }]}
              onPress={handleGoToFavourites}
            >
              <Ionicons name="heart" size={20} color="#fff" />
              <Text style={styles.offlineActionButtonText}>
                {t('offline.goToFavourites')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Filters - Only show if online */}
        {isOnline && recipes.length > 0 && (
          <View style={styles.filtersSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('explore.quickFilters')}</Text>
            <FlatList
              data={filters}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContainer}
              renderItem={renderFilterItem}
            />
          </View>
        )}

        {/* Recipe Count */}
        <View style={styles.resultsSection}>
          <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
            {getResultsText()}
          </Text>
        </View>

        {/* Recipes Grid/List - Only show if online and has recipes */}
        {isOnline && filteredRecipes.length > 0 ? (
          <View style={styles.recipesSection}>
            {viewMode === 'grid' ? (
              <RecipesGridView key="grid-view" />
            ) : (
              <RecipesListView key="list-view" />
            )}
          </View>
        ) : (
          // Different empty state for offline
          !isOnline ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={80} color={colors.border} />
              <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t('explore.noRecipesFound')}</Text>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                {searchQuery 
                  ? t('explore.noResultsForSearch', { query: searchQuery })
                  : t('explore.tryDifferentFilter')
                }
              </Text>
              <TouchableOpacity 
                style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                }}
              >
                <Text style={styles.emptyStateButtonText}>{t('explore.showAllRecipes')}</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {/* Difficulty Guide - Only show if online */}
        {isOnline && recipes.length > 0 && (
          <View style={[styles.guideSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('explore.difficultyGuide')}</Text>
            <View style={styles.difficultyGuide}>
              {difficultyLevels.map(level => (
                <View key={level.id} style={styles.difficultyGuideItem}>
                  <View style={[styles.difficultyDot, { backgroundColor: level.color }]} />
                  <Text style={[styles.difficultyGuideText, { color: colors.textSecondary }]}>{level.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 12,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  offlineMessage: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  offlineMessageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  offlineMessageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  offlineActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  offlineActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filtersContainer: {
    paddingHorizontal: 20,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
  },
  activeFilterItem: {
    borderColor: '#f37d1c',
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  activeFilterText: {
    color: "#fff",
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  resultsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  recipesSection: {
    marginBottom: 30,
  },
  recipesGrid: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recipesRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recipeGridCard: {
    width: (width - 48) / 2,
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  recipeGridImage: {
    width: "100%",
    height: "100%",
  },
  recipeGridGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  recipeGridContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  recipeGridTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 18,
  },
  recipeGridMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeGridCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recipeGridCategoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recipesList: {
    paddingHorizontal: 20,
  },
  recipeListItem: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recipeListImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  recipeListContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  recipeListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recipeListDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  recipeListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recipeListMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  recipeListMetaText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  difficultyBadgeList: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyTextList: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recipeListFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipeListCategory: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  guideSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 20,
  },
  difficultyGuide: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  difficultyGuideItem: {
    alignItems: 'center',
  },
  difficultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  difficultyGuideText: {
    fontSize: 12,
    fontWeight: '500',
  },
});