// components/admin/UsersSection.js - UPDATED WITH USE NAVIGATION
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native'; // ADDED
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import CustomDialog from '../CustomDialog';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function UsersSection({ users, recipes, onRefresh, refreshing, onRefreshParent }) {
  const navigation = useNavigation(); // ADDED
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState('');
  const [targetUser, setTargetUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [dialogIcon, setDialogIcon] = useState('information-circle');
  const [dialogAnimation] = useState(new Animated.Value(0));

  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserRecipeCount = (userId) => {
    return recipes.filter(recipe => recipe.authorId === userId).length;
  };

  const showCustomDialog = (title, message, icon = "information-circle") => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogIcon(icon);
    setShowInfoDialog(true);
  };

  const showActionConfirmation = (user, type) => {
    setTargetUser(user);
    setActionType(type);
    setShowActionDialog(true);
    Animated.spring(dialogAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const hideActionDialog = () => {
    Animated.timing(dialogAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowActionDialog(false);
      setTargetUser(null);
      setActionType('');
    });
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
      });
      
      showCustomDialog(t('admin.users.success.title'), `${t('admin.users.success.roleUpdated')} ${t(`admin.users.roles.${newRole}`)}`, "checkmark-circle");
      onRefresh();
    } catch (error) {
      console.error('Error updating user role:', error);
      showCustomDialog(t('admin.users.errors.title'), `${t('admin.users.errors.roleUpdateFailed')} ${error.message}`, "close-circle");
    } finally {
      setActionLoading(false);
      hideActionDialog();
    }
  };

  const handleDeleteUser = async () => {
    if (!targetUser) return;
    
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, 'users', targetUser.id));
      showCustomDialog(t('admin.users.success.title'), t('admin.users.success.userDeleted'), "checkmark-circle");
      onRefresh();
    } catch (error) {
      console.error('Error deleting user:', error);
      showCustomDialog(t('admin.users.errors.title'), `${t('admin.users.errors.deleteFailed')} ${error.message}`, "close-circle");
    } finally {
      setActionLoading(false);
      hideActionDialog();
    }
  };

  const handleActionConfirm = async () => {
    if (!targetUser) return;
    
    if (actionType === 'delete') {
      await handleDeleteUser();
    } else if (actionType.startsWith('role_')) {
      const newRole = actionType.replace('role_', '');
      await handleRoleChange(targetUser.id, newRole);
    }
  };

  const showUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return '#ff6b6b';
      case 'moderator': return '#4ecdc4';
      case 'user': return '#45b7d1';
      default: return '#95a5a6';
    }
  };

  const ActionDialog = () => {
    const translateY = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [300, 0],
    });

    const opacity = dialogAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const getDialogContent = () => {
      if (actionType === 'delete') {
        return {
          icon: "trash-outline",
          iconColor: "#e74c3c",
          title: t('admin.users.delete.title'),
          message: `${t('admin.users.delete.confirmMessage')} ${targetUser?.name}? ${t('admin.users.delete.warning')}`,
          confirmText: t('admin.users.delete.button'),
          confirmColor: "#e74c3c"
        };
      } else if (actionType.startsWith('role_')) {
        const newRole = actionType.replace('role_', '');
        return {
          icon: "person-outline",
          iconColor: "#3498db",
          title: t('admin.users.roleChange.title'),
          message: t('admin.users.roleChange.message', { 
            name: targetUser?.name, 
            newRole: t(`admin.users.roles.${newRole}`) 
          }),
          confirmText: t('admin.users.roleChange.confirm'),
          confirmColor: "#3498db"
        };
      }
      return null;
    };

    const content = getDialogContent();
    if (!content) return null;

    return (
      <Modal
        visible={showActionDialog}
        transparent
        animationType="none"
        onRequestClose={hideActionDialog}
      >
        <View style={styles.dialogOverlay}>
          <Animated.View style={[styles.dialogContainer, { 
            backgroundColor: colors.card,
            opacity,
            transform: [{ translateY }] 
          }]}>
            <View style={[styles.dialogIcon, { backgroundColor: `${content.iconColor}20` }]}>
              <Ionicons name={content.icon} size={48} color={content.iconColor} />
            </View>
            
            <Text style={[styles.dialogTitle, { color: colors.text }]}>
              {content.title}
            </Text>
            
            <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
              {content.message}
            </Text>
            
            {actionLoading && (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color={content.iconColor} />
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {t('admin.users.processing')}
                </Text>
              </View>
            )}
            
            <View style={styles.dialogButtons}>
              <TouchableOpacity 
                style={[styles.dialogButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={hideActionDialog}
                disabled={actionLoading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.dialogButton, { backgroundColor: content.confirmColor }]}
                onPress={handleActionConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    {content.confirmText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.userCard, { backgroundColor: colors.card }]}
      onPress={() => showUserDetails(item)}
      activeOpacity={0.9}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Ionicons name="person" size={14} color="#fff" />
            <Text style={styles.roleText}>{t(`admin.users.roles.${item.role}`)}</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </View>
      
      <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{item.email}</Text>
      <Text style={[styles.userRecipes, { color: colors.textSecondary }]}>
        {t('admin.users.recipes')}: {getUserRecipeCount(item.id)}
      </Text>
      
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[
            styles.roleButton, 
            { backgroundColor: colors.background, borderColor: colors.border },
            item.role === 'user' && [styles.activeRoleButton, { backgroundColor: colors.primary, borderColor: colors.primary }]
          ]}
          onPress={() => showActionConfirmation(item, 'role_user')}
        >
          <Text style={[
            styles.roleButtonText,
            { color: colors.textSecondary },
            item.role === 'user' && styles.activeRoleText
          ]}>{t('admin.users.roles.user')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.roleButton, 
            { backgroundColor: colors.background, borderColor: colors.border },
            item.role === 'moderator' && [styles.activeRoleButton, { backgroundColor: colors.primary, borderColor: colors.primary }]
          ]}
          onPress={() => showActionConfirmation(item, 'role_moderator')}
        >
          <Text style={[
            styles.roleButtonText,
            { color: colors.textSecondary },
            item.role === 'moderator' && styles.activeRoleText
          ]}>{t('admin.users.roles.moderator')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.roleButton, 
            { backgroundColor: colors.background, borderColor: colors.border },
            item.role === 'admin' && [styles.activeRoleButton, { backgroundColor: colors.primary, borderColor: colors.primary }]
          ]}
          onPress={() => showActionConfirmation(item, 'role_admin')}
        >
          <Text style={[
            styles.roleButtonText,
            { color: colors.textSecondary },
            item.role === 'admin' && styles.activeRoleText
          ]}>{t('admin.users.roles.admin')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => showActionConfirmation(item, 'delete')}
        >
          <Ionicons name="trash-outline" size={18} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { 
        backgroundColor: colors.card, 
        borderColor: colors.border 
      }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('admin.users.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
          <Ionicons name="people-outline" size={80} color={colors.border} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
            {t('admin.users.emptyState.title')}
          </Text>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {searchQuery ? t('admin.users.emptyState.adjustSearch') : t('admin.users.emptyState.noUsers')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefreshParent}
              colors={[colors.primary]}
              tintColor={colors.primary}
              title={t('common.pullToRefresh')}
              titleColor={colors.primary}
            />
          }
        />
      )}

      {/* User Detail Dialog */}
      <Modal
        visible={showUserDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUserDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('admin.users.details.title')}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowUserDialog(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.userDetails}>
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('admin.users.details.name')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedUser.name}</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('admin.users.details.email')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{selectedUser.email}</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('admin.users.details.role')}:
                  </Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Text style={styles.roleText}>{t(`admin.users.roles.${selectedUser.role}`)}</Text>
                  </View>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('admin.users.details.recipesPosted')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{getUserRecipeCount(selectedUser.id)}</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    {t('admin.users.details.memberSince')}:
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {selectedUser.createdAt?.toDate?.()?.toLocaleDateString() || t('common.unknown')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowUserDialog(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Info Dialog */}
      <CustomDialog
        visible={showInfoDialog}
        title={dialogTitle}
        message={dialogMessage}
        icon={dialogIcon}
        onClose={() => setShowInfoDialog(false)}
      />

      {/* Action Dialog */}
      <ActionDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  userCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  userRecipes: {
    fontSize: 12,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeRoleButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeRoleText: {
    color: '#fff',
  },
  deleteButton: {
    padding: 6,
    marginLeft: 'auto',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Dialog Styles
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dialogIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
  },
  dialogButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  userDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 20,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});