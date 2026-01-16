
// screens/ProfileScreen.js - UPDATED FOR GUEST USERS
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { signOut } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useGuest } from "../contexts/GuestContext";

const { width, height } = Dimensions.get("window");

export default function ProfileScreen({ navigation, route }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [dialogAnimation] = useState(new Animated.Value(0));
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { locale, t } = useLanguage();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { isGuest, clearGuest } = useGuest();

  useEffect(() => {
    if (!isGuest) {
      loadUserData();
      loadUnreadNotifications();
    } else {
      setLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (!isGuest && route.params?.updated) {
        loadUserData();
      }
      if (!isGuest) {
        loadUnreadNotifications();
      }
    });
    return unsubscribe;
  }, [navigation, route, isGuest]);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const showGuestRestrictionDialog = (featureName) => {
    Alert.alert(
      t('profile.guest.restrictedTitle') || "Feature Restricted",
      t('profile.guest.restrictedMessage') || `Please sign up or log in to access ${featureName}.`,
      [
        { text: t('common.cancel') || "Cancel", style: "cancel" },
        { 
          text: t('profile.guest.loginButton') || "Login / Sign Up", 
          onPress: () => navigation.navigate("Login") 
        },
      ]
    );
  };

  const handleGuestButtonPress = (featureName) => {
    if (isGuest) {
      showGuestRestrictionDialog(featureName);
      return false;
    }
    return true;
  };

  const handleEditProfile = () => {
    if (!handleGuestButtonPress(t('profile.editProfile') || "Edit Profile")) return;
    navigation.navigate("EditProfile", { userData });
  };

  const handleNotifications = () => {
    if (!handleGuestButtonPress(t('profile.notifications') || "Notifications")) return;
    navigation.navigate("Notifications");
  };

  const handleMyRecipes = () => {
    if (!handleGuestButtonPress(t('profile.myRecipes') || "My Recipes")) return;
    navigation.navigate("MyRecipes");
  };

  // UPDATED: Handle help & support - opens email instead of navigating to a screen
  const handleHelpSupport = () => {
    if (isGuest) {
      showGuestRestrictionDialog(t('profile.helpSupport') || "Help & Support");
      return;
    }
    
    // Open email client with pre-filled subject
    Linking.openURL('mailto:support@recipeapp.com?subject=Recipe App Support Request');
  };

  const handleAbout = () => {
    navigation.navigate("About");
  };

  const handleViewPublicProfile = () => {
    if (isGuest) {
      showGuestRestrictionDialog(t('profile.viewPublicProfile') || "Public Profile");
      return;
    }
    
    const currentUser = auth.currentUser;
    if (currentUser) {
      navigation.navigate('UserProfile', { userId: currentUser.uid });
    }
  };

  const showCustomLogoutDialog = () => {
    if (isGuest) {
      Alert.alert(
        t('profile.guest.exitGuestMode') || "Exit Guest Mode",
        t('profile.guest.exitMessage') || "Do you want to exit guest mode and go to login?",
        [
          { text: t('common.cancel') || "Cancel", style: "cancel" },
          { 
            text: t('profile.guest.exitButton') || "Exit Guest Mode", 
            onPress: handleGuestLogout 
          },
        ]
      );
      return;
    }
    
    setShowLogoutDialog(true);
    Animated.spring(dialogAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const hideCustomLogoutDialog = () => {
    Animated.timing(dialogAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowLogoutDialog(false);
    });
  };

  const handleLogoutConfirm = () => {
    hideCustomLogoutDialog();
    performLogout();
  };

  // UPDATED: Simple guest logout without notifications
  const handleGuestLogout = async () => {
    setLogoutLoading(true);
    try {
      await clearGuest();
      console.log("Guest mode exited");
      
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
      
    } catch (error) {
      console.error("Error exiting guest mode:", error);
      Alert.alert("Error", "Could not exit guest mode");
    } finally {
      setLogoutLoading(false);
    }
  };

  // UPDATED: Simple logout function without notifications
  const performLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut(auth);
      console.log("Logout successful");
      
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
      
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLogoutLoading(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "admin": return "#ff6b6b";
      case "moderator": return "#4ecdc4";
      case "user": return "#45b7d1";
      case "guest": return "#95a5a6";
      default: return "#95a5a6";
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin": return "shield";
      case "moderator": return "shield-checkmark";
      case "user": return "person";
      case "guest": return "person-outline";
      default: return "help";
    }
  };

  const getLocalizedRole = (role) => {
    return t(`profile.roles.${role}`) || role;
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const LogoutDialog = () => {
    const translateY = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });

    const opacity = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Modal
        visible={showLogoutDialog}
        transparent
        animationType="none"
        onRequestClose={hideCustomLogoutDialog}
      >
        <View style={styles.dialogOverlay}>
          <Animated.View style={[styles.dialogContainer, { 
            backgroundColor: colors.card,
            opacity,
            transform: [{ translateY }] 
          }]}>
            <View style={styles.dialogIcon}>
              <Ionicons name="log-out-outline" size={48} color="#e74c3c" />
            </View>
            
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {t("profile.logout.title")}
            </Text>
            
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
              {t("profile.logout.confirmMessage")}
            </Text>
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={[styles.dialogButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={hideCustomLogoutDialog}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dialogButton, styles.confirmButton]}
                onPress={handleLogoutConfirm}
              >
                <Text style={styles.confirmButtonText}>
                  {t("profile.logout.button")}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{t("profile.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.customHeader, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>
          {isGuest ? t('profile.guest.settings') || "Guest Settings" : t("profile.settings")}
        </Text>
        {!isGuest && (
          <TouchableOpacity 
            style={styles.viewProfileButton}
            onPress={handleViewPublicProfile} 
          >
            <Ionicons name="person-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarContainer}>
            {!isGuest && userData?.profilePhoto ? (
              <Image 
                source={{ uri: userData.profilePhoto }} 
                style={[styles.avatar, { borderColor: colors.primary }]}
              />
            ) : (
              <View style={[styles.avatar, { 
                backgroundColor: isGuest ? '#95a5a6' : colors.primary 
              }]}>
                <Ionicons 
                  name={isGuest ? "person-outline" : "person"} 
                  size={40} 
                  color="#fff" 
                />
              </View>
            )}
            
            {!isGuest && (
              <TouchableOpacity 
                style={[styles.editIconButton, { backgroundColor: colors.primary }]}
                onPress={handleEditProfile}
              >
                <Ionicons name="create-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={[styles.userName, { color: colors.text }]}>
            {isGuest 
              ? t('profile.guest.userName') || "Guest User"
              : userData?.name || auth.currentUser?.email?.split("@")[0] || t("profile.defaultName")}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {isGuest 
              ? t('profile.guest.email') || "guest@example.com"
              : auth.currentUser?.email}
          </Text>
          
          <View style={[styles.roleBadge, { 
            backgroundColor: isGuest ? getRoleColor("guest") : getRoleColor(userData?.role || "user") 
          }]}>
            <Ionicons 
              name={isGuest ? getRoleIcon("guest") : getRoleIcon(userData?.role || "user")} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.roleText}>
              {isGuest 
                ? t('profile.roles.guest') || "Guest"
                : getLocalizedRole(userData?.role || "user")}
            </Text>
          </View>
          
          {!isGuest && (
            <TouchableOpacity 
              style={[styles.viewPublicProfileButton, { borderColor: colors.primary }]}
              onPress={handleViewPublicProfile}
            >
              <Ionicons name="eye-outline" size={16} color={colors.primary} />
              <Text style={[styles.viewPublicProfileText, { color: colors.primary }]}>
                {t("profile.viewPublicProfile")}
              </Text>
            </TouchableOpacity>
          )}
          
          {isGuest && (
            <View style={[styles.guestInfoBox, { backgroundColor: 'rgba(149, 165, 166, 0.1)' }]}>
              <Ionicons name="information-circle-outline" size={20} color="#95a5a6" />
              <Text style={[styles.guestInfoText, { color: '#95a5a6' }]}>
                {t('profile.guest.infoMessage') || "Sign up to save recipes, post content, and access all features."}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.menu, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={toggleTheme}
          >
            <Ionicons 
              name={isDarkMode ? "sunny" : "moon"} 
              size={24} 
              color={colors.textSecondary} 
            />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {isDarkMode ? t("profile.lightMode") : t("profile.darkMode")}
            </Text>
            <View style={styles.toggleRight}>
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                {isDarkMode ? t("common.on") : t("common.off")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Ionicons name="language-outline" size={24} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {t("profile.language")}
            </Text>
            <LanguageSwitcher />
          </View>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleNotifications}
            disabled={isGuest}
          >
            <View style={styles.notificationIconContainer}>
              <Ionicons 
                name="notifications-outline" 
                size={24} 
                color={isGuest ? colors.textDisabled : colors.textSecondary} 
              />
              {!isGuest && unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.menuText, { 
              color: isGuest ? colors.textDisabled : colors.text 
            }]}>
              {t("profile.notifications")}
            </Text>
            <View style={styles.notificationRight}>
              {!isGuest && unreadNotifications > 0 && (
                <Text style={[styles.unreadCount, { color: colors.primary }]}>
                  {unreadNotifications} {t("profile.unread")}
                </Text>
              )}
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={isGuest ? colors.textDisabled : colors.textSecondary} 
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleMyRecipes}
            disabled={isGuest}
          >
            <Ionicons 
              name="restaurant-outline" 
              size={24} 
              color={isGuest ? colors.textDisabled : colors.textSecondary} 
            />
            <Text style={[styles.menuText, { 
              color: isGuest ? colors.textDisabled : colors.text 
            }]}>
              {t("profile.myRecipes")}
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={isGuest ? colors.textDisabled : colors.textSecondary} 
            />
          </TouchableOpacity>

          {/* UPDATED: Help & Support - Opens email */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleHelpSupport}
            disabled={isGuest}
          >
            <Ionicons 
              name="help-circle-outline" 
              size={24} 
              color={isGuest ? colors.textDisabled : colors.textSecondary} 
            />
            <Text style={[styles.menuText, { 
              color: isGuest ? colors.textDisabled : colors.text 
            }]}>
              {t("profile.helpSupport")}
            </Text>
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={isGuest ? colors.textDisabled : colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleAbout}
          >
            <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
            <Text style={[styles.menuText, { color: colors.text }]}>
              {t("profile.about")}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity 
            style={[
              styles.logoutButton, 
              { backgroundColor: colors.card },
              logoutLoading && styles.logoutButtonDisabled
            ]}
            onPress={showCustomLogoutDialog}
            disabled={logoutLoading}
          >
            <View style={[styles.logoutIconContainer, { 
              backgroundColor: isGuest 
                ? "rgba(149, 165, 166, 0.1)" 
                : "rgba(231, 76, 60, 0.1)" 
            }]}>
              {logoutLoading ? (
                <ActivityIndicator size="small" color={isGuest ? "#95a5a6" : "#e74c3c"} />
              ) : (
                <Ionicons 
                  name={isGuest ? "exit-outline" : "log-out-outline"} 
                  size={24} 
                  color={isGuest ? "#95a5a6" : "#e74c3c"} 
                />
              )}
            </View>
            <View style={styles.logoutTextContainer}>
              <Text style={[styles.logoutText, { 
                color: isGuest ? "#95a5a6" : "#e74c3c" 
              }]}>
                {logoutLoading 
                  ? t("profile.logout.loggingOut") 
                  : isGuest 
                    ? t('profile.guest.exitButton') || "Exit Guest Mode"
                    : t("profile.logout.button")}
              </Text>
              <Text style={[styles.logoutSubtext, { color: colors.textSecondary }]}>
                {isGuest 
                  ? t('profile.guest.exitSubtext') || "Sign in to access all features"
                  : t("profile.logout.subtext")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            {t("profile.version")} 1.0.0
          </Text>
        </View>
      </ScrollView>

      <LogoutDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
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
  viewProfileButton: {
    padding: 8,
    marginRight: -8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
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
  profileCard: {
    alignItems: "center",
    padding: 30,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
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
  editIconButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
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
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    textTransform: "capitalize",
  },
  viewPublicProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
    gap: 6,
  },
  viewPublicProfileText: {
    fontSize: 14,
    fontWeight: "500",
  },
  menu: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  toggleRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    marginRight: 4,
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
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  notificationRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  unreadCount: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoutTextContainer: {
    flex: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
  logoutSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  versionText: {
    fontSize: 14,
    fontWeight: "500",
  },
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
    backgroundColor: "rgba(231, 76, 60, 0.1)",
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
  guestInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    gap: 10,
  },
  guestInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
