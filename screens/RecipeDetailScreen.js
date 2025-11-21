import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Rating } from "react-native-ratings";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

// Import multi-language hooks
import { useLanguage } from "../contexts/LanguageContext";
import { useLocalizedRecipes } from "../hooks/useLocalizedRecipes";
import LanguageSwitcher from "../components/LanguageSwitcher";

import {
  initDatabase,
  addFavourite,
  removeFavourite,
  isFavourite,
} from "../database/favouritesDB";

const { width } = Dimensions.get("window");

export default function RecipeDetailScreen({ route }) {
  const { recipe: originalRecipe } = route.params;
  const user = auth.currentUser;
  const navigation = useNavigation();
  
  // Multi-language hooks - FIXED: Properly destructure both values
  const { currentLanguage, t } = useLanguage(); // Make sure both are destructured
  const { getLocalizedRecipe } = useLocalizedRecipes();
  
  // Get localized recipe
  const recipe = getLocalizedRecipe(originalRecipe);
  
  const [isFav, setIsFav] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(true);
  const [userRole, setUserRole] = useState("user");
  const [userRating, setUserRating] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [loadingRating, setLoadingRating] = useState(true);

  // Helper function to get localized text
  const getLocalizedText = (text) => {
    if (!text) return '';
    
    // If it's a string, return it directly
    if (typeof text === 'string') {
      return text;
    }
    
    // If it's an object with language keys, get the current language
    if (typeof text === 'object' && text !== null) {
      // Return current language text or fallback to English
      return text[currentLanguage] || text.en || '';
    }
    
    // For any other case, convert to string
    return String(text);
  };

  // Helper function to get image source
  const getImageSource = () => {
    if (recipe.imageBase64) {
      return { uri: `data:image/jpeg;base64,${recipe.imageBase64}` };
    } else if (recipe.imageURL) {
      return { uri: recipe.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  // Format ingredients and steps with proper line breaks using localized text
  const formatTextWithLineBreaks = (text) => {
    const localizedText = getLocalizedText(text);
    if (!localizedText) return '';
    
    return localizedText.split('\n').map((line, index) => (
      <Text key={index} style={styles.textLine}>
        {line.trim()}
      </Text>
    ));
  };

  // Initialize local DB and check favourite
  useEffect(() => {
    const setupDB = async () => {
      await initDatabase();
      const fav = await isFavourite(recipe.id);
      setIsFav(fav);
    };
    setupDB();
  }, []);

  // Ask storage permission
  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t('app.permissionRequired'),
          t('favorites.storagePermission')
        );
      }
    };
    requestPermission();
  }, []);

  // Save or Remove Favourite
  const handleSaveFavourite = async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequired'), t('favorites.loginRequired'));
      return;
    }

    const recipeId = recipe.id || Date.now().toString();

    if (isFav) {
      await removeFavourite(recipeId);
      setIsFav(false);
      Alert.alert(t('app.success'), t('favorites.removed'));
      return;
    }

    try {
      const dir = FileSystem.documentDirectory + "favourites/";
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }

      const fileUri = `${dir}${recipeId}.jpg`;
      
      if (recipe.imageBase64) {
        await FileSystem.writeAsStringAsync(fileUri, recipe.imageBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else if (recipe.imageURL) {
        const result = await FileSystem.downloadAsync(recipe.imageURL, fileUri);
        if (result.status !== 200) {
          throw new Error("Download failed with status " + result.status);
        }
      } else {
        throw new Error("No image available to save");
      }

      const localRecipe = {
        ...recipe,
        id: recipeId,
        imageURL: fileUri,
      };

      await addFavourite(localRecipe);
      setIsFav(true);
      Alert.alert(t('app.success'), t('favorites.saved'));
    } catch (error) {
      console.error("Image download failed:", error);
      Alert.alert(t('app.error'), t('errors.downloadFailed'));
    }
  };

  // Load user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) setUserRole(snap.data().role || "user");
        } catch (err) {
          console.log("Error fetching role:", err.message);
        }
      }
    };
    fetchUserRole();
  }, [user]);

  // Load comments (real-time)
  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("recipeId", "==", recipe.id),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentList);
      setLoadingComments(false);
    });
    return unsubscribe;
  }, []);

  // Load ratings
  useEffect(() => {
    const loadRatings = async () => {
      const q = query(collection(db, "ratings"), where("recipeId", "==", recipe.id));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        let sum = 0;
        snapshot.docs.forEach((doc) => {
          sum += doc.data().rating;
          if (doc.data().userId === user?.uid) {
            setUserRating(doc.data().rating);
          }
        });
        setAvgRating(sum / snapshot.docs.length);
        setTotalRatings(snapshot.docs.length);
      }
      setLoadingRating(false);
    };
    loadRatings();
  }, []);

  // Add comment
  const handleAddComment = async () => {
    if (!user) {
      Alert.alert(t('auth.loginRequired'), t('comments.loginToComment'));
      return;
    }
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, "comments"), {
        recipeId: recipe.id,
        userId: user.uid,
        username: user.email?.split("@")[0] || "Anonymous",
        text: newComment.trim(),
        timestamp: new Date(),
      });
      setNewComment("");
    } catch (err) {
      Alert.alert(t('app.error'), err.message);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    Alert.alert(t('app.delete'), t('comments.deleteConfirm'), [
      { text: t('app.cancel'), style: "cancel" },
      {
        text: t('app.delete'),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "comments", commentId));
          } catch (err) {
            Alert.alert(t('app.error'), err.message);
          }
        },
      },
    ]);
  };

  // Save rating
  const handleRating = async (ratingValue) => {
    if (!user) {
      Alert.alert(t('auth.loginRequired'), t('ratings.loginToRate'));
      return;
    }
    try {
      const ratingRef = doc(db, "ratings", `${recipe.id}_${user.uid}`);
      await setDoc(ratingRef, {
        recipeId: recipe.id,
        userId: user.uid,
        rating: ratingValue,
        timestamp: new Date(),
      });
      setUserRating(ratingValue);
      Alert.alert(t('ratings.thankYou'), t('ratings.ratingSaved'));
    } catch (err) {
      Alert.alert(t('app.error'), err.message);
    }
  };

  const openYouTube = () => {
    if (recipe.videoURL) {
      Linking.openURL(recipe.videoURL);
    } else {
      Alert.alert(t('errors.noVideo'), t('errors.noVideoLink'));
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Recipe Image with Gradient Overlay */}
      <View style={styles.imageContainer}>
        <Image source={getImageSource()} style={styles.image} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)"]}
          style={styles.imageGradient}
        />
        
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <LanguageSwitcher />
            <TouchableOpacity style={styles.favButton} onPress={handleSaveFavourite}>
              <Ionicons 
                name={isFav ? "heart" : "heart-outline"} 
                size={28} 
                color={isFav ? "#FF6B6B" : "#fff"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Recipe Content */}
      <View style={styles.contentContainer}>
        {/* Title and Category */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{getLocalizedText(recipe.title)}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{getLocalizedText(recipe.category)}</Text>
          </View>
        </View>

        {/* Recipe Meta Info */}
        <View style={styles.metaContainer}>
          {recipe.cookingTime && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{recipe.cookingTime} {t('recipe.minutes')}</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{recipe.servings} {t('recipe.servingsUnit')}</Text>
            </View>
          )}
          {recipe.difficulty && (
            <View style={styles.metaItem}>
              <Ionicons name="speedometer-outline" size={18} color="#666" />
              <Text style={styles.metaText}>{getLocalizedText(recipe.difficulty)}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {recipe.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>{getLocalizedText(recipe.description)}</Text>
          </View>
        )}

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          {loadingRating ? (
            <ActivityIndicator color="#f37d1c" />
          ) : (
            <>
              <View style={styles.ratingRow}>
                <Rating
                  type="star"
                  ratingCount={5}
                  imageSize={26}
                  startingValue={userRating}
                  onFinishRating={handleRating}
                  tintColor="#f8f9fa"
                />
                <View style={styles.ratingInfo}>
                  <Text style={styles.avgRating}>{avgRating.toFixed(1)}</Text>
                  <Text style={styles.ratingCount}>({totalRatings} {t('ratings.total')})</Text>
                </View>
              </View>
              <Text style={styles.yourRatingText}>{t('ratings.yourRating')}</Text>
            </>
          )}
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant-outline" size={22} color="#f37d1c" />
            <Text style={styles.sectionTitle}>{t('recipe.ingredients')}</Text>
          </View>
          <View style={styles.ingredientsBox}>
            {recipe.ingredients ? (
              formatTextWithLineBreaks(recipe.ingredients)
            ) : (
              <Text style={styles.noDataText}>{t('recipe.noIngredients')}</Text>
            )}
          </View>
        </View>

        {/* Preparation Steps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={22} color="#f37d1c" />
            <Text style={styles.sectionTitle}>{t('recipe.steps')}</Text>
          </View>
          <View style={styles.stepsBox}>
            {recipe.steps ? (
              formatTextWithLineBreaks(recipe.steps)
            ) : (
              <Text style={styles.noDataText}>{t('recipe.noSteps')}</Text>
            )}
          </View>
        </View>

        {/* YouTube Video Button */}
        {recipe.videoURL && (
          <TouchableOpacity onPress={openYouTube} style={styles.videoButton}>
            <LinearGradient 
              colors={["#f37d1c", "#ff9d4d"]} 
              style={styles.videoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="logo-youtube" size={24} color="#fff" />
              <Text style={styles.videoText}>{t('recipe.watchVideo')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Comments Section */}
        <View style={styles.commentSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#f37d1c" />
            <Text style={styles.sectionTitle}>{t('comments.title')} ({comments.length})</Text>
          </View>

          {loadingComments ? (
            <ActivityIndicator color="#f37d1c" style={styles.loader} />
          ) : comments.length === 0 ? (
            <View style={styles.noComments}>
              <Ionicons name="chatbubble-outline" size={50} color="#ddd" />
              <Text style={styles.noCommentsText}>{t('comments.noComments')}</Text>
            </View>
          ) : (
            comments.map((c) => (
              <View key={c.id} style={styles.commentBox}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentUserInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.avatarText}>
                        {c.username?.charAt(0)?.toUpperCase() || "U"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.commentUser}>{c.username || "Anonymous"}</Text>
                      <Text style={styles.commentTime}>
                        {c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleDateString() : 'Unknown date'}
                      </Text>
                    </View>
                  </View>
                  {(user?.uid === c.userId || ["moderator", "admin"].includes(userRole)) && (
                    <TouchableOpacity 
                      onPress={() => handleDeleteComment(c.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            ))
          )}

          {/* Add Comment */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder={t('comments.addPlaceholder')}
              placeholderTextColor="#999"
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity 
              onPress={handleAddComment}
              style={[
                styles.sendButton,
                { backgroundColor: newComment.trim() ? "#f37d1c" : "#ddd" }
              ]}
              disabled={!newComment.trim()}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageContainer: {
    height: 300,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  headerActions: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 5,
  },
  favButton: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: 5,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    marginTop: -25,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginTop: 20,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    lineHeight: 34,
  },
  categoryBadge: {
    backgroundColor: "#f37d1c",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  categoryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 6,
    fontWeight: "500",
  },
  descriptionSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    fontStyle: "italic",
  },
  ratingSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ratingInfo: {
    alignItems: "center",
  },
  avgRating: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  ratingCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  yourRatingText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  ingredientsBox: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
  },
  stepsBox: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
  },
  textLine: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    marginBottom: 4,
  },
  noDataText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
  },
  videoButton: {
    marginVertical: 10,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#f37d1c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  videoGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  videoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  commentSection: {
    marginTop: 10,
  },
  loader: {
    marginVertical: 20,
  },
  noComments: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noCommentsText: {
    color: "#999",
    fontSize: 16,
    marginTop: 10,
  },
  commentBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f37d1c",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  commentUser: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 14,
  },
  commentTime: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  commentText: {
    color: "#555",
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  commentInput: {
    flex: 1,
    paddingVertical: 10,
    color: "#000",
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});