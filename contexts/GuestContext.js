// contexts/GuestContext.js - CREATE NEW FILE
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GuestContext = createContext();

export const useGuest = () => useContext(GuestContext);

export function GuestProvider({ children }) {
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuestStatus();
  }, []);

  const loadGuestStatus = async () => {
    try {
      const guestStatus = await AsyncStorage.getItem('isGuest');
      setIsGuest(guestStatus === 'true');
    } catch (error) {
      console.log('Error loading guest status:', error);
    } finally {
      setLoading(false);
    }
  };

  const setGuest = async (guestStatus) => {
    try {
      if (guestStatus) {
        await AsyncStorage.setItem('isGuest', 'true');
      } else {
        await AsyncStorage.removeItem('isGuest');
      }
      setIsGuest(guestStatus);
    } catch (error) {
      console.log('Error setting guest status:', error);
    }
  };

  const clearGuest = async () => {
    try {
      await AsyncStorage.removeItem('isGuest');
      setIsGuest(false);
    } catch (error) {
      console.log('Error clearing guest status:', error);
    }
  };

  return (
    <GuestContext.Provider value={{ isGuest, setGuest, clearGuest, loading }}>
      {children}
    </GuestContext.Provider>
  );
}