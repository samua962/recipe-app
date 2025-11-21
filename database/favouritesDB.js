// favouritesDB.js
import { openDatabaseAsync } from "expo-sqlite";

let db = null;

export const initDatabase = async () => {
  if (db) return; // ✅ Already initialized

  try {
    db = await openDatabaseAsync("favourites.db");
    console.log("✅ Database opened successfully");

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS favourites (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT,
        category TEXT,
        ingredients TEXT,
        steps TEXT,
        imageURL TEXT,
        videoURL TEXT
      );
    `);
    
    console.log("✅ Table ensured");
  } catch (error) {
    console.error("❌ Database init error:", error);
    throw error;
  }
};

export const addFavourite = async (recipe) => {
  if (!db) {
    console.warn("⚠️ Database not initialized. Initializing now...");
    await initDatabase();
  }

  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO favourites 
       (id, title, category, ingredients, steps, imageURL, videoURL)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        recipe.id,
        recipe.title,
        recipe.category || "",
        recipe.ingredients || "",
        recipe.steps || "",
        recipe.imageURL || "",
        recipe.videoURL || "",
      ]
    );
    console.log("✅ Favourite added:", recipe.id);
    return { success: true };
  } catch (error) {
    console.error("❌ Error adding favourite:", error);
    throw error;
  }
};

export const removeFavourite = async (id) => {
  if (!db) {
    await initDatabase();
  }

  try {
    await db.runAsync("DELETE FROM favourites WHERE id = ?;", [id]);
    console.log("✅ Favourite removed:", id);
    return { success: true };
  } catch (error) {
    console.error("❌ Error removing favourite:", error);
    throw error;
  }
};

export const isFavourite = async (id) => {
  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db.getFirstAsync(
      "SELECT * FROM favourites WHERE id = ?;",
      [id]
    );
    return result !== null;
  } catch (error) {
    console.error("❌ Error checking favourite:", error);
    throw error;
  }
};

export const getFavourites = async () => {
  if (!db) {
    await initDatabase();
  }

  try {
    const result = await db.getAllAsync("SELECT * FROM favourites;");
    return result || [];
  } catch (error) {
    console.error("❌ Error getting favourites:", error);
    throw error;
  }
};

export const clearAllFavourites = async () => {
  if (!db) {
    await initDatabase();
  }

  try {
    await db.runAsync("DELETE FROM favourites;");
    console.log("✅ All favourites cleared");
    return { success: true };
  } catch (error) {
    console.error("❌ Error clearing favourites:", error);
    throw error;
  }
};