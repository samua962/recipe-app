// navigation/RoleBasedTabs.js - FIXED MULTI-LANGUAGE VERSION
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import multi-language hook
import { useLanguage } from '../contexts/LanguageContext';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import FavouritesScreen from '../screens/FavouritesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ModeratorDashboard from '../screens/ModeratorDashboard';
import AdminDashboard from '../screens/AdminDashboard';

const Tab = createBottomTabNavigator();

// Custom tab bar style with safe area support
const getTabBarStyle = (insets) => ({
  height: 60 + insets.bottom,
  borderTopWidth: 0,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: -2,
  },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  backgroundColor: "#fff",
  paddingBottom: 10 + insets.bottom,
  paddingTop: 10,
  marginBottom: 0,
});

// Create a wrapper component that uses the language in the key
const createTabNavigator = (Component, tabName) => {
  return function TabNavigatorWrapper(props) {
    const { locale } = useLanguage();
    return <Component key={locale} {...props} />;
  };
};

export function UserTabs() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();

  return (
    <Tab.Navigator
      key={locale} // Force re-render when language changes
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: getTabBarStyle(insets),
        tabBarActiveTintColor: "#f37d1c",
        tabBarInactiveTintColor: "#aaa",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Explore") {
            iconName = focused ? "compass" : "compass-outline";
          } else if (route.name === "Saved") {
            iconName = focused ? "heart" : "heart-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{
          tabBarLabel: t('tabs.explore'),
        }}
      />
      <Tab.Screen 
        name="Saved" 
        component={FavouritesScreen}
        options={{
          tabBarLabel: t('tabs.saved'),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
  );
}

export function ModeratorTabs() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();

  return (
    <Tab.Navigator
      key={locale} // Force re-render when language changes
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: getTabBarStyle(insets),
        tabBarActiveTintColor: "#f37d1c",
        tabBarInactiveTintColor: "#aaa",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Moderate") {
            iconName = focused ? "shield-checkmark" : "shield-checkmark-outline";
          } else if (route.name === "Saved") {
            iconName = focused ? "heart" : "heart-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tab.Screen 
        name="Moderate" 
        component={ModeratorDashboard}
        options={{
          tabBarLabel: t('tabs.moderate'),
        }}
      />
      <Tab.Screen 
        name="Saved" 
        component={FavouritesScreen}
        options={{
          tabBarLabel: t('tabs.saved'),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
  );
}

export function AdminTabs() {
  const insets = useSafeAreaInsets();
  const { t, locale } = useLanguage();

  return (
    <Tab.Navigator
      key={locale} // Force re-render when language changes
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: getTabBarStyle(insets),
        tabBarActiveTintColor: "#f37d1c",
        tabBarInactiveTintColor: "#aaa",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Admin") {
            iconName = focused ? "settings" : "settings-outline";
          } else if (route.name === "Moderate") {
            iconName = focused ? "shield-checkmark" : "shield-checkmark-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }
          
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.home'),
        }}
      />
      <Tab.Screen 
        name="Admin" 
        component={AdminDashboard}
        options={{
          tabBarLabel: t('tabs.admin'),
        }}
      />
      <Tab.Screen 
        name="Moderate" 
        component={ModeratorDashboard}
        options={{
          tabBarLabel: t('tabs.moderate'),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
        }}
      />
    </Tab.Navigator>
  );
}

// Default export for easier imports
export default {
  UserTabs,
  ModeratorTabs,
  AdminTabs,
};