import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Learn",
    description: "Discover authentic Ethiopian recipes passed down for generations.",
    image: require("../assets/learn.png"), // you can use your own image
  },
  {
    id: "2",
    title: "Cook",
    description: "Follow step-by-step guides with pictures and videos.",
    image: require("../assets/cook.jpg"),
  },
  {
    id: "3",
    title: "Serve",
    description: "Share your favorite dishes and inspire others to cook Ethiopian!",
    image: require("../assets/serve.png"),
  },
];

export default function IntroScreen({ navigation }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const ref = useRef();

  const handleOnboardingComplete = async () => {
    try {
      // Save that user has seen onboarding
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      console.log("IntroScreen: Onboarding completed, navigating to Login");
      navigation.replace("Login");
    } catch (error) {
      console.log('Error saving onboarding status:', error);
      // Still navigate even if there's an error
      navigation.replace("Login");
    }
  };

  const goNext = () => {
    if (currentSlide < slides.length - 1) {
      const nextIndex = currentSlide + 1;
      ref.current.scrollToIndex({ index: nextIndex });
      setCurrentSlide(nextIndex);
    } else {
      // User reached the end - complete onboarding
      handleOnboardingComplete();
    }
  };

  const skipIntro = () => {
    // User skipped - still mark as completed
    handleOnboardingComplete();
  };

  const Slide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <Image source={item.image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={slides}
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => <Slide item={item} />}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentSlide(index);
        }}
      />
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlide === index && styles.activeIndicator,
              ]}
            />
          ))}
        </View>
        <View style={styles.buttonRow}>
          {currentSlide < slides.length - 1 && (
            <TouchableOpacity onPress={skipIntro} style={styles.skipButton}>
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextText}>
              {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  image: { 
    width: width * 0.7, 
    height: height * 0.4, 
    marginBottom: 30 
  },
  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: "#f37d1cff", 
    marginBottom: 10 
  },
  description: { 
    fontSize: 16, 
    color: "#555", 
    textAlign: "center", 
    paddingHorizontal: 10,
    lineHeight: 22,
  },
  footer: { 
    padding: 20,
    paddingBottom: 40, // Extra padding for better spacing
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  indicator: {
    height: 8,
    width: 8,
    backgroundColor: "#ccc",
    borderRadius: 4,
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: "#f37d1cff",
    width: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipButton: {
    padding: 10,
  },
  skip: {
    fontSize: 16,
    color: "#888",
    fontWeight: "500",
  },
  nextBtn: {
    backgroundColor: "#f37d1cff",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
});