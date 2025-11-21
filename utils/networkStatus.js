import * as Network from "expo-network";

export const isOnline = async () => {
  try {
    const status = await Network.getNetworkStateAsync();
    return status.isConnected && status.isInternetReachable;
  } catch (error) {
    console.log("Network check failed:", error);
    return false;
  }
};
