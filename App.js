// App.js - SIMPLIFIED VERSION
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from "./firebaseConfig";

// Import Language Provider
import { LanguageProvider } from "./contexts/LanguageContext";

// Import all screens
import IntroScreen from "./screens/IntroScreen";           
import AppSplashScreen from "./screens/AppSplashScreen";   
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import HomeScreen from "./screens/HomeScreen";
import RecipeDetailScreen from "./screens/RecipeDetailScreen";
import AddRecipeScreen from "./screens/AddRecipeScreen";
import LauncherScreen from "./screens/LauncherScreen";
import NotificationsScreen from "./screens/NotificationsScreen";

// Import role-based tab navigators
import { UserTabs, ModeratorTabs, AdminTabs } from "./navigation/RoleBasedTabs";

// Navigation setup
const Stack = createNativeStackNavigator();

// Main App Component
function MainAppContent() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);

  // Check if user has seen onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const seen = await AsyncStorage.getItem('hasSeenOnboarding');
        setHasSeenOnboarding(seen === 'true');
      } catch (err) {
        console.log("Error checking onboarding status:", err);
        setHasSeenOnboarding(false);
      }
    };
    checkOnboardingStatus();
  }, []);

  // Firebase auth listener with role detection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Get user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role || 'user';
            setUserRole(role);
          } else {
            setUserRole('user');
          }
        } catch (error) {
          console.log("Error fetching user role:", error);
          setUserRole('user');
        }
      } else {
        setUserRole('user');
      }
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Get the appropriate tab navigator based on user role
  const getTabNavigator = () => {
    switch (userRole) {
      case 'admin':
        return AdminTabs;
      case 'moderator':
        return ModeratorTabs;
      default:
        return UserTabs;
    }
  };

  // Show launcher while loading
  if (loading || hasSeenOnboarding === null) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Launcher" component={LauncherScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  const TabNavigator = getTabNavigator();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Launcher" component={LauncherScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="AppSplash" component={AppSplashScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="RecipeDetail" component={RecipeDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="AddRecipe" component={AddRecipeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Wrap the main app with Language Provider
export default function App() {
  return (
    <LanguageProvider>
      <MainAppContent />
    </LanguageProvider>
  );
}