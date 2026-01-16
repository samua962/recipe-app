// components/OfflineBanner.js - NEW FILE
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../contexts/NetworkContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

const OfflineBanner = ({ onRetry, onGoToFavourites, showFavouritesButton = true }) => {
  const { isOnline, isLoading } = useNetwork();
  const { t } = useLanguage();
  const { colors } = useTheme();

  if (isOnline || isLoading) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: '#e74c3c' }
      ]}
      entering={Animated.spring}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <Ionicons name="cloud-offline-outline" size={20} color="#fff" />
          <Text style={styles.message}>
            {t('offline.message')}
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          {onRetry && (
            <TouchableOpacity 
              style={[styles.button, styles.retryButton]}
              onPress={onRetry}
            >
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={styles.buttonText}>{t('offline.retry')}</Text>
            </TouchableOpacity>
          )}
          
          {showFavouritesButton && onGoToFavourites && (
            <TouchableOpacity 
              style={[styles.button, styles.favouritesButton]}
              onPress={onGoToFavourites}
            >
              <Ionicons name="heart" size={16} color="#fff" />
              <Text style={styles.buttonText}>{t('offline.goToFavourites')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  favouritesButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default OfflineBanner;