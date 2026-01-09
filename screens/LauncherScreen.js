// screens/LauncherScreen.js - SIMPLE VERSION
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function LauncherScreen({ navigation }) {
  useEffect(() => {
    // This is just a splash screen
    // The initial route is already set in App.js
    // After 1.5 seconds, navigate away if still here
    
    const timer = setTimeout(() => {
      // Check current route and navigate if needed
      navigation.navigate('MainTabs');
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ethiopian Recipe App</Text>
      <Text style={styles.subtitle}>Authentic Ethiopian Cuisine</Text>
      <ActivityIndicator size="large" color="#f37d1cff" style={{ marginTop: 20 }} />
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
});