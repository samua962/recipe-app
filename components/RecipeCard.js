import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

export default function RecipeCard({ recipe, onToggleFavorite, isFavorite }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: recipe.image }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={styles.meta}>{recipe.time} min  {recipe.category}</Text>
        <View style={styles.tagsRow}>
          {recipe.tags?.slice(0, 3).map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={() => onToggleFavorite(recipe.id)} style={styles.fav}>
        <Text style={{ fontSize: 20 }}>{isFavorite ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  image: { width: 90, height: 90, borderRadius: 10, marginRight: 12 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#222' },
  meta: { color: '#666', marginTop: 4, fontSize: 13 },
  tagsRow: { flexDirection: 'row', marginTop: 8 },
  tag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
  },
  tagText: { fontSize: 12, color: '#444' },
  fav: { padding: 6, marginLeft: 8 },
});
