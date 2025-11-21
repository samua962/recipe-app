// screens/ExploreScreen.js - FIXED VERSION
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

// Import multi-language hooks
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalizedRecipes } from '../hooks/useLocalizedRecipes';
import LanguageSwitcher from '../components/LanguageSwitcher';

const { width, height } = Dimensions.get('window');

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

  const filters = [
    { id: 'all', name: t('categories.all'), icon: 'grid' },
    { id: 'breakfast', name: t('categories.breakfast'), icon: 'cafe' },
    { id: 'lunch', name: t('categories.lunch'), icon: 'restaurant' },
    { id: 'dinner', name: t('categories.dinner'), icon: 'moon' },
    { id: 'dessert', name: t('categories.dessert'), icon: 'ice-cream' },
    { id: 'vegetarian', name: t('categories.vegetarian'), icon: 'leaf' },
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

  const loadRecipes = async () => {
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

  // Helper function to get category as string (handles both single and multi-language)
  const getCategoryString = (recipe) => {
    if (!recipe.category) return '';
    
    // If category is stored as multi-language object
    if (typeof recipe.category === 'object') {
      return recipe.category[locale] || recipe.category.en || '';
    }
    
    // If category is stored as string (old format)
    return recipe.category || '';
  };

  // Helper function to get title as string (handles both single and multi-language)
  const getTitleString = (recipe) => {
    if (!recipe.title) return t('explore.untitledRecipe');
    
    // If title is stored as multi-language object
    if (typeof recipe.title === 'object') {
      return recipe.title[locale] || recipe.title.en || t('explore.untitledRecipe');
    }
    
    // If title is stored as string (old format)
    return recipe.title || t('explore.untitledRecipe');
  };

  // Helper function to get description as string (handles both single and multi-language)
  const getDescriptionString = (recipe) => {
    if (!recipe.description) return t('explore.noDescription');
    
    // If description is stored as multi-language object
    if (typeof recipe.description === 'object') {
      return recipe.description[locale] || recipe.description.en || t('explore.noDescription');
    }
    
    // If description is stored as string (old format)
    return recipe.description || t('explore.noDescription');
  };

  const filterRecipes = () => {
    let filtered = [...recipes];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(recipe => {
        const query = searchQuery.toLowerCase();
        
        // Check title
        const title = getTitleString(recipe);
        if (title.toLowerCase().includes(query)) {
          return true;
        }
        
        // Check description
        const description = getDescriptionString(recipe);
        if (description.toLowerCase().includes(query)) {
          return true;
        }
        
        // Check category
        const category = getCategoryString(recipe);
        if (category.toLowerCase().includes(query)) {
          return true;
        }
        
        // Check ingredients
        if (recipe.ingredients) {
          let ingredientsText = '';
          
          // Handle both multi-language and single-language ingredients
          if (typeof recipe.ingredients === 'object') {
            ingredientsText = recipe.ingredients[locale] || recipe.ingredients.en || '';
          } else {
            ingredientsText = recipe.ingredients || '';
          }
          
          if (ingredientsText.toLowerCase().includes(query)) {
            return true;
          }
        }
        
        return false;
      });
    }

    // Apply category filter - FIXED: Handle multi-language categories
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'quick') {
        filtered = filtered.filter(recipe => 
          recipe.cookingTime && parseInt(recipe.cookingTime) <= 30
        );
      } else if (selectedFilter === 'vegetarian') {
        filtered = filtered.filter(recipe => {
          const category = getCategoryString(recipe);
          return recipe.tags?.includes('vegetarian') || 
                 category.toLowerCase().includes('vegetarian');
        });
      } else {
        filtered = filtered.filter(recipe => {
          const category = getCategoryString(recipe);
          return category.toLowerCase() === selectedFilter.toLowerCase();
        });
      }
    }

    setFilteredRecipes(filtered);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadRecipes();
  }, []);

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
    const localizedRecipe = getLocalizedRecipe(item);
    const category = getCategoryString(item);
    const title = getTitleString(item);
    
    return (
      <TouchableOpacity
        style={styles.recipeGridCard}
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
            <View style={styles.recipeGridCategory}>
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
    const localizedRecipe = getLocalizedRecipe(item);
    const category = getCategoryString(item);
    const title = getTitleString(item);
    const description = getDescriptionString(item);
    
    return (
      <TouchableOpacity
        style={styles.recipeListItem}
        onPress={() => navigation.navigate('RecipeDetail', { recipe: item })}
        activeOpacity={0.9}
      >
        <Image 
          source={getImageSource(item)} 
          style={styles.recipeListImage}
          defaultSource={require('../assets/placeholder-image.jpg')}
        />
        <View style={styles.recipeListContent}>
          <Text style={styles.recipeListTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.recipeListDescription} numberOfLines={2}>
            {description}
          </Text>
          <View style={styles.recipeListMeta}>
            <View style={styles.recipeListMetaItem}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.recipeListMetaText}>{item?.cookingTime || '30'} {t('recipe.minutes')}</Text>
            </View>
            <View style={styles.recipeListMetaItem}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.recipeListMetaText}>{item?.servings || '4'} {t('recipe.servingsUnit')}</Text>
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
            <Text style={styles.recipeListCategory}>
              {category || t('categories.all')}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>4.5</Text>
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
        selectedFilter === item.id && styles.activeFilterItem,
      ]}
      onPress={() => setSelectedFilter(item.id)}
    >
      <Ionicons 
        name={item.icon} 
        size={18} 
        color={selectedFilter === item.id ? "#fff" : "#666"} 
      />
      <Text style={[
        styles.filterText,
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

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ActivityIndicator size="large" color="#f37d1c" />
        <Text style={styles.loadingText}>{t('explore.loadingRecipes')}</Text>
      </View>
    );
  }

  const getResultsText = () => {
    let text = `${filteredRecipes.length} ${t('explore.recipesFound')}`;
    
    if (searchQuery) {
      text += ` ${t('explore.for')} "${searchQuery}"`;
    }
    
    if (selectedFilter !== 'all') {
      const filter = filters.find(f => f.id === selectedFilter);
      text += ` ${t('explore.in')} ${filter?.name}`;
    }
    
    return text;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Animated Header */}
      <Animated.View style={[
        styles.header,
        {
          opacity: headerOpacity,
          height: headerHeight,
        }
      ]}>
        <LinearGradient
          colors={['#f37d1c', '#ff9d4d']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>{t('explore.title')}</Text>
              <Text style={styles.headerSubtitle}>
                {t('explore.subtitle', { count: recipes.length })}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {/* <LanguageSwitcher /> */}
              <TouchableOpacity 
                style={styles.viewModeButton}
                onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                <Ionicons 
                  name={viewMode === 'grid' ? 'list' : 'grid'} 
                  size={24} 
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
            colors={['#f37d1c']}
            tintColor="#f37d1c"
            title={t('home.pullToRefresh')}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder={t('explore.searchPlaceholder')}
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
        </View>

        {/* Quick Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.sectionTitle}>{t('explore.quickFilters')}</Text>
          <FlatList
            data={filters}
            horizontal
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
            renderItem={renderFilterItem}
          />
        </View>

        {/* Recipe Count */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsText}>
            {getResultsText()}
          </Text>
        </View>

        {/* Recipes Grid/List */}
        {filteredRecipes.length > 0 ? (
          <View style={styles.recipesSection}>
            {viewMode === 'grid' ? (
              <RecipesGridView key="grid-view" />
            ) : (
              <RecipesListView key="list-view" />
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={80} color="#ddd" />
            <Text style={styles.emptyStateTitle}>{t('explore.noRecipesFound')}</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? t('explore.noResultsForSearch', { query: searchQuery })
                : t('explore.tryDifferentFilter')
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
            >
              <Text style={styles.emptyStateButtonText}>{t('explore.showAllRecipes')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Difficulty Guide */}
        <View style={styles.guideSection}>
          <Text style={styles.sectionTitle}>{t('explore.difficultyGuide')}</Text>
          <View style={styles.difficultyGuide}>
            {difficultyLevels.map(level => (
              <View key={level.id} style={styles.difficultyGuideItem}>
                <View style={[styles.difficultyDot, { backgroundColor: level.color }]} />
                <Text style={styles.difficultyGuideText}>{level.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ... styles remain the same as previous version ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#333",
  },
  filtersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
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
    color: "#f37d1c",
    fontWeight: "600",
  },
  filtersContainer: {
    paddingHorizontal: 20,
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeFilterItem: {
    backgroundColor: '#f37d1c',
    borderColor: '#f37d1c',
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
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
    color: '#666',
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
    backgroundColor: "#f8f9fa",
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
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 4,
  },
  recipeListDescription: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
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
    color: '#f37d1c',
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#f37d1c',
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
    backgroundColor: '#f8f9fa',
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
    color: '#666',
    fontWeight: '500',
  },
});