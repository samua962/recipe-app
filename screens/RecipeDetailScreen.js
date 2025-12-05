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
  Modal,
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
import { useTheme } from "../contexts/ThemeContext";

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
  
  // Multi-language hooks
  const { currentLanguage, t } = useLanguage();
  const { getLocalizedRecipe } = useLocalizedRecipes();
  
  // Theme hook
  const { colors } = useTheme();
  
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
  
  // Progress and Dialog states
  const [showProgress, setShowProgress] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: "",
    message: "",
    type: "info", // 'info', 'success', 'error', 'confirm'
    onConfirm: null,
    onCancel: null,
  });

  // Check if recipe is approved
  const isApproved = recipe.approved === true;

  // Custom Dialog Component
  const CustomDialog = () => (
    <Modal
      visible={showDialog}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDialog(false)}
    >
      <View style={styles.dialogOverlay}>
        <View style={[styles.dialogContainer, { backgroundColor: colors.card }]}>
          <View style={styles.dialogHeader}>
            <Ionicons 
              name={
                dialogConfig.type === 'success' ? 'checkmark-circle' :
                dialogConfig.type === 'error' ? 'alert-circle' :
                dialogConfig.type === 'confirm' ? 'help-circle' : 'information-circle'
              } 
              size={32} 
              color={
                dialogConfig.type === 'success' ? '#4CAF50' :
                dialogConfig.type === 'error' ? '#F44336' :
                dialogConfig.type === 'confirm' ? '#FFA000' : '#FF9800' // Changed info to orange
              } 
            />
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {dialogConfig.title}
            </Text>
          </View>
          
          <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
            {dialogConfig.message}
          </Text>
          
          <View style={styles.dialogButtons}>
            {dialogConfig.type === 'confirm' ? (
              <>
                <TouchableOpacity 
                  style={[styles.dialogButton, styles.cancelButton]}
                  onPress={() => {
                    dialogConfig.onCancel && dialogConfig.onCancel();
                    setShowDialog(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>{t('app.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.dialogButton, styles.confirmButton]}
                  onPress={() => {
                    dialogConfig.onConfirm && dialogConfig.onConfirm();
                    setShowDialog(false);
                  }}
                >
                  <Text style={styles.confirmButtonText}>{t('app.confirm')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[styles.dialogButton, styles.okButton]}
                onPress={() => setShowDialog(false)}
              >
                <Text style={styles.okButtonText}>{t('app.ok')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  // Progress Modal Component
  const ProgressModal = () => (
    <Modal
      visible={showProgress}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.progressOverlay}>
        <View style={[styles.progressContainer, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.progressText, { color: colors.text }]}>
            {progressText}
          </Text>
        </View>
      </View>
    </Modal>
  );

  // Helper function to show dialog
  const showCustomDialog = (title, message, type = "info", onConfirm = null, onCancel = null) => {
    setDialogConfig({
      title,
      message,
      type,
      onConfirm,
      onCancel,
    });
    setShowDialog(true);
  };

  // Helper function to show progress
  const showProgressBar = (text) => {
    setProgressText(text);
    setShowProgress(true);
  };

  // Helper function to hide progress
  const hideProgressBar = () => {
    setShowProgress(false);
    setProgressText("");
  };

  // Helper function to get localized text
  const getLocalizedText = (text) => {
    if (!text) return '';
    
    if (typeof text === 'string') {
      return text;
    }
    
    if (typeof text === 'object' && text !== null) {
      return text[currentLanguage] || text.en || '';
    }
    
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
      <Text key={index} style={[styles.textLine, { color: colors.text }]}>
        {line.trim()}
      </Text>
    ));
  };

  // Initialize local DB and check favourite - WITHOUT PROGRESS BAR
  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDatabase();
        const fav = await isFavourite(recipe.id);
        setIsFav(fav);
      } catch (error) {
        console.error("Database setup failed:", error);
      }
    };
    setupDB();
  }, []);

  // Ask storage permission
  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        showCustomDialog(
          t('app.permissionRequired'),
          t('favorites.storagePermission'),
          'error'
        );
      }
    };
    requestPermission();
  }, []);

  // Save or Remove Favourite
  const handleSaveFavourite = async () => {
    if (!user) {
      showCustomDialog(
        t('auth.loginRequired'),
        t('favorites.loginRequired'),
        'error'
      );
      return;
    }

    const recipeId = recipe.id || Date.now().toString();

    if (isFav) {
      showProgressBar(t('favorites.removing'));
      try {
        await removeFavourite(recipeId);
        setIsFav(false);
        hideProgressBar();
        showCustomDialog(
          t('app.success'),
          t('favorites.removed'),
          'success'
        );
      } catch (error) {
        hideProgressBar();
        showCustomDialog(
          t('app.error'),
          t('errors.operationFailed'),
          'error'
        );
      }
      return;
    }

    showProgressBar(t('favorites.saving'));
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
      hideProgressBar();
      showCustomDialog(
        t('app.success'),
        t('favorites.saved'),
        'success'
      );
    } catch (error) {
      hideProgressBar();
      console.error("Image download failed:", error);
      showCustomDialog(
        t('app.error'),
        t('errors.downloadFailed'),
        'error'
      );
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

  // Load ratings - WITHOUT PROGRESS BAR
  useEffect(() => {
    const loadRatings = async () => {
      try {
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
      } catch (error) {
        console.error("Error loading ratings:", error);
      } finally {
        setLoadingRating(false);
      }
    };
    loadRatings();
  }, []);

  // Add comment
  const handleAddComment = async () => {
    if (!user) {
      showCustomDialog(
        t('auth.loginRequired'),
        t('comments.loginToComment'),
        'error'
      );
      return;
    }
    if (!newComment.trim()) return;

    showProgressBar(t('comments.adding'));
    try {
      await addDoc(collection(db, "comments"), {
        recipeId: recipe.id,
        userId: user.uid,
        username: user.email?.split("@")[0] || "Anonymous",
        text: newComment.trim(),
        timestamp: new Date(),
      });
      setNewComment("");
      hideProgressBar();
    } catch (err) {
      hideProgressBar();
      showCustomDialog(
        t('app.error'),
        err.message,
        'error'
      );
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    showCustomDialog(
      t('app.delete'),
      t('comments.deleteConfirm'),
      'confirm',
      async () => {
        showProgressBar(t('app.deleting'));
        try {
          await deleteDoc(doc(db, "comments", commentId));
          hideProgressBar();
        } catch (err) {
          hideProgressBar();
          showCustomDialog(
            t('app.error'),
            err.message,
            'error'
          );
        }
      }
    );
  };

  // Save rating
  const handleRating = async (ratingValue) => {
    if (!user) {
      showCustomDialog(
        t('auth.loginRequired'),
        t('ratings.loginToRate'),
        'error'
      );
      return;
    }
    
    showProgressBar(t('ratings.saving'));
    try {
      const ratingRef = doc(db, "ratings", `${recipe.id}_${user.uid}`);
      await setDoc(ratingRef, {
        recipeId: recipe.id,
        userId: user.uid,
        rating: ratingValue,
        timestamp: new Date(),
      });
      setUserRating(ratingValue);
      hideProgressBar();
      showCustomDialog(
        t('ratings.thankYou'),
        t('ratings.ratingSaved'),
        'success'
      );
    } catch (err) {
      hideProgressBar();
      showCustomDialog(
        t('app.error'),
        err.message,
        'error'
      );
    }
  };

  const openYouTube = () => {
    if (recipe.videoURL) {
      showProgressBar(t('recipe.openingVideo'));
      Linking.openURL(recipe.videoURL)
        .then(() => {
          setTimeout(() => hideProgressBar(), 1000);
        })
        .catch(() => {
          hideProgressBar();
          showCustomDialog(
            t('errors.noVideo'),
            t('errors.noVideoLink'),
            'error'
          );
        });
    } else {
      showCustomDialog(
        t('errors.noVideo'),
        t('errors.noVideoLink'),
        'error'
      );
    }
  };

  // Check if description exists and is not empty
  const hasDescription = recipe.description && 
                        getLocalizedText(recipe.description).trim().length > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Custom Dialogs */}
      <CustomDialog />
      <ProgressModal />
      
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
            {/* Show favourite button only for approved recipes */}
            {isApproved && (
              <TouchableOpacity style={styles.favButton} onPress={handleSaveFavourite}>
                <Ionicons 
                  name={isFav ? "heart" : "heart-outline"} 
                  size={28} 
                  color={isFav ? "#FF6B6B" : "#fff"} 
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Recipe Content */}
      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        {/* Title and Category */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>{getLocalizedText(recipe.title)}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.categoryText}>{getLocalizedText(recipe.category)}</Text>
          </View>
        </View>

        {/* Recipe Meta Info */}
        <View style={styles.metaContainer}>
          {recipe.cookingTime && (
            <View style={[styles.metaItem, { backgroundColor: colors.card }]}>
              <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.cookingTime} {t('recipe.minutes')}</Text>
            </View>
          )}
          {recipe.servings && (
            <View style={[styles.metaItem, { backgroundColor: colors.card }]}>
              <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.servings} {t('recipe.servingsUnit')}</Text>
            </View>
          )}
          {recipe.difficulty && (
            <View style={[styles.metaItem, { backgroundColor: colors.card }]}>
              <Ionicons name="speedometer-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>{getLocalizedText(recipe.difficulty)}</Text>
            </View>
          )}
        </View>

        {/* Description - Always show section, with fallback text if no description */}
        <View style={[styles.descriptionSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.descriptionText, { color: colors.text }]}>
            {hasDescription 
              ? getLocalizedText(recipe.description)
              : t('recipe.noDescription')
            }
          </Text>
        </View>

        {/* Rating Section - Only show for approved recipes */}
        {isApproved && (
          <View style={[styles.ratingSection, { backgroundColor: colors.card }]}>
            {loadingRating ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <View style={styles.ratingRow}>
                  <Rating
                    type="star"
                    ratingCount={5}
                    imageSize={26}
                    startingValue={userRating}
                    onFinishRating={handleRating}
                    tintColor={colors.card}
                  />
                  <View style={styles.ratingInfo}>
                    <Text style={[styles.avgRating, { color: colors.text }]}>{avgRating.toFixed(1)}</Text>
                    <Text style={[styles.ratingCount, { color: colors.textSecondary }]}>({totalRatings} {t('ratings.total')})</Text>
                  </View>
                </View>
                <Text style={[styles.yourRatingText, { color: colors.textSecondary }]}>{t('ratings.yourRating')}</Text>
              </>
            )}
          </View>
        )}

        {/* Ingredients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recipe.ingredients')}</Text>
          </View>
          <View style={[styles.ingredientsBox, { backgroundColor: colors.card }]}>
            {recipe.ingredients ? (
              formatTextWithLineBreaks(recipe.ingredients)
            ) : (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>{t('recipe.noIngredients')}</Text>
            )}
          </View>
        </View>

        {/* Preparation Steps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('recipe.steps')}</Text>
          </View>
          <View style={[styles.stepsBox, { backgroundColor: colors.card }]}>
            {recipe.steps ? (
              formatTextWithLineBreaks(recipe.steps)
            ) : (
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>{t('recipe.noSteps')}</Text>
            )}
          </View>
        </View>

        {/* YouTube Video Button - Only show for approved recipes */}
        {isApproved && recipe.videoURL && (
          <TouchableOpacity onPress={openYouTube} style={styles.videoButton}>
            <LinearGradient 
              colors={[colors.primary, '#ff9d4d']} 
              style={styles.videoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="logo-youtube" size={24} color="#fff" />
              <Text style={styles.videoText}>{t('recipe.watchVideo')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Comments Section - Only show for approved recipes */}
        {isApproved && (
          <View style={styles.commentSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('comments.title')} ({comments.length})</Text>
            </View>

            {loadingComments ? (
              <ActivityIndicator color={colors.primary} style={styles.loader} />
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-outline" size={50} color={colors.border} />
                <Text style={[styles.noCommentsText, { color: colors.textSecondary }]}>{t('comments.noComments')}</Text>
              </View>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={[styles.commentBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentUserInfo}>
                      <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.avatarText}>
                          {c.username?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.commentUser, { color: colors.text }]}>{c.username || "Anonymous"}</Text>
                        <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                          {c.timestamp?.toDate ? new Date(c.timestamp.toDate()).toLocaleDateString() : 'Unknown date'}
                        </Text>
                      </View>
                    </View>
                    {(user?.uid === c.userId || ["moderator", "admin"].includes(userRole)) && (
                      <TouchableOpacity 
                        onPress={() => handleDeleteComment(c.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[styles.commentText, { color: colors.text }]}>{c.text}</Text>
                </View>
              ))
            )}

            {/* Add Comment */}
            <View style={[styles.commentInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.commentInput, { color: colors.text }]}
                placeholder={t('comments.addPlaceholder')}
                placeholderTextColor={colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity 
                onPress={handleAddComment}
                style={[
                  styles.sendButton,
                  { backgroundColor: newComment.trim() ? colors.primary : colors.border }
                ]}
                disabled={!newComment.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 10,
    lineHeight: 34,
  },
  categoryBadge: {
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
  },
  descriptionSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  ratingSection: {
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
  },
  ratingCount: {
    fontSize: 12,
    marginTop: 2,
  },
  yourRatingText: {
    fontSize: 14,
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
    marginLeft: 8,
  },
  ingredientsBox: {
    borderRadius: 12,
    padding: 16,
  },
  stepsBox: {
    borderRadius: 12,
    padding: 16,
  },
  textLine: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  noDataText: {
    fontSize: 14,
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
    fontSize: 16,
    marginTop: 10,
  },
  commentBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
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
    fontSize: 14,
  },
  commentTime: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 15,
    borderWidth: 1,
  },
  commentInput: {
    flex: 1,
    paddingVertical: 10,
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
  // Dialog Styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  dialogMessage: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#9E9E9E',
  },
  cancelButtonText: {
    color: '#9E9E9E',
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  okButton: {
    backgroundColor: '#FF9800', // Changed from blue to orange
  },
  okButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Progress Modal Styles
  progressOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 150,
  },
  progressText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});