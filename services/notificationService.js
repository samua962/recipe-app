// services/notificationService.js - FULLY UPDATED
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

export class NotificationService {
  static async registerForPushNotificationsAsync() {
    // Skip push notifications entirely in Expo Go
    if (isExpoGo) {
      console.log('🔕 Expo Go: Using local notifications only');
      return null;
    }
    
    let token;
    
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('📱 Push token obtained:', token);
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return token;
  }

  static async saveTokenToFirestore(userId, token) {
    try {
      await setDoc(doc(db, 'users', userId), {
        expoPushToken: token,
      }, { merge: true });
      console.log('Push token saved to Firestore');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  static async sendPushNotification(expoPushToken, title, body, data = {}) {
    // Skip actual push in Expo Go
    if (isExpoGo) {
      console.log(`🔕 Expo Go: Local notification - ${title}: ${body}`);
      // Fall back to local notification
      await this.showLocalNotification(title, body, data);
      return;
    }

    if (!expoPushToken) {
      console.log('No push token available, using local notification');
      await this.showLocalNotification(title, body, data);
      return;
    }

    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    };

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      console.log('✅ Push notification sent successfully');
    } catch (error) {
      console.error('Error sending push notification, falling back to local:', error);
      await this.showLocalNotification(title, body, data);
    }
  }

  static async storeNotificationInFirestore(notificationData) {
    try {
      const finalData = {
        ...notificationData,
        createdBy: auth.currentUser?.uid || 'system',
        read: false,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'notifications'), finalData);
      console.log('💾 Notification stored in Firestore for user:', notificationData.userId);
    } catch (error) {
      console.error('Error storing notification in Firestore:', error);
      // Don't throw - this shouldn't break the main functionality
    }
  }

  // Show local notification (works in Expo Go)
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

      // Store in Firestore for the AUTHOR
      await this.storeNotificationInFirestore({
        userId: userId, // This is the author's ID
        title: title,
        body: body,
        type: 'recipe_review',
        action: action,
        recipeTitle: recipeTitle,
      });

      // Show local notification to AUTHOR
      await this.showLocalNotification(title, body);

      // Try push notification to AUTHOR (development builds only)
      if (!isExpoGo) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const pushToken = userData.expoPushToken;

            if (pushToken) {
              await this.sendPushNotification(pushToken, title, body, {
                type: 'recipe_review',
                recipeId: userId,
                action: action,
              });
            } else {
              console.log('No push token found for author, using local notification only');
            }
          } else {
            console.log('Author user document not found');
          }
        } catch (userError) {
          console.log('Could not fetch author data for push notification:', userError.message);
        }
      }
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

      // Try to notify moderators (this might fail in Expo Go due to permissions)
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
          
          console.log(`📧 Notifying moderator: ${user.email}`);
          
          // Store in Firestore for each moderator/admin
          this.storeNotificationInFirestore({
            userId: moderatorId, // Moderator's user ID
            title: title,
            body: body,
            type: 'new_recipe',
            recipeTitle: recipeTitle,
            authorName: authorName,
          });

          // Send push notification if available
          if (!isExpoGo && user.expoPushToken) {
            this.sendPushNotification(
              user.expoPushToken,
              title,
              body,
              { type: 'new_recipe', recipeId: moderatorId }
            );
          }
        });
      } catch (moderatorError) {
        console.log('⚠️ Could not notify all moderators, but recipe was submitted successfully:', moderatorError.message);
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

      // Push notification for development builds
      if (!isExpoGo) {
        try {
          const userDoc = await getDoc(doc(db, 'users', recipeOwnerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.expoPushToken) {
              await this.sendPushNotification(userData.expoPushToken, title, body, {
                type: 'new_comment',
                recipeTitle: recipeTitle,
              });
            }
          }
        } catch (error) {
          console.log('Could not send push notification for comment');
        }
      }
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

      // Push notification for development builds
      if (!isExpoGo) {
        try {
          const userDoc = await getDoc(doc(db, 'users', recipeOwnerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.expoPushToken) {
              await this.sendPushNotification(userData.expoPushToken, title, body, {
                type: 'new_rating',
                recipeTitle: recipeTitle,
              });
            }
          }
        } catch (error) {
          console.log('Could not send push notification for rating');
        }
      }
    } catch (error) {
      console.error('Error notifying recipe owner about rating:', error);
    }
  }
}