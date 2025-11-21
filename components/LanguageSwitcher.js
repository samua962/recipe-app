// components/LanguageSwitcher.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher = ({ style }) => {
  const { locale, changeLanguage } = useLanguage();

  const handleLanguageToggle = () => {
    // Explicitly set the new locale to avoid any undefined issues
    const newLocale = locale === 'en' ? 'am' : 'en';
    console.log('Switching language from', locale, 'to', newLocale);
    changeLanguage(newLocale);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handleLanguageToggle}
      activeOpacity={0.7}
    >
      <Text style={styles.languageText}>
        {locale === 'en' ? 'EN' : 'AM'}
      </Text>
      <Ionicons name="language" size={20} color="#f37d1c" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 6,
  },
});

export default LanguageSwitcher;