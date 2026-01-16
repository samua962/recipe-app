// contexts/NetworkContext.js - NEW FILE
import React, { createContext, useState, useContext, useEffect } from 'react';
import { setupNetworkListener, getCurrentNetworkState } from '../utils/networkStatus';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCachedData, setHasCachedData] = useState(false);

  useEffect(() => {
    // Get initial network state
    const initNetworkState = async () => {
      try {
        const state = await getCurrentNetworkState();
        setIsOnline(state.isOnline);
      } catch (error) {
        console.log('Error getting initial network state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initNetworkState();

    // Set up real-time listener
    const unsubscribe = setupNetworkListener((connected) => {
      setIsOnline(connected);
      
      // Show notification when going offline
      if (!connected) {
        console.log('Network lost - you are now offline');
      } else {
        console.log('Network restored - you are back online');
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const refreshNetworkStatus = async () => {
    setIsLoading(true);
    try {
      const state = await getCurrentNetworkState();
      setIsOnline(state.isOnline);
      return state.isOnline;
    } catch (error) {
      console.log('Error refreshing network:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isOnline,
    isLoading,
    hasCachedData,
    refreshNetworkStatus,
    setIsOnline,
    setHasCachedData
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};