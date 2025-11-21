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
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../contexts/LanguageContext";
import { useLocalizedRecipes } from "../hooks/useLocalizedRecipes";

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Categories with translation keys
  const categories = [
    { key: "all", value: "All" },
    { key: "breakfast", value: "Breakfast" },
    { key: "lunch", value: "Lunch" },
    { key: "dinner", value: "Dinner" },
    { key: "dessert", value: "Dessert" },
    { key: "drinks", value: "Drinks" },
    { key: "vegetarian", value: "Vegetarian" },
    { key: "meat", value: "Meat" }
  ];
  
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  
  const intervalRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Multi-language hooks
  const { locale, t } = useLanguage();
  const { getLocalizedRecipes, getLocalizedRecipe } = useLocalizedRecipes();

  useEffect(() => {
    loadRecipes();
  }, []);

  // Featured recipe rotation with enhanced animations
  useEffect(() => {
    if (recipes.length > 0) {
      intervalRef.current = setInterval(() => {
        // Start scale down and fade out
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
          // Update index after animation completes
          setFeaturedIndex((prev) => (prev + 1) % recipes.length);
          
          // Reset animation values and animate in
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
  }, [recipes, fadeAnim, slideAnim, scaleAnim]);

  const loadRecipes = async () => {
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
    setRefreshing(true);
    loadRecipes();
  }, []);

  // Category filter
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    if (category.value === "All") {
      setFilteredRecipes(recipes);
    } else {
      const localizedRecipes = getLocalizedRecipes(recipes);
      const filtered = localizedRecipes.filter(
        (r) => r.category?.toLowerCase() === category.value.toLowerCase()
      );
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

  const renderRecipeCard = ({ item, index }) => {
    const localizedRecipe = getLocalizedRecipe(item);
    
    return (
      <TouchableOpacity
        style={styles.recipeCard}
        onPress={() => navigation.navigate("RecipeDetail", { recipe: item })}
        activeOpacity={0.9}
      >
        <Image source={getImageSource(item)} style={styles.recipeImage} />
        <View style={styles.recipeInfo}>
          <Text style={styles.recipeTitle} numberOfLines={2}>
            {localizedRecipe.title}
          </Text>
          <View style={styles.recipeMeta}>
            <View style={styles.recipeCategoryBadge}>
              <Text style={styles.recipeCategoryText}>{localizedRecipe.category}</Text>
            </View>
            <View style={styles.recipeTime}>
              <Ionicons name="time-outline" size={12} color="#666" />
              <Text style={styles.timeText}> {localizedRecipe.cookingTime || '30'} {t('recipe.minutes')}</Text>
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
        selectedCategory.key === item.key && styles.activeCategoryItem,
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <View style={[
        styles.categoryIcon,
        selectedCategory.key === item.key && styles.activeCategoryIcon
      ]}>
        <Ionicons 
          name={getCategoryIcon(item.key)} 
          size={20} 
          color={selectedCategory.key === item.key ? "#fff" : "#f37d1c"} 
        />
      </View>
      <Text style={[
        styles.categoryName,
        selectedCategory.key === item.key && styles.activeCategoryName
      ]}>
        {t(`categories.${item.key}`)}
      </Text>
    </TouchableOpacity>
  );

  const getCategoryIcon = (category) => {
    switch (category.toLowerCase()) {
      case 'breakfast': return 'cafe-outline';
      case 'lunch': return 'restaurant-outline';
      case 'dinner': return 'fast-food-outline';
      case 'dessert': return 'ice-cream-outline';
      case 'drinks': return 'wine-outline';
      case 'vegetarian': return 'leaf-outline';
      case 'meat': return 'pizza-outline';
      default: return 'fast-food-outline';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f37d1c" />
        <Text style={styles.loadingText}>{t('home.loadingRecipes')}</Text>
      </View>
    );
  }

  // Get the current featured recipe and localize it
  const featuredRecipe = recipes[featuredIndex] ? getLocalizedRecipe(recipes[featuredIndex]) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f37d1c']}
            tintColor="#f37d1c"
            title={t('home.pullToRefresh')}
            titleColor="#f37d1c"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="menu-outline" size={28} color="#333"  />
          <Text style={styles.logo}>{t('home.title')}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Featured Recipe Section */}
        {featuredRecipe && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('home.featured')}</Text>
              <Text style={styles.featuredCounter}>
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
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>{t('recipe.featured')}</Text>
                  </View>
                  <Text style={styles.featuredTitle}>{featuredRecipe.title}</Text>
                  <View style={styles.featuredMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#fff" />
                      <Text style={styles.featuredText}> {featuredRecipe.cookingTime || '30'} {t('recipe.minutes')}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="restaurant-outline" size={16} color="#fff" />
                      <Text style={styles.featuredText}> {featuredRecipe.category}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={16} color="#fff" />
                      <Text style={styles.featuredText}> {featuredRecipe.servings || '4'} {t('recipe.servingsUnit')}</Text>
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
                    featuredIndex === index && styles.activeIndicator,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Categories Section */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.categories')}</Text>
            <Text style={styles.recipesCount}>{recipes.length} {t('home.recipesCount')}</Text>
          </View>
          <FlatList
            data={categories}
            horizontal
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
            renderItem={renderCategoryItem}
          />
        </View>

        {/* Popular Recipes Section */}
        <View style={styles.recipesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory.value === "All" ? t('home.popular') : t(`categories.${selectedCategory.key}`)}
            </Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>{t('home.viewAll')}</Text>
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
              <Ionicons name="fast-food-outline" size={64} color="#ddd" />
              <Text style={styles.emptyStateTitle}>{t('errors.noRecipes')}</Text>
              <Text style={styles.emptyStateText}>
                {t('errors.noCategoryRecipes')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddRecipe")}
        activeOpacity={0.9}
      >
        <Animated.View style={styles.addButtonInner}>
          <Ionicons name="add" size={28} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    color: "#f37d1c",
  },
  menuItem: {
    padding: 4,
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
    color: "#333",
  },
  featuredCounter: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  recipesCount: {
    fontSize: 14,
    color: "#f37d1c",
    fontWeight: "600",
  },
  seeAllText: {
    fontSize: 14,
    color: "#f37d1c",
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
    backgroundColor: "#f37d1c",
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
    backgroundColor: "#ddd",
    marginHorizontal: 3,
    marginVertical: 2,
  },
  activeIndicator: {
    backgroundColor: "#f37d1c",
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
    backgroundColor: "#fff",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCategoryItem: {
    backgroundColor: "#f37d1c",
    transform: [{ scale: 1.05 }],
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff5e6",
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
    color: "#666",
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
    backgroundColor: "#fff",
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
    color: "#333",
    marginBottom: 8,
    lineHeight: 18,
  },
  recipeMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recipeCategoryBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  recipeCategoryText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "600",
  },
  recipeTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 10,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#f37d1c",
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
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});