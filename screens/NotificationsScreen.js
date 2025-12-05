// screens/NotificationsScreen.js - UPDATED FOOTER POSITION & CUSTOM DIALOGS
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ProgressBarAndroid,
  ProgressViewIOS,
} from 'react-native';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const { colors, isDarkMode } = useTheme();

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  useEffect(() => {
    if (auth.currentUser) {
      loadNotifications();
    }
  }, []);

  const loadNotifications = () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notificationsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setNotifications(notificationsList);
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        console.error('Error loading notifications:', error);
        setLoading(false);
        setRefreshing(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up notifications listener:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showErrorDialog('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      if (unreadNotifications.length === 0) return;

      const batch = writeBatch(db);
      unreadNotifications.forEach(notification => {
        const notificationRef = doc(db, 'notifications', notification.id);
        batch.update(notificationRef, { read: true });
      });

      await batch.commit();
      showSuccessDialog('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      showErrorDialog('Failed to mark all notifications as read');
    }
  };

  const showDeleteDialog = (notificationId) => {
    setSelectedNotificationId(notificationId);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedNotificationId) return;
    
    setDeleteInProgress(true);
    try {
      await deleteDoc(doc(db, 'notifications', selectedNotificationId));
      setDeleteModalVisible(false);
      setSelectedNotificationId(null);
      
      // Show success message briefly
      setTimeout(() => {
        setDeleteInProgress(false);
      }, 500);
    } catch (error) {
      console.error('Error deleting notification:', error);
      showErrorDialog('Failed to delete notification');
      setDeleteInProgress(false);
    }
  };

  const showSuccessDialog = (message) => {
    Alert.alert('Success', message, [{ text: 'OK', style: 'default' }]);
  };

  const showErrorDialog = (message) => {
    Alert.alert('Error', message, [{ text: 'OK', style: 'destructive' }]);
  };

  const getNotificationIcon = (type, action) => {
    switch (type) {
      case 'recipe_review':
        return action === 'approved' ? 'checkmark-circle' : 'alert-circle';
      case 'new_recipe':
        return 'restaurant';
      case 'recipe_submitted':
        return 'time';
      case 'new_comment':
        return 'chatbubble';
      case 'new_rating':
        return 'star';
      case 'user_notification':
        return 'notifications';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type, action) => {
    switch (type) {
      case 'recipe_review':
        return action === 'approved' ? '#4caf50' : '#ff9800';
      case 'new_recipe':
        return '#2196f3';
      case 'recipe_submitted':
        return '#9c27b0';
      case 'new_comment':
        return '#00bcd4';
      case 'new_rating':
        return '#ffc107';
      case 'user_notification':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem, 
        { 
          backgroundColor: colors.card,
          shadowColor: isDarkMode ? 'transparent' : '#000',
          borderLeftColor: 'transparent',
          borderLeftWidth: 4,
        },
        !item.read && {
          borderLeftColor: colors.primary,
          backgroundColor: isDarkMode ? colors.badgeBg : '#fef8f4',
        }
      ]}
      onPress={() => markAsRead(item.id)}
      onLongPress={() => showDeleteDialog(item.id)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type, item.action) }]}>
            <Ionicons 
              name={getNotificationIcon(item.type, item.action)} 
              size={18} 
              color="#fff" 
            />
          </View>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.notificationBody, { color: colors.textSecondary }]}>{item.body}</Text>
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
        
        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </View>
    </TouchableOpacity>
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          shadowColor: isDarkMode ? 'transparent' : '#000',
        }
      ]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
            <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <Ionicons name="notifications-off-outline" size={80} color={colors.placeholder} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No notifications yet</Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            You'll see important updates about your recipes and activity here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadNotifications();
              }}
              colors={[colors.primary]}
              tintColor={colors.primary}
              titleColor={colors.primary}
            />
          }
          contentContainerStyle={[styles.listContent, { 
            paddingBottom: 100, // Extra padding for safe area
          }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer - Now placed above tab navigation */}
      {notifications.length > 0 && (
        <View style={[
          styles.footer, 
          { 
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          }
        ]}>
          <View style={styles.footerContent}>
            <View style={styles.footerStats}>
              <Text style={[styles.footerText, { color: colors.text }]}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </Text>
              {unreadCount > 0 && (
                <View style={styles.unreadIndicator}>
                  <View style={[styles.unreadDotSmall, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.footerUnreadText, { color: colors.primary }]}>
                    {unreadCount} unread
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Custom Delete Confirmation Dialog */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!deleteInProgress) {
            setDeleteModalVisible(false);
            setSelectedNotificationId(null);
          }
        }}
      >
        <TouchableWithoutFeedback 
          onPress={() => {
            if (!deleteInProgress) {
              setDeleteModalVisible(false);
              setSelectedNotificationId(null);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.dialogContainer, { backgroundColor: colors.card }]}>
                {/* Dialog Header */}
                <View style={[styles.dialogHeader, { borderBottomColor: colors.border }]}>
                  <Ionicons name="warning" size={28} color={colors.primary} />
                  <Text style={[styles.dialogTitle, { color: colors.text }]}>
                    Delete Notification
                  </Text>
                </View>

                {/* Dialog Content */}
                <View style={styles.dialogContent}>
                  <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
                    Are you sure you want to delete this notification?
                  </Text>
                  <Text style={[styles.dialogSubMessage, { color: colors.textSecondary }]}>
                    This action cannot be undone.
                  </Text>
                  
                  {/* Progress Bar when deleting */}
                  {deleteInProgress && (
                    <View style={styles.progressContainer}>
                      {Platform.OS === 'android' ? (
                        <ProgressBarAndroid
                          styleAttr="Horizontal"
                          indeterminate={true}
                          color={colors.primary}
                          style={styles.progressBar}
                        />
                      ) : (
                        <ProgressViewIOS
                          progressTintColor={colors.primary}
                          trackTintColor={isDarkMode ? '#444' : '#e0e0e0'}
                          style={styles.progressBarIOS}
                        />
                      )}
                      <Text style={[styles.deletingText, { color: colors.textSecondary }]}>
                        Deleting...
                      </Text>
                    </View>
                  )}
                </View>

                {/* Dialog Actions */}
                {!deleteInProgress && (
                  <View style={[styles.dialogActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      style={[styles.dialogButton, styles.cancelButton]}
                      onPress={() => {
                        setDeleteModalVisible(false);
                        setSelectedNotificationId(null);
                      }}
                      disabled={deleteInProgress}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.dialogButton, styles.deleteButton, { backgroundColor: colors.primary }]}
                      onPress={handleDelete}
                      disabled={deleteInProgress}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginTop:20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginRight: 8,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationHeader: {
    flexDirection: 'row',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  // Footer Styles - Fixed position
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unreadIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  unreadDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  footerUnreadText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Custom Dialog Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  dialogContent: {
    padding: 20,
  },
  dialogMessage: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  dialogSubMessage: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 4,
  },
  progressBarIOS: {
    width: '100%',
    height: 4,
    marginBottom: 8,
  },
  deletingText: {
    fontSize: 14,
    marginTop: 8,
  },
  dialogActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  dialogButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});