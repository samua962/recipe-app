// services/notificationService.js - FULLY UPDATED WITH PUSH NOTIFICATIONS DISABLED
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, LogBox } from 'react-native';
import Constants from 'expo-constants';
import { doc, setDoc, collection, addDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

// Suppress Expo Go warning
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
]);

// Check if we're in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ==================== USER PREFERENCES CLASS ====================
export class UserPreferences {
  static defaultPreferences = {
    newRecipesFromFollowed: true,
    recipeApproved: true,
    recipeRejected: true,
    newComments: true,
    newRatings: true,
    moderationAlerts: true,
    allNotifications: true, // master switch
  };

  // Save user preferences
  static async saveUserPreferences(userId, preferences) {
    try {
      await setDoc(doc(db, 'userPreferences', userId), {
        ...this.defaultPreferences,
        ...preferences,
        updatedAt: new Date(),
      }, { merge: true });
      console.log('✅ User preferences saved for:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error saving user preferences:', error);
      // Just log the error but don't break the app
      return false;
    }
  }

  // Get user preferences
  static async getUserPreferences(userId) {
    try {
      const docRef = doc(db, 'userPreferences', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { ...this.defaultPreferences, ...docSnap.data() };
      } else {
        // Return defaults without trying to create (permissions issue)
        console.log('ℹ️ No preferences found for user:', userId, '- Returning defaults');
        return this.defaultPreferences;
      }
    } catch (error) {
      console.error('❌ Error getting user preferences:', error);
      // Return defaults on error (including permission errors)
      return this.defaultPreferences;
    }
  }

  // Check if user wants specific notification type
  static async shouldSendNotification(userId, notificationType) {
    try {
      const preferences = await this.getUserPreferences(userId);
      
      // Master switch check
      if (!preferences.allNotifications) {
        console.log(`🔕 Master switch OFF for user: ${userId}`);
        return false;
      }
      
      switch (notificationType) {
        case 'new_recipe_followed':
          return preferences.newRecipesFromFollowed;
        case 'recipe_review_approved':
          return preferences.recipeApproved;
        case 'recipe_review_rejected':
          return preferences.recipeRejected;
        case 'new_comment':
          return preferences.newComments;
        case 'new_rating':
          return preferences.newRatings;
        case 'new_recipe_moderation':
          return preferences.moderationAlerts;
        default:
          console.log(`ℹ️ Unknown notification type: ${notificationType}, defaulting to true`);
          return true;
      }
    } catch (error) {
      console.error('❌ Error checking notification preference:', error);
      return true; // Default to sending if error
    }
  }

  // Get preference label
  static getPreferenceLabel(key) {
    const labels = {
      newRecipesFromFollowed: 'New Recipes from Followed Users',
      recipeApproved: 'Recipe Approved Notifications',
      recipeRejected: 'Recipe Rejected Notifications',
      newComments: 'New Comment Notifications',
      newRatings: 'New Rating Notifications',
      moderationAlerts: 'Moderation Alerts',
      allNotifications: 'All Notifications'
    };
    return labels[key] || key;
  }
}

// ==================== NOTIFICATION SERVICE CLASS ====================
export class NotificationService {
  // ==================== MODIFIED: COMPLETELY DISABLE PUSH NOTIFICATIONS ====================
  static async registerForPushNotificationsAsync() {
    // COMPLETELY DISABLE push notifications
    console.log('🔕 Push notifications are disabled on the phone');
    return null;
  }

  static async saveTokenToFirestore(userId, token) {
    try {
      await setDoc(doc(db, 'users', userId), {
        expoPushToken: token,
      }, { merge: true });
      console.log('Push token saved to Firestore (not used since push is disabled)');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  // ==================== MODIFIED: DISABLE PUSH, USE LOCAL ONLY ====================
  static async sendPushNotification(expoPushToken, title, body, data = {}) {
    // COMPLETELY DISABLE push notifications
    console.log(`🔕 Push notifications disabled: ${title}: ${body}`);
    // Only show local notifications
    await this.showLocalNotification(title, body, data);
    return;
  }

  static async storeNotificationInFirestore(notificationData) {
    try {
      // Check if we have the required permission (user ID exists)
      if (!notificationData.userId) {
        console.log('⚠️ No userId provided for notification');
        return;
      }
      
      const finalData = {
        ...notificationData,
        createdBy: auth.currentUser?.uid || 'system',
        read: false,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'notifications'), finalData);
      console.log('💾 Notification stored in Firestore for user:', notificationData.userId);
    } catch (error) {
      console.error('❌ Error storing notification in Firestore:', error);
      // Don't throw - this shouldn't break the main functionality
    }
  }

  // Show local notification (works without push)
  static async showLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
      console.log('🔔 Local notification shown:', title);
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  // Send notification to recipe author when recipe is approved/rejected
  static async notifyRecipeAuthor(userId, recipeTitle, action) {
    try {
      const title = action === 'approved' ? 'Recipe Approved! 🎉' : 'Recipe Needs Modification';
      const body = action === 'approved' 
        ? `Your recipe "${recipeTitle}" has been approved and is now live!`
        : `Your recipe "${recipeTitle}" needs some modifications. Please review and resubmit.`;

      console.log(`📨 Notifying AUTHOR ${userId}: ${title}`);

      // Store in Firestore for the AUTHOR (Firebase functionality remains)
      await this.storeNotificationInFirestore({
        userId: userId, // This is the author's ID
        title: title,
        body: body,
        type: 'recipe_review',
        action: action,
        recipeTitle: recipeTitle,
      });

      // Show local notification only (no push)
      await this.showLocalNotification(title, body);
      
      console.log(`✅ Local notification shown to author: ${userId}`);
      
    } catch (error) {
      console.error('Error notifying recipe author:', error);
    }
  }

  // Send notification to moderators when new recipe is submitted
  static async notifyModeratorsNewRecipe(recipeTitle, authorName) {
    try {
      const title = 'New Recipe to Review 🍳';
      const body = `"${recipeTitle}" by ${authorName} needs review`;

      console.log(`📨 Notifying moderators about: ${recipeTitle}`);

      // Show local notification for current user (who submitted the recipe)
      await this.showLocalNotification("Recipe Submitted!", "Your recipe is under review");

      // Store notification for current user (the author)
      if (auth.currentUser) {
        await this.storeNotificationInFirestore({
          userId: auth.currentUser.uid,
          title: "Recipe Submitted!",
          body: `"${recipeTitle}" is waiting for moderator approval`,
          type: 'recipe_submitted',
          recipeTitle: recipeTitle,
        });
      }

      // Store notifications for moderators in Firebase (without push)
      try {
        const q = query(
          collection(db, 'users'),
          where('role', 'in', ['moderator', 'admin'])
        );
        const snapshot = await getDocs(q);
        
        console.log(`👥 Found ${snapshot.size} moderators/admins to notify`);
        
        snapshot.forEach(doc => {
          const user = doc.data();
          const moderatorId = doc.id;
          
          console.log(`📧 Notifying moderator in Firestore: ${user.email}`);
          
          // Store in Firestore only (no push notification)
          this.storeNotificationInFirestore({
            userId: moderatorId, // Moderator's user ID
            title: title,
            body: body,
            type: 'new_recipe',
            recipeTitle: recipeTitle,
            authorName: authorName,
          });
        });
      } catch (moderatorError) {
        console.log('⚠️ Could not notify all moderators in Firestore:', moderatorError.message);
        // This is OK - the recipe submission still works!
      }
      
    } catch (error) {
      console.error('Error in notifyModeratorsNewRecipe:', error);
      // Don't throw - recipe submission should still succeed
    }
  }

  // Simple notification that doesn't require special permissions
  static async notifyCurrentUser(title, body, data = {}) {
    try {
      // Store notification for current user
      if (auth.currentUser) {
        await this.storeNotificationInFirestore({
          userId: auth.currentUser.uid,
          title: title,
          body: body,
          type: 'user_notification',
          ...data,
        });
      }

      // Show local notification
      await this.showLocalNotification(title, body, data);
    } catch (error) {
      console.error('Error notifying current user:', error);
    }
  }

  // Notify user about comment on their recipe
  static async notifyRecipeOwnerAboutComment(recipeOwnerId, recipeTitle, commenterName) {
    try {
      const title = 'New Comment on Your Recipe 💬';
      const body = `${commenterName} commented on your recipe "${recipeTitle}"`;

      console.log(`📨 Notifying recipe owner ${recipeOwnerId} about comment`);

      await this.storeNotificationInFirestore({
        userId: recipeOwnerId,
        title: title,
        body: body,
        type: 'new_comment',
        recipeTitle: recipeTitle,
        commenterName: commenterName,
      });

      await this.showLocalNotification(title, body);
      
    } catch (error) {
      console.error('Error notifying recipe owner about comment:', error);
    }
  }

  // Notify user when someone rates their recipe
  static async notifyRecipeOwnerAboutRating(recipeOwnerId, recipeTitle, raterName, rating) {
    try {
      const title = 'New Rating on Your Recipe ⭐';
      const body = `${raterName} rated your recipe "${recipeTitle}" ${rating} stars`;

      console.log(`📨 Notifying recipe owner ${recipeOwnerId} about rating`);

      await this.storeNotificationInFirestore({
        userId: recipeOwnerId,
        title: title,
        body: body,
        type: 'new_rating',
        recipeTitle: recipeTitle,
        raterName: raterName,
        rating: rating,
      });

      await this.showLocalNotification(title, body);
      
    } catch (error) {
      console.error('Error notifying recipe owner about rating:', error);
    }
  }

  // ==================== MODIFIED: NOTIFY FOLLOWERS - LOCAL ONLY ====================
  static async notifyFollowersNewRecipe(recipeAuthorId, recipeTitle, recipeId) {
    try {
      console.log(`📨 Starting to notify followers of: ${recipeAuthorId}`);
      
      // 1. Get all followers of this author
      const followersQuery = query(
        collection(db, 'followers'),
        where('followingId', '==', recipeAuthorId)
      );
      
      const followersSnapshot = await getDocs(followersQuery);
      const followersCount = followersSnapshot.size;
      console.log(`👥 Found ${followersCount} followers`);
      
      if (followersCount === 0) {
        console.log('ℹ️ No followers to notify');
        return;
      }
      
      // 2. Get recipe author info
      let authorName = 'A user';
      try {
        const authorDoc = await getDoc(doc(db, 'users', recipeAuthorId));
        if (authorDoc.exists()) {
          const authorData = authorDoc.data();
          authorName = authorData.name || authorData.email?.split('@')[0] || 'A user';
        }
      } catch (error) {
        console.log('⚠️ Could not fetch author name:', error.message);
      }
      
      const title = 'New Recipe from Followed User 🍳';
      const body = `${authorName} just posted: "${recipeTitle}"`;
      
      // 3. Process each follower - LOCAL NOTIFICATIONS ONLY
      for (const followDoc of followersSnapshot.docs) {
        const followData = followDoc.data();
        const followerId = followData.followerId;
        
        // Skip invalid follower IDs
        if (!followerId || followerId === recipeAuthorId) {
          continue;
        }
        
        try {
          // Check preference
          const shouldNotify = await UserPreferences.shouldSendNotification(
            followerId, 
            'new_recipe_followed'
          );
          
          if (!shouldNotify) {
            console.log(`🔕 Skipping ${followerId} (preference disabled)`);
            continue;
          }
          
          // Store notification in Firestore (Firebase functionality remains)
          await this.storeNotificationInFirestore({
            userId: followerId,
            title: title,
            body: body,
            type: 'new_recipe_followed',
            recipeId: recipeId,
            authorId: recipeAuthorId,
            authorName: authorName,
            recipeTitle: recipeTitle,
          });
          
          // Show local notification only (no push)
          await this.showLocalNotification(title, body, {
            type: 'new_recipe_followed',
            recipeId: recipeId,
          });
          
          console.log(`✅ Local notification sent to follower: ${followerId}`);
          
        } catch (followerError) {
          console.error(`❌ Error processing follower ${followerId}:`, followerError.message);
          // Continue with other followers
        }
      }
      
      console.log('✅ Follower notifications completed');
      
    } catch (error) {
      console.error('❌ Error in notifyFollowersNewRecipe:', error);
      // Don't throw - recipe submission should still succeed
    }
  }
}