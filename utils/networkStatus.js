// utils/networkStatus.js - UPDATED WITH REAL-TIME MONITORING
import * as Network from "expo-network";
import NetInfo from '@react-native-community/netinfo';

// Single check function (existing)
export const isOnline = async () => {
  try {
    const status = await Network.getNetworkStateAsync();
    return status.isConnected && status.isInternetReachable;
  } catch (error) {
    console.log("Network check failed:", error);
    return false;
  }
};

// Real-time monitoring with React Native NetInfo
export const setupNetworkListener = (callback) => {
  return NetInfo.addEventListener(state => {
    const isConnected = state.isConnected && state.isInternetReachable;
    callback(isConnected);
  });
};

// Get current network state
export const getCurrentNetworkState = async () => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      isOnline: state.isConnected && state.isInternetReachable
    };
  } catch (error) {
    console.log("Network state fetch failed:", error);
    return { isConnected: false, isInternetReachable: false, type: 'unknown', isOnline: false };
  }
};

// Check if we have cached data available
export const checkCachedData = async (cacheKey) => {
  try {
    // You can implement AsyncStorage or other caching mechanism here
    // For now, return false
    return false;
  } catch (error) {
    console.log("Cache check failed:", error);
    return false;
  }
};