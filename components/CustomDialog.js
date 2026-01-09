// components/CustomDialog.js - UPDATED WITH DARK MODE
import React, { useEffect } from "react";
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated,
  Keyboard,
  useColorScheme 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext"; // Import theme hook

export default function CustomDialog({
  visible,
  title,
  message,
  icon = "alert-circle-outline",
  onClose,
  showCancel = false,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  confirmColor,
  cancelColor,
}) {
  const scale = new Animated.Value(0.8);
  const { colors, isDarkMode } = useTheme(); // Get theme colors

  // Use theme colors if not provided, otherwise use provided colors
  const finalConfirmColor = confirmColor || colors.primary;
  const finalCancelColor = cancelColor || colors.textSecondary;

  // Dismiss keyboard when dialog is shown
  useEffect(() => {
    if (visible) {
      Keyboard.dismiss();
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    } else {
      scale.setValue(0.8);
    }
  }, [visible]);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade" 
      onRequestClose={handleCancel}
    >
      <View style={[
        styles.centeredContainer, 
        { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)' }
      ]}>
        <TouchableOpacity 
          style={styles.backgroundTouchable}
          activeOpacity={1}
          onPress={handleCancel}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View style={[
              styles.dialog, 
              { 
                transform: [{ scale }],
                backgroundColor: colors.card,
                shadowColor: isDarkMode ? '#000' : '#000',
              }
            ]}>
              <Ionicons 
                name={icon} 
                size={44} 
                color={finalConfirmColor} 
                style={{ marginBottom: 12 }} 
              />
              
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
              
              <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
              
              <View style={styles.buttonContainer}>
                {showCancel && (
                  <TouchableOpacity 
                    style={[
                      styles.button, 
                      styles.cancelButton, 
                      { 
                        borderColor: finalCancelColor,
                        backgroundColor: isDarkMode ? 'transparent' : 'transparent'
                      }
                    ]}
                    onPress={handleCancel}
                  >
                    <Text style={[styles.buttonText, { color: finalCancelColor }]}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[
                    styles.button, 
                    styles.confirmButton, 
                    { 
                      backgroundColor: finalConfirmColor,
                      shadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : '#000',
                    }
                  ]}
                  onPress={handleConfirm}
                >
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundTouchable: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    width: "80%",
    borderRadius: 20,
    alignItems: "center",
    padding: 24,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 2,
    backgroundColor: "transparent",
  },
  confirmButton: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  confirmButtonText: {
    color: "#fff",
  },
});