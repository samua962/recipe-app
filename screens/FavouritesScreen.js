import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { isOnline } from "../utils/networkStatus";
import { getFavourites, removeFavourite, initDatabase } from "../database/favouritesDB";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext"; // Import theme hook

export default function FavouritesScreen({ navigation }) {
  const [favourites, setFavourites] = useState([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const { t } = useLanguage();
  const { colors, isDarkMode } = useTheme(); // Theme hook

  const loadFavourites = async () => {
    const connected = await isOnline();
    setOnline(connected);

    try {
      await initDatabase();
      const data = await getFavourites();
      setFavourites(data);
    } catch (error) {
      console.error("Error loading favourites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadFavourites);
    return unsubscribe;
  }, [navigation]);

  const showDeleteConfirmation = (item) => {
    Alert.alert(
      t('favorites.deleteTitle'),
      t('favorites.deleteMessage', { title: item.title }),
      [
        {
          text: t('common.cancel'),
          style: "cancel"
        },
        {
          text: t('common.delete'),
          style: "destructive",
          onPress: () => handleRemove(item.id)
        }
      ]
    );
  };

  const handleRemove = async (id) => {
    setDeletingId(id);
    try {
      await removeFavourite(id);
      // Update local state immediately
      setFavourites(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error("Error removing favourite:", error);
      Alert.alert(t('common.error'), t('favorites.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  const getImageSource = (item) => {
    if (item.imageURL) {
      return { uri: item.imageURL };
    } else if (item.imageBase64) {
      return { uri: `data:image/jpeg;base64,${item.imageBase64}` };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  const renderRecipeCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate("RecipeDetail", { recipe: item })}
      activeOpacity={0.8}
    >
      <Image 
        source={getImageSource(item)} 
        style={styles.image}
        defaultSource={require('../assets/placeholder-image.jpg')}
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.category, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.category}
        </Text>
        {item.cookingTime && (
          <View style={styles.metaInfo}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {item.cookingTime} {t('recipe.minutes')}
            </Text>
          </View>
        )}
      </View>
      <TouchableOpacity 
        onPress={() => showDeleteConfirmation(item)}
        style={styles.deleteButton}
        disabled={deletingId === item.id}
      >
        {deletingId === item.id ? (
          <ActivityIndicator size="small" color="#e74c3c" />
        ) : (
          <Ionicons name="trash-outline" size={22} color="#e74c3c" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          {t('favorites.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('favorites.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {favourites.length} {t('favorites.recipesSaved')}
        </Text>
      </View>

      {/* Offline Banner */}
      {!online && (
        <View style={[styles.offlineBanner, { backgroundColor: '#e74c3c' }]}>
          <Ionicons name="wifi-outline" size={18} color="#fff" />
          <Text style={styles.offlineText}>
            {t('favorites.offlineMode')}
          </Text>
        </View>
      )}

      {/* Favourites List */}
      {favourites.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons 
            name="heart-outline" 
            size={80} 
            color={colors.border} 
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('favorites.emptyTitle')}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('favorites.emptyMessage')}
          </Text>
          <TouchableOpacity 
            style={[styles.exploreButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Explore')}
          >
            <Ionicons name="compass-outline" size={20} color="#fff" />
            <Text style={styles.exploreButtonText}>
              {t('favorites.exploreRecipes')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item.id}
          renderItem={renderRecipeCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    marginBottom: 4,
  },
  subtitle: { 
    fontSize: 16, 
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: { 
    fontSize: 22, 
    fontWeight: "bold", 
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: { 
    fontSize: 16, 
    textAlign: "center", 
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: { 
    width: 80, 
    height: 80, 
    borderRadius: 12, 
    marginRight: 16,
  },
  info: { 
    flex: 1,
    marginRight: 12,
  },
  name: { 
    fontSize: 16, 
    fontWeight: "bold", 
    marginBottom: 4,
    lineHeight: 20,
  },
  category: { 
    fontSize: 14, 
    marginBottom: 6,
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  offlineText: { 
    color: "#fff", 
    fontWeight: "600", 
    fontSize: 14, 
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
});