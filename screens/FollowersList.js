import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

export default function FollowersList() {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useLanguage();
  const { colors } = useTheme();
  
  const { userId, type } = route.params;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const loadUsers = useCallback(async () => {
    try {
      const followersRef = collection(db, "followers");
      let q;
      
      if (type === 'followers') {
        q = query(followersRef, where("followingId", "==", userId));
      } else {
        q = query(followersRef, where("followerId", "==", userId));
      }
      
      const snapshot = await getDocs(q);
      const userList = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const userField = type === 'followers' ? 'followerId' : 'followingId';
        const userIdToFetch = data[userField];
        
        const userDoc = await getDoc(doc(db, "users", userIdToFetch));
        if (userDoc.exists()) {
          userList.push({
            id: userIdToFetch,
            ...userDoc.data(),
            followId: docSnap.id,
            followDate: data.createdAt
          });
        } else {
          userList.push({
            id: userIdToFetch,
            name: data[`${userField.replace('Id', 'Name')}`] || 'Unknown User',
            email: '',
            profilePhoto: data[`${userField.replace('Id', 'Photo')}`] || null,
            followId: docSnap.id,
            followDate: data.createdAt
          });
        }
      }
      
      setUsers(userList);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, type]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleUserPress = (user) => {
    navigation.navigate('UserProfile', { userId: user.id });
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const formatFollowDate = (date) => {
    if (!date) return "";
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now - d);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return t('profile.today');
      if (diffDays === 1) return t('profile.yesterday');
      if (diffDays < 7) return `${diffDays} ${t('profile.daysAgo')}`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${t('profile.weeksAgo')}`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} ${t('profile.monthsAgo')}`;
      
      return `${Math.floor(diffDays / 365)} ${t('profile.yearsAgo')}`;
    } catch (error) {
      return "";
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userItem, { backgroundColor: colors.card }]}
      onPress={() => handleUserPress(item)}
    >
      {item.profilePhoto ? (
        <Image 
          source={{ uri: item.profilePhoto }} 
          style={[styles.userAvatar, { borderColor: colors.primary }]}
        />
      ) : (
        <View style={[styles.userAvatar, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
          <Text style={styles.userAvatarInitial}>
            {getInitials(item.name)}
          </Text>
        </View>
      )}
      
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.email && (
          <Text style={[styles.userEmail, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.email}
          </Text>
        )}
        {item.followDate && (
          <Text style={[styles.followDate, { color: colors.textSecondary }]}>
            {type === 'followers' ? t('profile.followedYou') : t('profile.followed')} {formatFollowDate(item.followDate)}
          </Text>
        )}
      </View>
      
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {type === 'followers' ? t('profile.followers') : t('profile.following')}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* User List with Refresh Control */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('profile.loading')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.followId || item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={type === 'followers' ? "people-outline" : "person-outline"} 
                size={60} 
                color={colors.border} 
              />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                {type === 'followers' 
                  ? t('profile.noFollowers') 
                  : t('profile.noFollowing')}
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                {type === 'followers'
                  ? t('profile.noFollowersHint')
                  : t('profile.noFollowingHint')}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginRight: 12,
  },
  userAvatarInitial: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    marginBottom: 2,
  },
  followDate: {
    fontSize: 11,
    fontStyle: "italic",
  },
});