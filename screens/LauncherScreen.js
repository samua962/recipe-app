// screens/LauncherScreen.js - FIXED VERSION
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function LauncherScreen({ navigation }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let unsub = () => {};

    const checkAuthAndOnboarding = async () => {
      try {
        // Check if user has seen onboarding
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        console.log("Launcher: Onboarding status:", hasSeenOnboarding);

        unsub = onAuthStateChanged(auth, (user) => {
          console.log("Launcher: Auth state - User:", user ? user.uid : "None", "Email verified:", user?.emailVerified);
          
          // If user is logged in (verified or not), go directly to MainTabs
          if (user) {
            console.log("Launcher: User found, going to MainTabs");
            // Short splash then navigate to MainTabs (which contains Home)
            setTimeout(() => {
              navigation.replace('MainTabs');
            }, 1500);
            return;
          }

          // If no user is logged in
          if (hasSeenOnboarding === 'true') {
            console.log("Launcher: Has seen onboarding, going to Login");
            // User has seen onboarding before, go to login
            setTimeout(() => {
              // navigation.replace('MainTabs');
               navigation.replace('Login');
            }, 1500);
          } else {
            // First time user, go to onboarding
            console.log("Launcher: First time, going to Intro");
            setTimeout(() => {
              navigation.replace('Intro');
            }, 1500);
          }
        });
      } catch (e) {
        console.warn('Launcher error', e);
        // Fallback: go to login if there's an error
        setTimeout(() => {
          navigation.replace('Login');
        }, 1500);
      } finally {
        setChecking(false);
      }
    };

    checkAuthAndOnboarding();

    return () => {
      if (unsub) unsub();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ethiopian Recipe App</Text>
      <Text style={styles.subtitle}>Authentic Ethiopian Cuisine</Text>
      <ActivityIndicator size="large" color="#f37d1cff" style={{ marginTop: 20 }} />
      {checking && <Text style={styles.loadingText}>Loading...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
});