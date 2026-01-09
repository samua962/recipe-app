// components/KeyboardAwareDialog.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function KeyboardAwareDialog({
  visible,
  title,
  message,
  icon = "alert-circle-outline",
  onClose,
  showCancel = false,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  confirmColor = "#f37d1c",
  cancelColor = "#666",
}) {
  const scale = new Animated.Value(0.8);
  const opacity = new Animated.Value(0);
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      // Dismiss keyboard with a slight delay
      setTimeout(() => {
        Keyboard.dismiss();
      }, 50);
      
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
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

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.overlay, { height: height + keyboardHeight }]}
        activeOpacity={1}
        onPress={handleCancel}
      >
        <Animated.View
          style={[
            styles.overlayAnimated,
            {
              opacity,
              backgroundColor: "rgba(255,255,255,0.85)",
            },
          ]}
        />
      </TouchableOpacity>

      <View
        style={[
          styles.centeredContainer,
          { bottom: keyboardHeight > 0 ? keyboardHeight / 2 : 0 },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.dialogTouchable}
        >
          <Animated.View
            style={[
              styles.dialog,
              {
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            <Ionicons
              name={icon}
              size={44}
              color={confirmColor}
              style={{ marginBottom: 12 }}
            />

            <Text style={styles.title}>{title}</Text>

            <Text style={styles.message}>{message}</Text>

            <View style={styles.buttonContainer}>
              {showCancel && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    { borderColor: cancelColor },
                  ]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.buttonText, { color: cancelColor }]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  { backgroundColor: confirmColor },
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    position: "absolute",
    width: width,
    top: 0,
    left: 0,
    right: 0,
  },
  overlayAnimated: {
    flex: 1,
  },
  centeredContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogTouchable: {
    width: "80%",
  },
  dialog: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    color: "#555",
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
    shadowColor: "#000",
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