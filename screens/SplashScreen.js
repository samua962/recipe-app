import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, Animated, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";

const { width } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // After a delay, start fade-out and navigate
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -width,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.replace("Login");
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={["#36D1DC", "#5B86E5"]} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5B86E5" />

      <Animated.View
        style={{
          alignItems: "center",
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        <LottieView
          source={require("../assets/loading.json")} // 👉 your Lottie file
          autoPlay
          loop={false}
          style={{ width: 200, height: 200 }}
        />
        <Text style={styles.title}>Ethiopian Recipe App</Text>
        <Text style={styles.subtitle}>Discover & Cook With Passion</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { color: "#fff", fontSize: 28, fontWeight: "bold", marginTop: 15 },
  subtitle: { color: "#f0f0f0", fontSize: 16, marginTop: 8 },
});
