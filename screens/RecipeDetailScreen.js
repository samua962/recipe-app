// screens/RecipeDetailScreen.js - COMPLETELY FIXED RELATED RECIPES LOADING
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
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
  limit,
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
  
  const { currentLanguage, t } = useLanguage();
  const { getLocalizedRecipe } = useLocalizedRecipes();
  const { colors } = useTheme();
  
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
  const [thumbnailLoading, setThumbnailLoading] = useState(true);
  const [authorData, setAuthorData] = useState(null);
  const [loadingAuthor, setLoadingAuthor] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [authorLoaded, setAuthorLoaded] = useState(false);
  
  // NEW STATES FOR RELATED RECIPES - SIMPLIFIED
  const [relatedRecipes, setRelatedRecipes] = useState([]);
  const [loadingRelatedRecipes, setLoadingRelatedRecipes] = useState(false);
  const [showRelatedRecipes, setShowRelatedRecipes] = useState(true);
  
  const [showProgress, setShowProgress] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: "",
    message: "",
    type: "info",
    onConfirm: null,
    onCancel: null,
  });

  const isApproved = recipe.approved === true;
  const hasLoadedRelatedRef = useRef(false);

  // Load current user profile
  useEffect(() => {
    const loadCurrentUserProfile = async () => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setCurrentUserProfile(userSnap.data());
          }
        } catch (error) {
          console.error("Error loading current user profile:", error);
        }
      }
    };
    loadCurrentUserProfile();
  }, [user]);

  // Load author profile
  const loadAuthorProfile = useCallback(async () => {
    const authorId = recipe.authorId || recipe.userId;
    
    if (!authorId || authorLoaded) {
      return;
    }
    
    setLoadingAuthor(true);
    try {
      const authorRef = doc(db, "users", authorId);
      const authorSnap = await getDoc(authorRef);
      
      if (authorSnap.exists()) {
        setAuthorData(authorSnap.data());
      }
      setAuthorLoaded(true);
    } catch (error) {
      console.error("Error loading author profile:", error);
      setAuthorLoaded(true);
    } finally {
      setLoadingAuthor(false);
    }
  }, [recipe.authorId, recipe.userId, authorLoaded]);

  useEffect(() => {
    loadAuthorProfile();
  }, [loadAuthorProfile]);

  // NEW: SIMPLIFIED Load related recipes - LOAD ONLY ONCE
  useEffect(() => {
    const loadRelatedRecipesOnce = async () => {
      if (!recipe.id || !isApproved || hasLoadedRelatedRef.current) {
        return;
      }

      hasLoadedRelatedRef.current = true;
      setLoadingRelatedRecipes(true);
      
      try {
        // Get current recipe category
        const currentCategory = getRecipeCategory(recipe);
        if (!currentCategory) {
          setRelatedRecipes([]);
          setLoadingRelatedRecipes(false);
          return;
        }

        // Query for approved recipes
        const q = query(
          collection(db, "recipes"),
          where("approved", "==", true),
          orderBy("createdAt", "desc"),
          limit(12)
        );

        const snapshot = await getDocs(q);
        let allRecipes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter recipes with same category
        const filteredRecipes = allRecipes.filter(otherRecipe => {
          if (otherRecipe.id === recipe.id) return false;
          
          const otherCategory = getRecipeCategory(otherRecipe);
          if (!otherCategory) return false;
          
          return currentCategory.toLowerCase() === otherCategory.toLowerCase();
        });

        // Remove duplicates
        const uniqueRecipes = filteredRecipes.filter((recipe, index, self) =>
          index === self.findIndex((r) => r.id === recipe.id)
        );

        // Get up to 4 recipes
        let finalRecipes = uniqueRecipes.slice(0, 4);
        
        // If not enough, add random recipes
        if (finalRecipes.length < 4) {
          const randomRecipes = allRecipes
            .filter(r => r.id !== recipe.id && !finalRecipes.some(fr => fr.id === r.id))
            .slice(0, 4 - finalRecipes.length);
          finalRecipes = [...finalRecipes, ...randomRecipes];
        }

        setRelatedRecipes(finalRecipes);
        setLoadingRelatedRecipes(false);

      } catch (error) {
        console.error("Error loading related recipes:", error);
        setRelatedRecipes([]);
        setLoadingRelatedRecipes(false);
      }
    };

    loadRelatedRecipesOnce();

    // Cleanup
    return () => {
      hasLoadedRelatedRef.current = false;
    };
  }, [recipe.id, recipe.category, isApproved]);

  // Helper function to get category from recipe
  const getRecipeCategory = (recipeData) => {
    if (!recipeData.category) return '';
    
    if (typeof recipeData.category === 'object') {
      return recipeData.category[currentLanguage] || 
             recipeData.category.en || 
             recipeData.category.am || 
             '';
    }
    
    return recipeData.category || '';
  };

  // Get localized title for any recipe
  const getRecipeTitle = (recipeData) => {
    if (!recipeData.title) return t('explore.untitledRecipe');
    
    if (typeof recipeData.title === 'object') {
      return recipeData.title[currentLanguage] || 
             recipeData.title.en || 
             t('explore.untitledRecipe');
    }
    
    return recipeData.title || t('explore.untitledRecipe');
  };

  // Get image source for any recipe
  const getRecipeImageSource = (recipeData) => {
    if (recipeData?.imageBase64) {
      return { uri: `data:image/jpeg;base64,${recipeData.imageBase64}` };
    } else if (recipeData?.imageURL) {
      return { uri: recipeData.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  // Render related recipe item
  const renderRelatedRecipe = ({ item, index }) => {
    const title = getRecipeTitle(item);
    const category = getRecipeCategory(item);
    
    return (
      <TouchableOpacity
        style={[styles.relatedRecipeCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.replace('RecipeDetail', { recipe: item })}
        activeOpacity={0.9}
      >
        <Image 
          source={getRecipeImageSource(item)} 
          style={styles.relatedRecipeImage}
          defaultSource={require('../assets/placeholder-image.jpg')}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.relatedRecipeGradient}
        />
        <View style={styles.relatedRecipeContent}>
          <Text style={styles.relatedRecipeTitle} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.relatedRecipeMeta}>
            <View style={[styles.relatedRecipeCategory, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="pricetag" size={10} color="#fff" />
              <Text style={styles.relatedRecipeCategoryText}>
                {category || t('categories.all')}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render related recipes section
  const renderRelatedRecipesSection = () => {
    if (!isApproved) return null;
    
    return (
      <View style={styles.relatedRecipesSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="restaurant-outline" size={22} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('recipeDetail.relatedRecipes')}
          </Text>
          <TouchableOpacity 
            onPress={() => setShowRelatedRecipes(!showRelatedRecipes)}
            style={styles.toggleRelatedButton}
          >
            <Ionicons 
              name={showRelatedRecipes ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
        
        {showRelatedRecipes && (
          <>
            {loadingRelatedRecipes ? (
              <ActivityIndicator size="small" color={colors.primary} style={styles.relatedLoading} />
            ) : relatedRecipes.length > 0 ? (
              <FlatList
                data={relatedRecipes}
                renderItem={renderRelatedRecipe}
                keyExtractor={(item) => `related-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.relatedRecipesList}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
            ) : (
              <View style={[styles.noRelatedRecipes, { backgroundColor: colors.card }]}>
                <Ionicons name="restaurant-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.noRelatedText, { color: colors.textSecondary }]}>
                  {t('recipeDetail.noRelatedRecipes')}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

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
                dialogConfig.type === 'confirm' ? '#FFA000' : '#FF9800'
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

  const showProgressBar = (text) => {
    setProgressText(text);
    setShowProgress(true);
  };

  const hideProgressBar = () => {
    setShowProgress(false);
    setProgressText("");
  };

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

  const getImageSource = () => {
    if (recipe.imageBase64) {
      return { uri: `data:image/jpeg;base64,${recipe.imageBase64}` };
    } else if (recipe.imageURL) {
      return { uri: recipe.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  const formatTextWithLineBreaks = (text) => {
    const localizedText = getLocalizedText(text);
    if (!localizedText) return null;
    
    return localizedText.split('\n').map((line, index) => (
      <Text key={index} style={[styles.textLine, { color: colors.text }]}>
        {line.trim()}
      </Text>
    ));
  };

  // Initialize local DB and check favourite
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

  // Load comments (real-time) and fetch user profiles
  useEffect(() => {
    const q = query(
      collection(db, "comments"),
      where("recipeId", "==", recipe.id),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
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

    try {
      let username = user.email?.split("@")[0] || "Anonymous";
      let profilePhoto = null;
      let displayName = username;
      
      if (currentUserProfile) {
        displayName = currentUserProfile.name || 
                     currentUserProfile.displayName || 
                     displayName;
        profilePhoto = currentUserProfile.profilePhoto || null;
      }

      await addDoc(collection(db, "comments"), {
        recipeId: recipe.id,
        userId: user.uid,
        username: displayName,
        profilePhoto: profilePhoto,
        userEmail: user.email,
        text: newComment.trim(),
        timestamp: new Date(),
      });
      setNewComment("");
    } catch (err) {
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

  // Helper function to extract YouTube Video ID
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^#\&\?]{11})/,
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  };

  const getYouTubeThumbnail = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  const handleThumbnailLoad = () => {
    setThumbnailLoading(false);
  };

  const handleThumbnailError = () => {
    setThumbnailLoading(false);
  };

  const openYouTubeVideo = () => {
    if (recipe.videoURL) {
      const youtubeAppUrl = recipe.videoURL.replace('youtube.com', 'youtube.com');
      
      Linking.canOpenURL(youtubeAppUrl)
        .then((supported) => {
          if (supported) {
            return Linking.openURL(youtubeAppUrl);
          } else {
            return Linking.openURL(recipe.videoURL);
          }
        })
        .catch((err) => {
          console.error('Failed to open YouTube:', err);
          showCustomDialog(
            t('app.error'),
            t('errors.cannotOpenVideo'),
            'error'
          );
        });
    }
  };

  const hasDescription = recipe.description && 
                        getLocalizedText(recipe.description).trim().length > 0;

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  // Format date for comments
  const formatCommentDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
      
      if (diffInHours < 24) {
        if (diffInHours === 0) {
          const diffInMinutes = Math.floor((now - date) / (1000 * 60));
          if (diffInMinutes === 0) {
            return t('comments.justNow');
          }
          return `${diffInMinutes} ${t('comments.minutesAgo')}`;
        }
        return `${diffInHours} ${t('comments.hoursAgo')}`;
      }
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  // Navigate to author profile
  const navigateToAuthorProfile = () => {
    const authorId = recipe.authorId || recipe.userId;
    if (authorId) {
      navigation.navigate('UserProfile', { userId: authorId });
    }
  };

  // Get author display name
  const getAuthorDisplayName = () => {
    if (authorData?.name || authorData?.displayName) {
      return authorData.name || authorData.displayName;
    }
    
    if (recipe.authorName) {
      return recipe.authorName;
    }
    
    if (recipe.authorEmail) {
      return recipe.authorEmail.split("@")[0];
    }
    
    return t('recipe.anonymousAuthor');
  };

  // Get author initials
  const getAuthorInitials = () => {
    const name = getAuthorDisplayName();
    if (!name) return "A";
    return name.charAt(0).toUpperCase();
  };

  // Render author section
  const renderAuthorSection = () => {
    const authorId = recipe.authorId || recipe.userId;
    
    if (!authorId) {
      return null;
    }
    
    return (
      <TouchableOpacity 
        style={[styles.authorSection, { backgroundColor: colors.card }]}
        onPress={navigateToAuthorProfile}
        activeOpacity={0.7}
        disabled={loadingAuthor}
      >
        <View style={styles.authorInfo}>
          {loadingAuthor ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <View style={styles.authorAvatarContainer}>
                {authorData?.profilePhoto ? (
                  <Image 
                    source={{ uri: authorData.profilePhoto }} 
                    style={styles.authorProfileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.authorAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.authorInitials}>
                      {getAuthorInitials()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.authorDetails}>
                <Text style={[styles.authorLabel, { color: colors.textSecondary }]}>
                  {t('recipe.createdBy')}
                </Text>
                <Text style={[styles.authorName, { color: colors.text }]}>
                  {getAuthorDisplayName()}
                </Text>
                {recipe.createdAt && (
                  <Text style={[styles.recipeDate, { color: colors.textSecondary }]}>
                    {formatDate(recipe.createdAt)}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      <CustomDialog />
      <ProgressModal />
      
      <View style={styles.imageContainer}>
        <Image source={getImageSource()} style={styles.image} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)"]}
          style={styles.imageGradient}
        />
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
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

      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        {/* Title and Category */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: colors.text }]}>{getLocalizedText(recipe.title)}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.categoryText}>{getLocalizedText(recipe.category)}</Text>
          </View>
        </View>

        {/* Author Section */}
        {renderAuthorSection()}

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

        {/* Description */}
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

        {/* YouTube Video */}
        {isApproved && recipe.videoURL && (
          <View style={styles.videoPlayerContainer}>
            {(() => {
              const videoId = getYouTubeVideoId(recipe.videoURL);
              if (videoId) {
                return (
                  <TouchableOpacity 
                    style={styles.videoThumbnailContainer}
                    onPress={openYouTubeVideo}
                    activeOpacity={0.8}
                  >
                    <View style={styles.videoThumbnailWrapper}>
                      {thumbnailLoading && (
                        <View style={styles.thumbnailLoading}>
                          <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                      )}
                      <Image
                        source={{ uri: getYouTubeThumbnail(videoId) }}
                        style={styles.videoThumbnail}
                        resizeMode="cover"
                        onLoad={handleThumbnailLoad}
                        onError={handleThumbnailError}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.videoGradient}
                      />
                      <View style={styles.videoOverlay}>
                        <View style={styles.playButtonContainer}>
                          <Ionicons name="play-circle" size={70} color="#FF0000" />
                        </View>
                        <Text style={styles.watchText}>{t('recipe.watchVideo')}</Text>
                        <Text style={styles.youtubeText}>YouTube</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              } else {
                return (
                  <TouchableOpacity 
                    style={[styles.invalidUrlContainer, { backgroundColor: colors.card }]}
                    onPress={() => Linking.openURL(recipe.videoURL)}
                  >
                    <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                    <Text style={[styles.invalidUrlText, { color: colors.text }]}>
                      {t('recipe.watchOnYouTube')}
                    </Text>
                  </TouchableOpacity>
                );
              }
            })()}
          </View>
        )}

        {/* Comments Section */}
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
              comments.map((c, index) => {
                const displayName = c.username || c.userEmail?.split("@")[0] || "Anonymous";
                const profilePhoto = c.profilePhoto;
                
                return (
                  <View key={`comment-${c.id}-${index}`} style={[styles.commentBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.commentHeader}>
                      <TouchableOpacity 
                        style={styles.commentUserInfo}
                        onPress={() => navigation.navigate('UserProfile', { userId: c.userId })}
                        activeOpacity={0.7}
                      >
                        {profilePhoto ? (
                          <Image 
                            source={{ uri: profilePhoto }} 
                            style={styles.userProfileImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
                            <Text style={styles.avatarText}>
                              {displayName?.charAt(0)?.toUpperCase() || "U"}
                            </Text>
                          </View>
                        )}
                        <View>
                          <Text style={[styles.commentUser, { color: colors.text }]}>{displayName}</Text>
                          <Text style={[styles.commentTime, { color: colors.textSecondary }]}>
                            {formatCommentDate(c.timestamp)}
                          </Text>
                        </View>
                      </TouchableOpacity>
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
                );
              })
            )}

            {/* Add Comment */}
            <View style={[styles.commentInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.commentInputWrapper}>
                {user ? (
                  <>
                    {currentUserProfile?.profilePhoto ? (
                      <Image 
                        source={{ uri: currentUserProfile.profilePhoto }} 
                        style={styles.currentUserProfileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.currentUserAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.currentAvatarText}>
                          {currentUserProfile?.name?.charAt(0)?.toUpperCase() || 
                           currentUserProfile?.displayName?.charAt(0)?.toUpperCase() ||
                           user.email?.charAt(0)?.toUpperCase() || "U"}
                        </Text>
                      </View>
                    )}
                    <TextInput
                      style={[styles.commentInput, { color: colors.text }]}
                      placeholder={t('comments.addPlaceholder')}
                      placeholderTextColor={colors.textSecondary}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                    />
                  </>
                ) : (
                  <TextInput
                    style={[styles.commentInput, { color: colors.text }]}
                    placeholder={t('comments.loginToComment')}
                    placeholderTextColor={colors.textSecondary}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    editable={false}
                  />
                )}
              </View>
              <TouchableOpacity 
                onPress={handleAddComment}
                style={[
                  styles.sendButton,
                  { backgroundColor: newComment.trim() ? colors.primary : colors.border }
                ]}
                disabled={!newComment.trim() || !user}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* NEW: Related Recipes Section (AFTER COMMENTS) */}
        {renderRelatedRecipesSection()}
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
  // Author Section Styles
  authorSection: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  authorAvatarContainer: {
    marginRight: 12,
  },
  authorProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  authorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  authorInitials: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
  },
  authorDetails: {
    flex: 1,
  },
  authorLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  authorName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  recipeDate: {
    fontSize: 12,
    fontStyle: "italic",
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
  // NEW: Related Recipes Section Styles
  relatedRecipesSection: {
    marginTop: 30,
    marginBottom: 20,
  },
  toggleRelatedButton: {
    padding: 4,
    marginLeft: 'auto',
  },
  relatedLoading: {
    marginVertical: 20,
  },
  relatedRecipesList: {
    paddingVertical: 10,
  },
  relatedRecipeCard: {
    width: 180,
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  relatedRecipeImage: {
    width: "100%",
    height: "100%",
  },
  relatedRecipeGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  relatedRecipeContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  relatedRecipeTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    lineHeight: 18,
  },
  relatedRecipeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  relatedRecipeCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  relatedRecipeCategoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 4,
  },
  noRelatedRecipes: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 10,
  },
  noRelatedText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
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
  // YouTube Thumbnail Styles
  videoPlayerContainer: {
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  videoThumbnailContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoThumbnailWrapper: {
    position: 'relative',
    height: Math.floor((width - 40) * (9/16)),
    backgroundColor: '#000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 40,
    padding: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  watchText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  youtubeText: {
    color: '#FF0000',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  invalidUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  invalidUrlText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  // Comments Section
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
  userProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  commentUser: {
    fontWeight: "bold",
    fontSize: 15,
  },
  commentTime: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  deleteButton: {
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 15,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  commentInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  currentUserProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 6,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentAvatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  commentInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: '#FF9800',
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