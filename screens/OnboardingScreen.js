//OnboardingScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const PAGES = [
  { key: 'learn', title: 'Learn', subtitle: 'Discover recipes from Ethiopia and beyond.' },
  { key: 'cook', title: 'Cook', subtitle: 'Follow step-by-step recipes with ease.' },
  { key: 'serve', title: 'Serve', subtitle: 'Share your delicious dishes with friends.' },
];

export default function OnboardingScreen({ navigation }) {
  const [index, setIndex] = useState(0);

  const goNext = async () => {
    if (index < PAGES.length - 1) {
      setIndex(index + 1);
      return;
    }

    // finished
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('Login');
  };

  const onSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    navigation.replace('Login');
  };

  const page = PAGES[index];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.subtitle}>{page.subtitle}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity onPress={onSkip} style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.dots}>
          {PAGES.map((p, i) => (
            <View key={p.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity onPress={goNext} style={styles.next}>
          <Text style={styles.nextText}>{index === PAGES.length - 1 ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'space-between', padding: 24 },
  card: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 36, fontWeight: '800', color: '#FF7A59' },
  subtitle: { marginTop: 12, fontSize: 16, color: '#444', textAlign: 'center', paddingHorizontal: 20 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { padding: 12 },
  skipText: { color: '#888' },
  next: { backgroundColor: '#FF7A59', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10 },
  nextText: { color: '#fff', fontWeight: '700' },
  dots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#eee', marginHorizontal: 6 },
  dotActive: { backgroundColor: '#FF7A59' },
});
