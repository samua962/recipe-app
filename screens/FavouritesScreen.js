import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
//import { getFavourites, removeFavourite } from "../database/favouritesDB";
import { Ionicons } from "@expo/vector-icons";
import { isOnline } from "../utils/networkStatus";
import { getFavourites, removeFavourite, initDatabase } from "../database/favouritesDB";


export default function FavouritesScreen({ navigation }) {
  const [favourites, setFavourites] = useState([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadFavourites = async () => {
    const connected = await isOnline();
    setOnline(connected);

    getFavourites((data) => {
      setFavourites(data);
      setLoading(false);
    });
  };
  

useEffect(() => {
  const load = async () => {
    await initDatabase();
    const data = await getFavourites();
    setFavourites(data);
    setLoading(false);
  };
  const unsubscribe = navigation.addListener("focus", load);
  return unsubscribe;
}, [navigation]);




  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", loadFavourites);
    return unsubscribe;
  }, [navigation]);

  const handleRemove = (id) => {
    removeFavourite(id);
    loadFavourites();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#5B86E5" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!online && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-outline" size={18} color="#fff" />
          <Text style={styles.offlineText}> Offline Mode: Showing saved recipes</Text>
        </View>
      )}

      <Text style={styles.title}>My Favourites</Text>

      {favourites.length === 0 ? (
        <Text style={styles.emptyText}>No saved recipes yet.</Text>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate("RecipeDetail", { recipe: item })}
            >
              <Image source={{ uri: item.imageURL }} style={styles.image} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.category}>{item.category}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(item.id)}>
                <Ionicons name="trash-outline" size={22} color="#E91E63" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 15 },
  title: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 10 },
  emptyText: { color: "#777", textAlign: "center", marginTop: 50 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  image: { width: 70, height: 70, borderRadius: 10, marginRight: 10 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  category: { fontSize: 14, color: "#777" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  offlineBanner: {
    marginTop: 10,
    backgroundColor: "#E91E63",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  offlineText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});
