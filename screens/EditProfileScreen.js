// screens/EditProfileScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  updatePassword 
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

export default function EditProfileScreen({ navigation, route }) {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    if (route.params?.userData) {
      const userData = route.params.userData;
      setInitialData(userData);
      setName(userData.name || "");
      setBio(userData.bio || "");
      setImageUri(userData.profilePhoto || null);
    }
  }, [route.params]);

  const pickImage = async (source) => {
    try {
      let result;
      
      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            t("editProfile.permissions.cameraTitle"),
            t("editProfile.permissions.cameraMessage")
          );
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            t("editProfile.permissions.libraryTitle"),
            t("editProfile.permissions.libraryMessage")
          );
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].uri) {
        setImageUri(result.assets[0].base64 ? `data:image/jpeg;base64,${result.assets[0].base64}` : result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(
        t("editProfile.errors.imagePickerTitle"),
        t("editProfile.errors.imagePickerMessage")
      );
    } finally {
      setShowImageOptions(false);
    }
  };

  const handleSaveProfile = async () => {
    Keyboard.dismiss();
    
    if (!name.trim()) {
      Alert.alert(
        t("editProfile.errors.validationTitle"),
        t("editProfile.errors.nameRequired")
      );
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert(
        t("editProfile.errors.authTitle"),
        t("editProfile.errors.authMessage")
      );
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      let profilePhotoData = imageUri;
      
      if (imageUri && imageUri !== initialData?.profilePhoto && !imageUri.startsWith("data:image")) {
        if (imageUri.startsWith("file://")) {
          profilePhotoData = imageUri;
        } else if (!imageUri.startsWith("http")) {
          Alert.alert(
            t("editProfile.errors.invalidImageTitle"),
            t("editProfile.errors.invalidImageMessage")
          );
          return;
        }
      }

      const updateData = {
        name: name.trim(),
        bio: bio.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (profilePhotoData) {
        updateData.profilePhoto = profilePhotoData;
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, updateData);

      Alert.alert(
        t("editProfile.success.title"),
        t("editProfile.success.message"),
        [
          {
            text: t("common.ok"),
            onPress: () => navigation.goBack()
          }
        ]
      );
      
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert(
        t("editProfile.errors.updateTitle"),
        t("editProfile.errors.updateMessage")
      );
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Password Change Functions
  const validatePassword = () => {
    if (!currentPassword.trim()) {
      Alert.alert(
        t("editProfile.password.errors.validationTitle"),
        t("editProfile.password.errors.currentPasswordRequired")
      );
      return false;
    }

    if (!newPassword.trim()) {
      Alert.alert(
        t("editProfile.password.errors.validationTitle"),
        t("editProfile.password.errors.newPasswordRequired")
      );
      return false;
    }

    if (newPassword.length < 6 || newPassword.length > 8) {
      Alert.alert(
        t("editProfile.password.errors.validationTitle"),
        t("editProfile.password.errors.passwordLength")
      );
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("editProfile.password.errors.validationTitle"),
        t("editProfile.password.errors.passwordsNotMatch")
      );
      return false;
    }

    if (newPassword === currentPassword) {
      Alert.alert(
        t("editProfile.password.errors.validationTitle"),
        t("editProfile.password.errors.samePassword")
      );
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    Keyboard.dismiss();
    
    if (!validatePassword()) return;

    setChangingPassword(true);
    const user = auth.currentUser;

    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      // Reset fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordFields(false);
      
      Alert.alert(
        t("editProfile.password.success.title"),
        t("editProfile.password.success.message"),
        [
          {
            text: t("common.ok"),
            onPress: () => {
              // Optional: You could logout user here or keep them logged in
            }
          }
        ]
      );
      
    } catch (error) {
      console.error("Error changing password:", error);
      
      let errorMessage = t("editProfile.password.errors.general");
      
      if (error.code === "auth/wrong-password") {
        errorMessage = t("editProfile.password.errors.wrongCurrentPassword");
      } else if (error.code === "auth/weak-password") {
        errorMessage = t("editProfile.password.errors.weakPassword");
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage = t("editProfile.password.errors.recentLoginRequired");
      }
      
      Alert.alert(
        t("editProfile.password.errors.title"),
        errorMessage
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      t("editProfile.removePhoto.title"),
      t("editProfile.removePhoto.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.remove"),
          style: "destructive",
          onPress: () => {
            setImageUri(null);
            setShowImageOptions(false);
          }
        }
      ]
    );
  };

  const hasChanges = () => {
    if (!initialData) return false;
    
    const nameChanged = name !== initialData.name;
    const bioChanged = bio !== (initialData.bio || "");
    const photoChanged = imageUri !== (initialData.profilePhoto || null);
    
    return nameChanged || bioChanged || photoChanged;
  };

  const ImagePickerModal = () => (
    <View style={styles.imagePickerContainer}>
      <TouchableOpacity
        style={styles.modalOption}
        onPress={() => pickImage("camera")}
      >
        <Ionicons name="camera-outline" size={24} color={colors.text} />
        <Text style={[styles.modalOptionText, { color: colors.text }]}>
          {t("editProfile.imageOptions.takePhoto")}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.modalOption}
        onPress={() => pickImage("library")}
      >
        <Ionicons name="image-outline" size={24} color={colors.text} />
        <Text style={[styles.modalOptionText, { color: colors.text }]}>
          {t("editProfile.imageOptions.chooseFromLibrary")}
        </Text>
      </TouchableOpacity>
      
      {imageUri && (
        <TouchableOpacity
          style={[styles.modalOption, styles.removeOption]}
          onPress={handleRemovePhoto}
        >
          <Ionicons name="trash-outline" size={24} color="#e74c3c" />
          <Text style={styles.removeOptionText}>
            {t("editProfile.imageOptions.removePhoto")}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={[styles.modalOption, styles.cancelOption]}
        onPress={() => setShowImageOptions(false)}
      >
        <Text style={[styles.cancelOptionText, { color: colors.textSecondary }]}>
          {t("common.cancel")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Keyboard.dismiss();
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {t("editProfile.title")}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Photo Section */}
        <View style={[styles.photoSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            {t("editProfile.profilePhoto")}
          </Text>
          
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={() => {
              Keyboard.dismiss();
              setShowImageOptions(true);
            }}
            disabled={uploading}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.profileImage} />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="person" size={40} color={colors.primary} />
              </View>
            )}
            
            <View style={[styles.editPhotoButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          
          {uploading && (
            <View style={styles.uploadProgressContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.uploadProgressText, { color: colors.textSecondary }]}>
                {t("editProfile.uploading")}
              </Text>
            </View>
          )}
          
          <Text style={[styles.photoHint, { color: colors.textSecondary }]}>
            {t("editProfile.photoHint")}
          </Text>
        </View>

        {/* Image Picker Options */}
        {showImageOptions && (
          <View style={[styles.modalOverlay, { backgroundColor: colors.card }]}>
            <ImagePickerModal />
          </View>
        )}

        {/* Form Section */}
        <View style={[styles.formSection, { backgroundColor: colors.card }]}>
          {/* Name Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("editProfile.name")} *
            </Text>
            <View style={[
              styles.inputWrapper,
              { 
                backgroundColor: colors.background,
                borderColor: colors.border
              }
            ]}>
              <Ionicons 
                name="person-outline" 
                size={20} 
                color={colors.textSecondary} 
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                placeholder={t("editProfile.namePlaceholder")}
                placeholderTextColor={colors.textSecondary}
                maxLength={50}
                keyboardShouldPersistTaps="handled"
              />
            </View>
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {name.length}/50
            </Text>
          </View>

          {/* Bio Field */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("editProfile.bio")}
            </Text>
            <View style={[
              styles.textAreaWrapper,
              { 
                backgroundColor: colors.background,
                borderColor: colors.border
              }
            ]}>
              <Ionicons 
                name="document-text-outline" 
                size={20} 
                color={colors.textSecondary} 
                style={styles.textAreaIcon}
              />
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                value={bio}
                onChangeText={setBio}
                placeholder={t("editProfile.bioPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={200}
                textAlignVertical="top"
                keyboardShouldPersistTaps="handled"
              />
            </View>
            <Text style={[styles.charCount, { color: colors.textSecondary }]}>
              {bio.length}/200
            </Text>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t("editProfile.email")}
            </Text>
            <View style={[
              styles.readOnlyInput,
              { 
                backgroundColor: colors.background + "80",
                borderColor: colors.border
              }
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={colors.textSecondary} 
                style={styles.inputIcon}
              />
              <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                {auth.currentUser?.email}
              </Text>
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {t("editProfile.emailHint")}
            </Text>
          </View>
        </View>

        {/* Password Change Section */}
        <View style={[styles.passwordSection, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.passwordHeader}
            onPress={() => {
              Keyboard.dismiss();
              setShowPasswordFields(!showPasswordFields);
            }}
          >
            <View style={styles.passwordHeaderLeft}>
              <View style={[styles.passwordIcon, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="key-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.passwordHeaderText}>
                <Text style={[styles.passwordTitle, { color: colors.text }]}>
                  {t("editProfile.password.title")}
                </Text>
                <Text style={[styles.passwordSubtitle, { color: colors.textSecondary }]}>
                  {showPasswordFields 
                    ? t("editProfile.password.hide") 
                    : t("editProfile.password.show")}
                </Text>
              </View>
            </View>
            <Ionicons 
              name={showPasswordFields ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          {showPasswordFields && (
            <View style={styles.passwordFields}>
              {/* Current Password */}
              <View style={styles.passwordInputContainer}>
                <Text style={[styles.passwordLabel, { color: colors.text }]}>
                  {t("editProfile.password.currentPassword")} *
                </Text>
                <View style={[
                  styles.passwordInputWrapper,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={20} 
                    color={colors.textSecondary} 
                    style={styles.passwordInputIcon}
                  />
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t("editProfile.password.currentPasswordPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    keyboardShouldPersistTaps="handled"
                  />
                  <TouchableOpacity
                    style={styles.passwordVisibilityButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons 
                      name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.passwordInputContainer}>
                <Text style={[styles.passwordLabel, { color: colors.text }]}>
                  {t("editProfile.password.newPassword")} *
                </Text>
                <View style={[
                  styles.passwordInputWrapper,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}>
                  <Ionicons 
                    name="lock-open-outline" 
                    size={20} 
                    color={colors.textSecondary} 
                    style={styles.passwordInputIcon}
                  />
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t("editProfile.password.newPasswordPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    keyboardShouldPersistTaps="handled"
                  />
                  <TouchableOpacity
                    style={styles.passwordVisibilityButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons 
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.passwordHint, { color: colors.textSecondary }]}>
                  {t("editProfile.password.lengthHint")}
                </Text>
              </View>

              {/* Confirm Password */}
              <View style={styles.passwordInputContainer}>
                <Text style={[styles.passwordLabel, { color: colors.text }]}>
                  {t("editProfile.password.confirmPassword")} *
                </Text>
                <View style={[
                  styles.passwordInputWrapper,
                  { 
                    backgroundColor: colors.background,
                    borderColor: colors.border
                  }
                ]}>
                  <Ionicons 
                    name="checkmark-circle-outline" 
                    size={20} 
                    color={colors.textSecondary} 
                    style={styles.passwordInputIcon}
                  />
                  <TextInput
                    style={[styles.passwordInput, { color: colors.text }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("editProfile.password.confirmPasswordPlaceholder")}
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    keyboardShouldPersistTaps="handled"
                  />
                  <TouchableOpacity
                    style={styles.passwordVisibilityButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Update Password Button */}
              <TouchableOpacity
                style={[
                  styles.updatePasswordButton,
                  { backgroundColor: colors.primary },
                  changingPassword && styles.updatePasswordButtonDisabled
                ]}
                onPress={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.updatePasswordButtonText}>
                    {t("editProfile.password.updateButton")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save Profile Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: hasChanges() ? colors.primary : colors.disabled },
            (loading || uploading) && styles.saveButtonDisabled
          ]}
          onPress={handleSaveProfile}
          disabled={!hasChanges() || loading || uploading}
        >
          {loading || uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {t("editProfile.saveButton")}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { borderColor: colors.border }]}
          onPress={() => {
            Keyboard.dismiss();
            navigation.goBack();
          }}
          disabled={loading || uploading}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
            {t("common.cancel")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  photoSection: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  photoContainer: {
    position: "relative",
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  editPhotoButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  uploadProgressText: {
    fontSize: 14,
  },
  photoHint: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  // Image Picker Modal
  modalOverlay: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  imagePickerContainer: {
    paddingVertical: 10,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    gap: 16,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  removeOption: {
    borderBottomWidth: 0,
  },
  removeOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#e74c3c",
  },
  cancelOption: {
    justifyContent: "center",
    borderBottomWidth: 0,
    marginTop: 10,
  },
  cancelOptionText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  // Form Section
  formSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  inputIcon: {
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 16,
  },
  textAreaWrapper: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  textAreaIcon: {
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  textArea: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 12,
    fontSize: 16,
    minHeight: 100,
  },
  readOnlyInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    opacity: 0.7,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 16,
    paddingRight: 12,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  // Password Section
  passwordSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  passwordHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  passwordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  passwordHeaderText: {
    flex: 1,
  },
  passwordTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  passwordSubtitle: {
    fontSize: 14,
  },
  passwordFields: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  passwordInputContainer: {
    marginBottom: 16,
  },
  passwordLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  passwordInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  passwordInputIcon: {
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  passwordVisibilityButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordHint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  updatePasswordButton: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  updatePasswordButtonDisabled: {
    opacity: 0.6,
  },
  updatePasswordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Save/Cancel Buttons
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelButton: {
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});