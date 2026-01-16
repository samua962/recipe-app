import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  RefreshControl,
  Modal,
  Animated,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { useLocalizedRecipes } from "../hooks/useLocalizedRecipes";

const { width } = Dimensions.get("window");

export default function UserProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t, currentLanguage } = useLanguage();
  const { colors } = useTheme();
  const { getLocalizedRecipe, getLocalizedRecipes } = useLocalizedRecipes();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRecipes, setUserRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUnfollowDialog, setShowUnfollowDialog] = useState(false);
  const [dialogAnimation] = useState(new Animated.Value(0));
  
  const currentUser = auth.currentUser;
  
  // Get userId from params or use current user
  const userId = route.params?.userId || currentUser?.uid;

  // Load all data
  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        loadUserProfile(),
        loadUserRecipes(),
        checkIfFollowing()
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      navigation.goBack();
      return;
    }
    
    loadAllData();
    setupRealTimeListeners();
    
    return () => {
      // Cleanup listeners
      const unsubs = [setupFollowersListener(), setupFollowingListener()];
      unsubs.forEach(unsub => unsub && unsub());
    };
  }, [userId, currentUser, loadAllData]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  const loadUserProfile = async () => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserData(data);
        setIsCurrentUser(currentUser?.uid === userId);
      } else {
        Alert.alert(t('profile.error'), t('profile.userNotFound'));
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      Alert.alert(t('profile.error'), t('profile.loadError'));
      navigation.goBack();
    }
  };

  const loadUserRecipes = async () => {
    try {
      setLoadingRecipes(true);
      const recipesRef = collection(db, "recipes");
      
      let recipes = [];
      
      try {
        const q1 = query(
          recipesRef, 
          where("authorId", "==", userId),
          where("approved", "==", true)
        );
        const snapshot1 = await getDocs(q1);
        snapshot1.forEach((doc) => {
          recipes.push({ id: doc.id, ...doc.data() });
        });
      } catch (error) {
        console.log("No recipes found with authorId field:", error.message);
      }
      
      try {
        const q2 = query(
          recipesRef, 
          where("userId", "==", userId),
          where("approved", "==", true)
        );
        const snapshot2 = await getDocs(q2);
        snapshot2.forEach((doc) => {
          recipes.push({ id: doc.id, ...doc.data() });
        });
      } catch (error) {
        console.log("No recipes found with userId field:", error.message);
      }
      
      const uniqueRecipes = Array.from(new Map(recipes.map(recipe => [recipe.id, recipe])).values());
      setUserRecipes(uniqueRecipes);
    } catch (error) {
      console.error("Error loading user recipes:", error);
    } finally {
      setLoadingRecipes(false);
      setLoading(false);
    }
  };

  // CHECK IF CURRENT USER IS FOLLOWING THIS USER
  const checkIfFollowing = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    
    try {
      const followRef = doc(db, "followers", `${userId}_${currentUser.uid}`);
      const followSnap = await getDoc(followRef);
      setIsFollowing(followSnap.exists());
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  // SETUP REAL-TIME LISTENERS
  const setupRealTimeListeners = () => {
    if (!userId || !currentUser) return;
    
    setupFollowersListener();
    setupFollowingListener();
  };

  // SETUP REAL-TIME LISTENER FOR FOLLOWERS COUNT
  const setupFollowersListener = () => {
    if (!userId) return null;
    
    try {
      const followersRef = collection(db, "followers");
      const q = query(followersRef, where("followingId", "==", userId));
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          setFollowersCount(snapshot.size);
        },
        (error) => {
          console.error("Followers listener error:", error);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up followers listener:", error);
      return null;
    }
  };

  // SETUP REAL-TIME LISTENER FOR FOLLOWING COUNT
  const setupFollowingListener = () => {
    if (!userId) return null;
    
    try {
      const followingRef = collection(db, "followers");
      const q = query(followingRef, where("followerId", "==", userId));
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          setFollowingCount(snapshot.size);
        },
        (error) => {
          console.error("Following listener error:", error);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up following listener:", error);
      return null;
    }
  };

  // SHOW UNFOLLOW DIALOG
  const showCustomUnfollowDialog = () => {
    setShowUnfollowDialog(true);
    Animated.spring(dialogAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  // HIDE UNFOLLOW DIALOG
  const hideCustomUnfollowDialog = () => {
    Animated.timing(dialogAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowUnfollowDialog(false);
    });
  };

  // HANDLE UNFOLLOW CONFIRMATION
  const handleUnfollowConfirm = () => {
    hideCustomUnfollowDialog();
    performUnfollow();
  };

  // PERFORM UNFOLLOW
  const performUnfollow = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    
    setFollowLoading(true);
    try {
      const followRef = doc(db, "followers", `${userId}_${currentUser.uid}`);
      await deleteDoc(followRef);
      setIsFollowing(false);
      
      // Create notification for unfollow
      await createNotification('unfollow');
      
    } catch (error) {
      console.error("Error unfollowing:", error);
      Alert.alert(t('profile.error'), t('profile.unfollowError'));
    } finally {
      setFollowLoading(false);
    }
  };

  // HANDLE FOLLOW
  const handleFollow = async () => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    
    setFollowLoading(true);
    try {
      const followRef = doc(db, "followers", `${userId}_${currentUser.uid}`);
      
      await setDoc(followRef, {
        followerId: currentUser.uid,
        followingId: userId,
        createdAt: new Date(),
        followerName: currentUser.displayName || currentUser.email?.split('@')[0],
        followerPhoto: currentUser.photoURL || null
      });
      
      setIsFollowing(true);
      
      // Create notification for follow
      await createNotification('follow');
      
    } catch (error) {
      console.error("Error following:", error);
      Alert.alert(t('profile.error'), t('profile.followError'));
    } finally {
      setFollowLoading(false);
    }
  };

  // CREATE NOTIFICATION FOR FOLLOW/UNFOLLOW
  const createNotification = async (type) => {
    if (!currentUser || !userId || currentUser.uid === userId) return;
    
    try {
      const notificationRef = doc(collection(db, "notifications"));
      const message = type === 'follow' 
        ? `${currentUser.displayName || currentUser.email?.split('@')[0]} started following you`
        : `${currentUser.displayName || currentUser.email?.split('@')[0]} unfollowed you`;
      
      await setDoc(notificationRef, {
        id: notificationRef.id,
        userId: userId,
        type: type,
        message: message,
        read: false,
        createdAt: new Date(),
        fromUserId: currentUser.uid,
        fromUserName: currentUser.displayName || currentUser.email,
        fromUserPhoto: currentUser.photoURL || null
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "#ff6b6b";
      case "moderator": return "#4ecdc4";
      case "user": return "#45b7d1";
      default: return "#95a5a6";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin": return "shield";
      case "moderator": return "shield-checkmark";
      case "user": return "person";
      default: return "help";
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return "";
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  // Helper function to get localized recipe title
  const getLocalizedTitle = (recipe) => {
    if (!recipe) return t('recipe.untitled');
    
    // Use the getLocalizedRecipe function from the hook
    const localizedRecipe = getLocalizedRecipe(recipe);
    return localizedRecipe?.title || recipe?.title?.[currentLanguage] || recipe?.title || t('recipe.untitled');
  };

  // Helper function to get image source
  const getImageSource = (recipe) => {
    if (recipe.imageBase64) {
      return { uri: `data:image/jpeg;base64,${recipe.imageBase64}` };
    } else if (recipe.imageURL) {
      return { uri: recipe.imageURL };
    } else {
      return require('../assets/placeholder-image.jpg');
    }
  };

  // Handle back button press
  const handleBackPress = () => {
    navigation.goBack();
  };

  // Handle settings/profile edit press
  const handleSettingsPress = () => {
    if (isCurrentUser) {
      // Navigate to SettingsProfile (ProfileScreen with settings)
      navigation.navigate('SettingsProfile');
    } else {
      // For other users, maybe show options menu in future
      // For now, just go back
      navigation.goBack();
    }
  };

  // NAVIGATE TO FOLLOWERS/FOLLOWING LISTS
  const handleFollowersPress = () => {
    if (followersCount > 0) {
      navigation.navigate('FollowersList', { userId, type: 'followers' });
    }
  };

  const handleFollowingPress = () => {
    if (followingCount > 0) {
      navigation.navigate('FollowersList', { userId, type: 'following' });
    }
  };

  // RENDER RECIPE CARD FOR GRID VIEW
  const renderRecipeCard = ({ item }) => (
    <TouchableOpacity 
      style={[styles.recipeCard, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate("RecipeDetail", { recipe: item })}
    >
      {item.imageURL || item.imageBase64 ? (
        <Image 
          source={getImageSource(item)} 
          style={styles.recipeImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.recipeImagePlaceholder, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="restaurant-outline" size={30} color={colors.primary} />
        </View>
      )}
      <Text style={[styles.recipeTitle, { color: colors.text }]} numberOfLines={2}>
        {getLocalizedTitle(item)}
      </Text>
      <View style={styles.recipeMeta}>
        <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
        <Text style={[styles.recipeMetaText, { color: colors.textSecondary }]}>
          {item.cookingTime || '?'} {t('recipe.minutes')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // UNFOLLOW DIALOG COMPONENT
  const UnfollowDialog = () => {
    const translateY = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });

    const opacity = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    
    const userName = userData?.name || userData?.email?.split("@")[0] || t('profile.defaultName');
    
    return (
      <Modal
        visible={showUnfollowDialog}
        transparent
        animationType="none"
        onRequestClose={hideCustomUnfollowDialog}
      >
        <View style={styles.dialogOverlay}>
          <Animated.View style={[styles.dialogContainer, { 
            backgroundColor: colors.card,
            opacity,
            transform: [{ translateY }] 
          }]}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(231, 76, 60, 0.1)" }]}>
              <Ionicons name="person-remove-outline" size={48} color="#e74c3c" />
            </View>
            
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {t("profile.unfollow.title")}
            </Text>
            
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
              {t("profile.unfollow.confirmMessage").replace('{name}', userName)}
            </Text>
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={[styles.dialogButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={hideCustomUnfollowDialog}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dialogButton, styles.confirmButton, { backgroundColor: "#e74c3c" }]}
                onPress={handleUnfollowConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  {t("profile.unfollow.button")}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{t('profile.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Conditional Back Button */}
      <View style={styles.header}>
        {/* Show back button only if NOT current user */}
        {!isCurrentUser ? (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleSettingsPress}
          >
            <Ionicons name="menu-outline" size={28} color={colors.text} />
          </TouchableOpacity>
        )}
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isCurrentUser ? t('profile.myProfile') : t('profile.userProfile')}
        </Text>
        
        {/* Right side icon - Settings for current user, empty space for others */}
        {isCurrentUser ? (
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={handleSettingsPress}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {/* Profile Info Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
        <View style={styles.avatarContainer}>
          {userData?.profilePhoto ? (
            <Image 
              source={{ uri: userData.profilePhoto }} 
              style={[styles.avatar, { borderColor: colors.primary }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={styles.avatarInitial}>
                {getInitials(userData?.name || userData?.email)}
              </Text>
            </View>
          )}
          
          {/* Edit Profile Button for current user */}
          {isCurrentUser && (
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate("EditProfile", { userData })}
            >
              <Ionicons name="create-outline" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.userName, { color: colors.text }]}>
          {userData?.name || userData?.email?.split("@")[0] || t('profile.defaultName')}
        </Text>
        
        {userData?.email && (
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {userData.email}
          </Text>
        )}

        {/* Role Badge */}
        {userData?.role && (
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userData.role) }]}>
            <Ionicons name={getRoleIcon(userData.role)} size={14} color="#fff" />
            <Text style={styles.roleText}>
              {t(`profile.roles.${userData.role}`) || userData.role}
            </Text>
          </View>
        )}

        {/* Follow/Unfollow Button with Options */}
        {!isCurrentUser && currentUser && (
          <View style={styles.followButtonContainer}>
            {isFollowing ? (
              <>
                <TouchableOpacity 
                  style={[
                    styles.followButton,
                    { 
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flex: 3 
                    }
                  ]}
                  onPress={showCustomUnfollowDialog}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color={colors.textSecondary} />
                      <Text style={[styles.followButtonText, { color: colors.textSecondary }]}>
                        {t('profile.following')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.unfollowOptionsButton,
                    { 
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flex: 1 
                    }
                  ]}
                  onPress={showCustomUnfollowDialog}
                  disabled={followLoading}
                >
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.followButton,
                  { 
                    backgroundColor: colors.primary,
                    borderColor: colors.primary 
                  }
                ]}
                onPress={handleFollow}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={16} color="#fff" />
                    <Text style={[styles.followButtonText, { color: "#fff" }]}>
                      {t('profile.follow')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Joined Date */}
        {userData?.createdAt && (
          <View style={styles.joinedContainer}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.joinedText, { color: colors.textSecondary }]}>
              {t('profile.joined')} {formatDate(userData.createdAt)}
            </Text>
          </View>
        )}

        {/* Bio */}
        {userData?.bio && (
          <View style={styles.bioContainer}>
            <Text style={[styles.bioLabel, { color: colors.text }]}>{t('profile.bio')}</Text>
            <Text style={[styles.bioText, { color: colors.textSecondary }]}>{userData.bio}</Text>
          </View>
        )}

        {/* Stats with Real-time Counters */}
        <View style={[styles.statsContainer, { borderTopColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={handleFollowersPress}
            disabled={followersCount === 0}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{followersCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.followers')}</Text>
          </TouchableOpacity>
          
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          
          <TouchableOpacity 
            style={styles.statItem}
            onPress={handleFollowingPress}
            disabled={followingCount === 0}
          >
            <Text style={[styles.statNumber, { color: colors.text }]}>{followingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.following')}</Text>
          </TouchableOpacity>
          
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{userRecipes.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.recipes')}</Text>
          </View>
        </View>
      </View>

      {/* User's Recipes Section - UPDATED TO VERTICAL 2-COLUMN GRID */}
      <View style={styles.recipesSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isCurrentUser ? t('profile.myRecipes') : t('profile.userRecipes')} ({userRecipes.length})
          </Text>
          
          {userRecipes.length > 0 && (
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation.navigate("UserRecipesList", { userId, userName: userData?.name })}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>
                {t('profile.viewAllRecipes')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {loadingRecipes ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.recipesLoading} />
        ) : userRecipes.length === 0 ? (
          <View style={styles.noRecipes}>
            <Ionicons name="restaurant-outline" size={50} color={colors.border} />
            <Text style={[styles.noRecipesText, { color: colors.textSecondary }]}>
              {isCurrentUser ? t('profile.noMyRecipes') : t('profile.noRecipes')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={userRecipes}
            renderItem={renderRecipeCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.recipesGrid}
            columnWrapperStyle={styles.recipeRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Unfollow Dialog */}
      <UnfollowDialog />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  settingsButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  followButtonContainer: {
    flexDirection: "row",
    width: "100%",
    marginVertical: 12,
    gap: 8,
  },
  followButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  unfollowOptionsButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  roleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
    textTransform: "capitalize",
  },
  joinedContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 4,
  },
  joinedText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  bioContainer: {
    width: "100%",
    marginBottom: 20,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 20,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  recipesSection: {
    marginHorizontal: 16,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  recipesLoading: {
    marginVertical: 20,
  },
  noRecipes: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noRecipesText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
  recipesGrid: {
    paddingBottom: 20,
  },
  recipeRow: {
    justifyContent: "space-between",
    marginBottom: 15,
  },
  recipeCard: {
    width: (width - 40) / 2,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 15,
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
  recipeImagePlaceholder: {
    width: "100%",
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    height: 36,
    lineHeight: 18,
  },
  recipeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  recipeMetaText: {
    fontSize: 11,
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
    borderWidth: 2,
  },
  confirmButton: {
    backgroundColor: "#e74c3c",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});