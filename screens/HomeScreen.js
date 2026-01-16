// screens/HomeScreen.js - UPDATED WITH CONSISTENT CATEGORY HANDLING
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
} from "react-native";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../contexts/LanguageContext";
import { useLocalizedRecipes } from "../hooks/useLocalizedRecipes";
import { useTheme } from "../contexts/ThemeContext";
import GuestRestrictionDialog from "../components/GuestRestrictionDialog ";
import useGuestRestriction from "../hooks/useGuestRestriction";
import { useNetwork } from "../contexts/NetworkContext";
import OfflineBanner from "../components/OfflineBanner";
import { useGuest } from "../contexts/GuestContext";

const { width: screenWidth } = Dimensions.get('window');

// CATEGORY DEFINITIONS - MATCHING AddRecipeScreen.js EXACTLY
const CATEGORIES = [
  { id: 'breakfast', en: "Breakfast", am: "ቁርስ", icon: 'cafe-outline' },
  { id: 'lunch', en: "Lunch", am: "ምሳ", icon: 'restaurant-outline' },
  { id: 'dinner', en: "Dinner", am: "እራት", icon: 'fast-food-outline' },
  { id: 'dessert', en: "Dessert", am: "ምርጥ ምግብ", icon: 'ice-cream-outline' },
  { id: 'drinks', en: "Drinks", am: "መጠጦች", icon: 'wine-outline' },
  { id: 'vegetarian', en: "Vegetarian", am: "አትክልት", icon: 'leaf-outline' },
  { id: 'meat', en: "Meat", am: "ስጋ ምግብ", icon: 'pizza-outline' },
  { id: 'appetizer', en: "Appetizer", am: "መግቢያ", icon: 'fast-food-outline' }
];

export default function HomeScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState({ id: 'all', name: 'All', icon: 'grid' });
  
  const intervalRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Hooks
  const { locale, t } = useLanguage();
  const { getLocalizedRecipes, getLocalizedRecipe } = useLocalizedRecipes();
  const { colors, isDarkMode } = useTheme();
  const { showGuestRestriction, GuestDialogProps } = useGuestRestriction();
  const { isOnline, refreshNetworkStatus, isLoading: networkLoading } = useNetwork();
  const { isGuest } = useGuest();

  // Category filters - using same structure as AddRecipeScreen
  const categoriesWithAll = [
    { id: 'all', name: t('categories.all'), icon: 'grid' },
    ...CATEGORIES.map(cat => ({
      id: cat.id,
      name: t(`categories.${cat.id}`),
      icon: cat.icon
    }))
  ];

  useEffect(() => {
    loadRecipes();
    if (!isGuest) {
      loadUnreadNotifications();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!isGuest) {
        loadUnreadNotifications();
      }
    });
    
    return unsubscribe;
  }, [navigation, isGuest]);

  // NEW: Function to load unread notifications count
  const loadUnreadNotifications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const notificationsRef = collection(db, "notifications");
      const q = query(
        notificationsRef, 
        where("userId", "==", user.uid),
        where("read", "==", false)
      );
      
      const querySnapshot = await getDocs(q);
      setUnreadNotifications(querySnapshot.size);
      
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  // Featured recipe rotation
  useEffect(() => {
    if (recipes.length > 0 && isOnline) {
      intervalRef.current = setInterval(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setFeaturedIndex((prev) => (prev + 1) % recipes.length);
          
          scaleAnim.setValue(1.1);
          slideAnim.setValue(50);
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 5000);
    }
    return () => clearInterval(intervalRef.current);
  }, [recipes, fadeAnim, slideAnim, scaleAnim, isOnline]);

  const loadRecipes = async () => {
    // Check if offline
    if (!isOnline) {
      console.log("Offline mode - recipes not loaded");
      setLoading(false);
      setRefreshing(false);
      setRecipes([]);
      setFilteredRecipes([]);
      return;
    }

    try {
      const q = query(
        collection(db, "recipes"),
        where("approved", "==", true),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const recipeList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(recipeList);
      setFilteredRecipes(recipeList);
    } catch (error) {
      console.error("Error fetching recipes: ", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = React.useCallback(() => {
    // Don't refresh if offline
    if (!isOnline) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    loadRecipes();
    if (!isGuest) {
      loadUnreadNotifications();
    }
  }, [isOnline, isGuest]);

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

  // Category filter - updated to work with both object and string categories
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    if (category.id === 'all') {
      setFilteredRecipes(recipes);
    } else {
      const filtered = recipes.filter(recipe => {
        const normalizedId = getNormalizedCategoryId(recipe);
        return normalizedId === category.id;
      });
      setFilteredRecipes(filtered);
    }
  };

  // Helper function to get image source
  const getImageSource = (item) => {
    if (item.imageBase64) {
      return { uri: `data:image/jpeg;base64,${item.imageBase64}` };
    } else if (item.imageURL) {
      return { uri: item.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  // Handle notification button press
  const handleNotificationPress = () => {
    if (showGuestRestriction(
      t('profile.notifications'),
      t('home.guest.notificationsTitle'),
      t('home.guest.notificationsMessage')
    )) {
      navigation.navigate("Notifications");
    }
  };

  // Handle add recipe button press
  const handleAddRecipePress = () => {
    // Check if offline
    if (!isOnline) {
      return;
    }
    
    if (showGuestRestriction(
      t('recipe.add'),
      t('home.guest.addRecipeTitle'),
      t('home.guest.addRecipeMessage')
    )) {
      navigation.navigate("AddRecipe");
    }
  };

  // Handle retry connection
  const handleRetryConnection = async () => {
    const connected = await refreshNetworkStatus();
    if (connected) {
      loadRecipes();
      if (!isGuest) {
        loadUnreadNotifications();
      }
    }
  };

  // Handle go to favourites
  const handleGoToFavourites = () => {
    navigation.navigate("Saved");
  };

  const renderRecipeCard = ({ item, index }) => {
    const localizedRecipe = getLocalizedRecipe(item);
    const category = getRecipeCategory(item);
    
    return (
      <TouchableOpacity
        style={[styles.recipeCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate("RecipeDetail", { recipe: item })}
        activeOpacity={0.9}
      >
        <Image source={getImageSource(item)} style={styles.recipeImage} />
        <View style={styles.recipeInfo}>
          <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={2}>
            {localizedRecipe.title}
          </Text>
          <View style={styles.recipeMeta}>
            <View style={[styles.recipeCategoryBadge, { backgroundColor: colors.badgeBg }]}>
              <Text style={[styles.recipeCategoryText, { color: colors.textSecondary }]}>
                {category || t('categories.all')}
              </Text>
            </View>
            <View style={styles.recipeTime}>
              <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {localizedRecipe.cookingTime || '30'} {t('recipe.minutes')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        { backgroundColor: colors.card },
        selectedCategory.id === item.id && [styles.activeCategoryItem, { backgroundColor: colors.primary }],
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={[
        styles.categoryIcon,
        { backgroundColor: isDarkMode ? 'rgba(243, 125, 28, 0.1)' : '#fff5e6' },
        selectedCategory.id === item.id && styles.activeCategoryIcon
      ]}>
        <Ionicons 
          name={item.icon} 
          size={20} 
          color={selectedCategory.id === item.id ? "#fff" : colors.primary} 
        />
      </View>
      <Text style={[
        styles.categoryName,
        { color: colors.textSecondary },
        selectedCategory.id === item.id && styles.activeCategoryName
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if ((loading && !refreshing) || networkLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{t('home.loadingRecipes')}</Text>
      </View>
    );
  }

  // Get the current featured recipe
  const featuredRecipe = recipes[featuredIndex] ? getLocalizedRecipe(recipes[featuredIndex]) : null;
  const featuredCategory = recipes[featuredIndex] ? getRecipeCategory(recipes[featuredIndex]) : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('SettingsProfile')}
          >
            <Ionicons name="menu-outline" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.logo, { color: colors.primary }]}>{t('home.title')}</Text>
          <View style={styles.headerRight}>
            {/* Updated Notification Button with Badge */}
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={handleNotificationPress}
            >
              <View style={styles.notificationIconContainer}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                {!isGuest && unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 99 ? "99+" : unreadNotifications}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Banner */}
        {!isOnline && (
          <OfflineBanner 
            onRetry={handleRetryConnection}
            onGoToFavourites={handleGoToFavourites}
            showFavouritesButton={true}
          />
        )}

        {/* Guest Info Banner */}
        {GuestDialogProps.isGuest && (
          <View style={[styles.guestInfoBanner, { backgroundColor: 'rgba(149, 165, 166, 0.1)' }]}>
            <Ionicons name="information-circle-outline" size={20} color="#95a5a6" />
            <Text style={[styles.guestInfoText, { color: '#95a5a6' }]}>
              {t('home.guest.bannerMessage')}
            </Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate("Login")}
              style={[styles.guestSignupButton, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.guestSignupButtonText}>
                {t('home.guest.signupButton')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Featured Recipe Section - Only show if online and has recipes */}
        {featuredRecipe && isOnline && recipes.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.featured')}</Text>
              <Text style={[styles.featuredCounter, { color: colors.textSecondary }]}>
                {featuredIndex + 1} {t('home.featuredCounter')} {recipes.length}
              </Text>
            </View>
            <Animated.View
              style={[
                styles.featuredCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateX: slideAnim },
                    { scale: scaleAnim }
                  ],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate("RecipeDetail", { recipe: recipes[featuredIndex] })}
                activeOpacity={0.9}
              >
                <Image
                  source={getImageSource(recipes[featuredIndex])}
                  style={styles.featuredImage}
                />
                <View style={styles.featuredOverlay}>
                  <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.featuredBadgeText}>{t('recipe.featured')}</Text>
                  </View>
                  <Text style={styles.featuredTitle}>{featuredRecipe.title}</Text>
                  <View style={styles.featuredMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#fff" />
                      <Text style={styles.featuredText}>{featuredRecipe.cookingTime || '30'} {t('recipe.minutes')}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="restaurant-outline" size={16} color="#fff" />
                      <Text style={styles.featuredText}>{featuredCategory || t('categories.all')}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={16} color="#fff" />
                      <Text style={styles.featuredText}>{featuredRecipe.servings || '4'} {t('recipe.servingsUnit')}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
            {/* Featured Recipe Indicators */}
            <View style={styles.indicators}>
              {recipes.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    { backgroundColor: colors.border },
                    featuredIndex === index && [styles.activeIndicator, { backgroundColor: colors.primary }],
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Offline Message if no recipes */}
        {!isOnline && recipes.length === 0 && (
          <View style={[styles.offlineMessage, { backgroundColor: colors.card }]}>
            <Ionicons name="cloud-offline-outline" size={50} color={colors.textSecondary} />
            <Text style={[styles.offlineMessageTitle, { color: colors.text }]}>
              {t('offline.noRecipesTitle')}
            </Text>
            <Text style={[styles.offlineMessageText, { color: colors.textSecondary }]}>
              {t('offline.noRecipesMessage')}
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

        {/* Categories Section - Only show if online */}
        {isOnline && recipes.length > 0 && (
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.categories')}</Text>
              <Text style={[styles.recipesCount, { color: colors.primary }]}>{recipes.length} {t('home.recipesCount')}</Text>
            </View>
            <FlatList
              data={categoriesWithAll}
              horizontal
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
              renderItem={renderCategoryItem}
            />
          </View>
        )}

        {/* Popular Recipes Section - Only show if online and has recipes */}
        {isOnline && recipes.length > 0 && (
          <View style={styles.recipesSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedCategory.id === 'all' ? t('home.popular') : selectedCategory.name}
              </Text>
              <TouchableOpacity onPress={() => setSelectedCategory(categoriesWithAll[0])}>
                <Text style={[styles.seeAllText, { color: colors.primary }]}>{t('home.viewAll')}</Text>
              </TouchableOpacity>
            </View>

            {filteredRecipes.length > 0 ? (
              <FlatList
                data={filteredRecipes.slice(0, 8)}
                renderItem={renderRecipeCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.recipesGrid}
                columnWrapperStyle={styles.recipeRow}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="fast-food-outline" size={64} color={colors.border} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t('errors.noRecipes')}</Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  {t('errors.noCategoryRecipes')}
                </Text>
                <TouchableOpacity 
                  style={[styles.resetFilterButton, { backgroundColor: colors.primary }]}
                  onPress={() => setSelectedCategory(categoriesWithAll[0])}
                >
                  <Text style={styles.resetFilterButtonText}>{t('home.showAllRecipes')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Floating Add Button - Only show if online */}
      {isOnline && (
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddRecipePress}
          activeOpacity={0.9}
        >
          <View style={styles.addButtonInner}>
            <Ionicons name="add" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Guest Restriction Dialog */}
      <GuestRestrictionDialog {...GuestDialogProps} />
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
  },
  // NEW: Notification icon with badge styles
  notificationButton: {
    padding: 4,
    position: "relative",
  },
  notificationIconContainer: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ff4757",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 10,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  guestInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  guestInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  guestSignupButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  guestSignupButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineMessage: {
    marginHorizontal: 16,
    marginBottom: 25,
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
  featuredSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  featuredCounter: {
    fontSize: 14,
    fontWeight: "500",
  },
  recipesCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  featuredCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    height: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
  },
  featuredOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  featuredBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  featuredBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  featuredMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    marginBottom: 4,
  },
  featuredText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 4,
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    flexWrap: "wrap",
    paddingHorizontal: 20,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
    marginVertical: 2,
  },
  activeIndicator: {
    width: 12,
  },
  categoriesSection: {
    marginBottom: 25,
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryItem: {
    alignItems: "center",
    marginHorizontal: 8,
    padding: 12,
    borderRadius: 15,
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCategoryItem: {
    transform: [{ scale: 1.05 }],
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  activeCategoryIcon: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  activeCategoryName: {
    color: "#fff",
    fontWeight: "bold",
  },
  recipesSection: {
    marginBottom: 30,
  },
  recipesGrid: {
    paddingHorizontal: 15,
  },
  recipeRow: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  recipeCard: {
    width: (screenWidth - 40) / 2,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recipeImage: {
    width: "100%",
    height: 120,
  },
  recipeInfo: {
    padding: 12,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    lineHeight: 18,
  },
  recipeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recipeCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recipeCategoryText: {
    fontSize: 10,
    fontWeight: "600",
  },
  recipeTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
});
