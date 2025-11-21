// contexts/LanguageContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from '../locales/en.json';
import am from '../locales/am.json';

// Initialize i18n
const i18n = new I18n({ en, am });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      // Get stored language or device language
      const storedLanguage = await AsyncStorage.getItem('user-language');
      
      let selectedLanguage = 'en';
      
      if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'am')) {
        selectedLanguage = storedLanguage;
      } else {
        // Get device language
        const deviceLang = Localization.locale || 'en';
        const primaryLang = deviceLang.split('-')[0];
        selectedLanguage = primaryLang === 'am' ? 'am' : 'en';
        
        // Save the detected language
        await AsyncStorage.setItem('user-language', selectedLanguage);
      }
      
      // Set the locale
      setLocale(selectedLanguage);
      i18n.locale = selectedLanguage;
      
    } catch (error) {
      console.error('Error initializing language:', error);
      // Fallback to English
      setLocale('en');
      i18n.locale = 'en';
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = (newLocale) => {
    // Validate and ensure newLocale is always a string
    if (typeof newLocale !== 'string') {
      console.error('Invalid language type:', typeof newLocale, newLocale);
      return;
    }
    
    if (newLocale !== 'en' && newLocale !== 'am') {
      console.error('Invalid language value:', newLocale);
      return;
    }
    
    try {
      setLocale(newLocale);
      i18n.locale = newLocale;
      AsyncStorage.setItem('user-language', newLocale);
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const t = (key, options = {}) => {
    return i18n.t(key, options) || key;
  };

  const value = {
    locale,
    changeLanguage,
    t,
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;