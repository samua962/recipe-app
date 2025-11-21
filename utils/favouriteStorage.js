// utils/favouriteStorage.js
import AsyncStorage from "@react-native-async-storage/async-storage";

export const addFavourite = async (recipe) => {
  const favs = JSON.parse(await AsyncStorage.getItem("favourites")) || [];
  favs.push(recipe);
  await AsyncStorage.setItem("favourites", JSON.stringify(favs));
};

export const getFavourites = async () => {
  return JSON.parse(await AsyncStorage.getItem("favourites")) || [];
};

export const removeFavourite = async (id) => {
  const favs = JSON.parse(await AsyncStorage.getItem("favourites")) || [];
  const filtered = favs.filter((item) => item.id !== id);
  await AsyncStorage.setItem("favourites", JSON.stringify(filtered));
};
