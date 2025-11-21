// components/CustomDialog.js
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CustomDialog({
  visible,
  title,
  message,
  icon = "alert-circle-outline",
  onClose,
}) {
  const scale = new Animated.Value(0.8);

  if (visible) {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* 🧡 Removed the black overlay entirely */}
      <View style={styles.centeredContainer}>
        <Animated.View style={[styles.dialog, { transform: [{ scale }] }]}>
          <Ionicons name={icon} size={44} color="#f37d1c" style={{ marginBottom: 12 }} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    // ✅ Light gray subtle background instead of black dim
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  dialog: {
    width: "80%",
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
  },
  button: {
    backgroundColor: "#f37d1c",
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
