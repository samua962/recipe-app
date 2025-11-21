// components/admin/UsersSection.js - FIXED IMPORT
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import CustomDialog from '../CustomDialog';
import { useLanguage } from '../../contexts/LanguageContext'; // FIXED: Changed from '../contexts' to '../../contexts'

export default function UsersSection({ users, recipes, onRefresh, refreshing, onRefreshParent }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  const { locale, t } = useLanguage();

  // ... rest of the component remains the same
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUserRecipeCount = (userId) => {
    return recipes.filter(recipe => recipe.authorId === userId).length;
  };

  const showCustomDialog = (title, message) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setShowDialog(true);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
      });
      
      showCustomDialog(t('admin.users.success.title'), `${t('admin.users.success.roleUpdated')} ${newRole}`);
      onRefresh();
    } catch (error) {
      console.error('Error updating user role:', error);
      showCustomDialog(t('admin.users.errors.title'), `${t('admin.users.errors.roleUpdateFailed')} ${error.message}`);
    }
  };

  const handleDeleteUser = (user) => {
    Alert.alert(
      t('admin.users.delete.title'),
      `${t('admin.users.delete.confirmMessage')} ${user.name}? ${t('admin.users.delete.warning')}`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.users.delete.button'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', user.id));
              showCustomDialog(t('admin.users.success.title'), t('admin.users.success.userDeleted'));
              onRefresh();
            } catch (error) {
              console.error('Error deleting user:', error);
              showCustomDialog(t('admin.users.errors.title'), `${t('admin.users.errors.deleteFailed')} ${error.message}`);
            }
          },
        },
      ]
    );
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

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => showUserDetails(item)}
    >
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Ionicons name="person" size={14} color="#fff" />
            <Text style={styles.roleText}>{t(`admin.users.roles.${item.role}`)}</Text>
          </View>
          <Text style={styles.userName}>{item.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
      
      <Text style={styles.userEmail}>{item.email}</Text>
      <Text style={styles.userRecipes}>
        {t('admin.users.recipes')}: {getUserRecipeCount(item.id)}
      </Text>
      
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.roleButton, item.role === 'user' && styles.activeRoleButton]}
          onPress={() => handleRoleChange(item.id, 'user')}
        >
          <Text style={[
            styles.roleButtonText,
            item.role === 'user' && styles.activeRoleText
          ]}>{t('admin.users.roles.user')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.roleButton, item.role === 'moderator' && styles.activeRoleButton]}
          onPress={() => handleRoleChange(item.id, 'moderator')}
        >
          <Text style={[
            styles.roleButtonText,
            item.role === 'moderator' && styles.activeRoleText
          ]}>{t('admin.users.roles.moderator')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.roleButton, item.role === 'admin' && styles.activeRoleButton]}
          onPress={() => handleRoleChange(item.id, 'admin')}
        >
          <Text style={[
            styles.roleButtonText,
            item.role === 'admin' && styles.activeRoleText
          ]}>{t('admin.users.roles.admin')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteUser(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('admin.users.searchPlaceholder')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* User List with Pull-to-Refresh */}
      {filteredUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={80} color="#ddd" />
          <Text style={styles.emptyStateTitle}>{t('admin.users.emptyState.title')}</Text>
          <Text style={styles.emptyStateText}>
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
              colors={['#f37d1c']}
              tintColor="#f37d1c"
              title={t('common.pullToRefresh')}
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('admin.users.details.title')}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowUserDialog(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.details.name')}:</Text>
                  <Text style={styles.detailValue}>{selectedUser.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.details.email')}:</Text>
                  <Text style={styles.detailValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.details.role')}:</Text>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(selectedUser.role) }]}>
                    <Text style={styles.roleText}>{t(`admin.users.roles.${selectedUser.role}`)}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.details.recipesPosted')}:</Text>
                  <Text style={styles.detailValue}>{getUserRecipeCount(selectedUser.id)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('admin.users.details.memberSince')}:</Text>
                  <Text style={styles.detailValue}>
                    {selectedUser.createdAt?.toDate?.()?.toLocaleDateString() || t('common.unknown')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowUserDialog(false)}
              >
                <Text style={styles.modalButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomDialog
        visible={showDialog}
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => setShowDialog(false)}
      />
    </View>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userRecipes: {
    fontSize: 12,
    color: '#999',
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
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  activeRoleButton: {
    backgroundColor: '#f37d1c',
    borderColor: '#f37d1c',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  modalActions: {
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: '#f37d1c',
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