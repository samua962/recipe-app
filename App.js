// App.js - COMPLETE WITH LOGO LOADING SCREEN
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  Image 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from "./firebaseConfig";

// Providers
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { GuestProvider } from "./contexts/GuestContext";
import { NetworkProvider } from './contexts/NetworkContext';

// Import ALL your screens
import IntroScreen from "./screens/IntroScreen";
import AppSplashScreen from "./screens/AppSplashScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import LauncherScreen from "./screens/LauncherScreen";
import RecipeDetailScreen from "./screens/RecipeDetailScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import AddRecipeScreen from "./screens/AddRecipeScreen";
import EditProfileScreen from './screens/EditProfileScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import ProfileScreen from './screens/ProfileScreen';
import FollowersList from "./screens/FollowersList";
import AboutScreen from "./screens/AboutScreen";
import MyRecipesScreen from "./screens/MyRecipesScreen";
import NotificationPreferencesScreen from './screens/NotificationPreferencesScreen';


// Role-based tab navigators
import { UserTabs, ModeratorTabs, AdminTabs } from "./navigation/RoleBasedTabs";

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.simpleLoadingContainer}>
      {/* Ethiopian-themed background pattern */}
      <View style={styles.ethiopianPattern}>
        <Text style={styles.patternText}>🍛🌶️🥘🌿</Text>
      </View>
      
      {/* App Logo/Icon */}
      <View style={styles.logoWrapper}>
        <View style={styles.cookingPot}>
          {/* Use your logo.png instead of emoji */}
          <Image 
            source={require('./assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View style={styles.steam}>
            <Text style={styles.steamIcon}>💨</Text>
            <Text style={styles.steamIcon}>💨</Text>
            <Text style={styles.steamIcon}>💨</Text>
          </View>
        </View>
      </View>
      
      {/* App Name */}
      <Text style={styles.appTitle}>Ethiopian Recipes</Text>
      <Text style={styles.appSubtitle}>Traditional & Authentic</Text>
      
      {/* Loading Indicator */}
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#f37d1cff" />
        <Text style={styles.loadingMessage}>Loading delicious content...</Text>
      </View>
      
      {/* Ethiopian spices decoration */}
      <View style={styles.spicesDecoration}>
        <Text style={styles.spice}>🌶️</Text>
        <Text style={styles.spice}>🧅</Text>
        <Text style={styles.spice}>🧄</Text>
        <Text style={styles.spice}>🍋</Text>
        <Text style={styles.spice}>🌿</Text>
      </View>
    </View>
  );
}

function MainAppContent() {
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState("Launcher");
  const [userRole, setUserRole] = useState('user');
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const checkInitialRoute = async () => {
      try {
        // Check if user has seen onboarding
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        // Check if user is guest
        const guestStatus = await AsyncStorage.getItem('isGuest');
        const isGuestUser = guestStatus === 'true';
        setIsGuest(isGuestUser);
        
        console.log("App: Checking initial route - Onboarding:", hasSeenOnboarding, "Guest:", isGuestUser);
        
        // Listen for auth state
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          console.log("App: Auth state - User:", user ? user.uid : "null");
          
          let routeName = "Launcher";
          
          if (user) {
            // Fetch user role
            try {
              const userDoc = await getDoc(doc(db, "users", user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role || 'user';
                setUserRole(role);
                console.log("App: User role:", role);
              }
            } catch (error) {
              console.log("Error fetching user role:", error);
              setUserRole('user');
            }
            
            console.log("App: User found, going to MainTabs");
            routeName = "MainTabs";
          } 
          else if (isGuestUser) {
            console.log("App: Guest user, going to MainTabs");
            routeName = "MainTabs";
          }
          else if (hasSeenOnboarding === 'true') {
            console.log("App: Has seen onboarding, going to Login");
            routeName = "Login";
          }
          else {
            console.log("App: First time, going to Intro");
            routeName = "Intro";
          }
          
          console.log("App: Setting initial route to:", routeName);
          setInitialRoute(routeName);
          setLoading(false);
        });
        
        return unsubscribe;
      } catch (err) {
        console.log("Error checking initial route:", err);
        setInitialRoute("Launcher");
        setLoading(false);
      }
    };

    checkInitialRoute();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  // Get the correct TabNavigator component
  const getTabNavigator = () => {
    if (isGuest) {
      return UserTabs; // Guest users get UserTabs
    }
    
    switch (userRole) {
      case 'admin': 
        return AdminTabs;
      case 'moderator': 
        return ModeratorTabs;
      default: 
        return UserTabs;
    }
  };

  const TabNavigator = getTabNavigator();

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        {/* Authentication & Intro Screens */}
        <Stack.Screen name="Launcher" component={LauncherScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="AppSplash" component={AppSplashScreen} />
        
        {/* Main Tab Navigator */}
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        
        {/* Screens that are navigated to from within the app */}
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="UserProfile" component={UserProfileScreen} />
        <Stack.Screen name="SettingsProfile" component={ProfileScreen} />
        <Stack.Screen name="FollowersList" component={FollowersList} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="MyRecipes" component={MyRecipesScreen} />
        <Stack.Screen 
  name="NotificationPreferences" 
  component={NotificationPreferencesScreen} 

/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// App wrapper
export default function App() {
  return (
       <NetworkProvider>
    <ThemeProvider>
      <LanguageProvider>
        <GuestProvider>
          <MainAppContent />
        </GuestProvider>
      </LanguageProvider>
    </ThemeProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  simpleLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  ethiopianPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  patternText: {
    fontSize: 40,
    textAlign: 'center',
    marginTop: 50,
  },
  logoWrapper: {
    marginBottom: 30,
  },
  cookingPot: {
    alignItems: 'center',
  },
  // Updated: Use Image styling instead of potIcon
  logoImage: {
    width: 120,
    height: 120,
  },
  steam: {
    flexDirection: 'row',
    marginTop: -15,
  },
  steamIcon: {
    fontSize: 20,
    opacity: 0.5,
    marginHorizontal: 2,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f37d1cff',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  loadingWrapper: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingMessage: {
    marginTop: 15,
    fontSize: 14,
    color: '#888',
  },
  spicesDecoration: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 30,
  },
  spice: {
    fontSize: 20,
    marginHorizontal: 8,
    opacity: 0.7,
  },
});