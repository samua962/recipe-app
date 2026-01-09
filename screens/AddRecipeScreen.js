// screens/AddRecipeScreen.js - UPDATED WITH DARK MODE AND CUSTOM DIALOGS
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
  Dimensions,
  Modal,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import CustomDialog from "../components/CustomDialog";
import { NotificationService } from "../services/notificationService";
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext'; // Import theme hook

const { width } = Dimensions.get("window");

// Comprehensive categories with accurate Amharic translations
const CATEGORIES = [
  { en: "Breakfast", am: "ቁርስ" },
  { en: "Lunch", am: "ምሳ" },
  { en: "Dinner", am: "እራት" },
  { en: "Dessert", am: "ምርጥ ምግብ" },
  { en: "Drinks", am: "መጠጦች" },
  { en: "Vegetarian", am: "አትክልት" },
  { en: "Meat", am: "ስጋ ምግብ" },
  { en: "Appetizer", am: "መግቢያ" }
];

// Translation Service (same as before)
class TranslationService {
  static async translateText(text, targetLanguage) {
    if (!text || text.trim() === '') return text;
    
    console.log(`Translating: "${text.substring(0, 50)}..." to ${targetLanguage}`);

    try {
      // Try MyMemory API first
      const translated = await this.tryMyMemoryAPI(text, targetLanguage);
      if (translated && translated !== text && this.isValidTranslation(translated)) {
        console.log('Translation successful via MyMemory API');
        return translated;
      }

      // Fallback to Google Translate API
      const googleTranslated = await this.tryGoogleTranslate(text, targetLanguage);
      if (googleTranslated && googleTranslated !== text && this.isValidTranslation(googleTranslated)) {
        console.log('Translation successful via Google Translate');
        return googleTranslated;
      }

      // Final fallback to simple word mapping
      const simpleTranslation = this.simpleWordMapping(text, targetLanguage);
      if (simpleTranslation && simpleTranslation !== text) {
        console.log('Used simple word mapping fallback');
        return simpleTranslation;
      }

      console.log('No suitable translation found, returning original text');
      return text;

    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  static isValidTranslation(translatedText) {
    // Basic validation to check if translation seems reasonable
    if (!translatedText) return false;
    if (translatedText.length === 0) return false;
    if (translatedText === 'undefined') return false;
    if (translatedText === 'null') return false;
    return true;
  }

  static async tryMyMemoryAPI(text, targetLanguage) {
    try {
      const sourceLang = targetLanguage === 'am' ? 'en' : 'am';
      const langPair = targetLanguage === 'am' ? 'en|am' : 'am|en';
      
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`,
        {
          method: 'GET',
          timeout: 10000
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData.translatedText) {
        return data.responseData.translatedText;
      } else {
        throw new Error('Translation API returned error');
      }
    } catch (error) {
      console.log('MyMemory API failed:', error.message);
      return null;
    }
  }

  static async tryGoogleTranslate(text, targetLanguage) {
    try {
      // This is a simplified approach - in production, you'd use official Google Cloud Translation API
      const sourceLang = targetLanguage === 'am' ? 'en' : 'am';
      const langPair = targetLanguage === 'am' ? 'en-am' : 'am-en';
      
      // Using a free translation service as fallback
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`,
        {
          method: 'GET',
          timeout: 10000
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0][0][0];
      } else {
        throw new Error('Google Translate API returned unexpected format');
      }
    } catch (error) {
      console.log('Google Translate fallback failed:', error.message);
      return null;
    }
  }

  static simpleWordMapping(text, targetLanguage) {
    // Comprehensive word mapping for cooking terms
    const wordMap = {
      'en-am': {
        // Ingredients
        'salt': 'ጨው',
      'sugar': 'ስኳር',
        'water': 'ውሃ',
        'oil': 'ዘይት',
        'butter': 'ቅቤ',
        'flour': 'ዱቄት',
        'egg': 'እንቁላል',
        'eggs': 'እንቁላል',
        'milk': 'ወተት',
        'bread': 'ዳቦ',
        'rice': 'ሩዝ',
        'meat': 'ስጋ',
        'chicken': 'ዶሮ',
        'fish': 'ዓሣ',
        'vegetable': 'አትክልት',
        'vegetables': 'አትክልቶች',
        'fruit': 'ፍራፍሬ',
        'fruits': 'ፍራፍሬዎች',
        'spice': 'ቅመም',
        'spices': 'ቅመሞች',
        'pepper': 'በርበሬ',
        'onion': 'ሽንኩርት',
        'onions': 'ሽንኩርት',
        'garlic': 'ነጭ ሽንኩርት',
        'tomato': 'ቲማቲም',
        'tomatoes': 'ቲማቲም',
        'potato': 'ድንች',
        'potatoes': 'ድንች',
        'carrot': 'ካሮት',
        'carrots': 'ካሮት',
        
        // Cooking verbs
        'mix': 'ቀላቀል',
        'stir': 'ቀላቀል',
        'cook': 'ማብሰል',
        'fry': 'ማብሰል',
        'boil': 'ማፍላት',
        'bake': 'ማብሰል',
        'grill': 'ማጠፍ',
        'roast': 'ማጠፍ',
        'serve': 'ማቅረብ',
        'add': 'ጨምር',
        'cut': 'ቁረጥ',
        'chop': 'ቁረጥ',
        'slice': 'ቁረጥ',
        'peel': 'ለጣጥል',
        
        // Measurements
        'cup': 'ጽዋ',
        'cups': 'ጽዋዎች',
        'teaspoon': 'ሻይ ማንኪያ',
        'tablespoon': 'የምግብ ማንኪያ',
        'gram': 'ግራም',
        'kilo': 'ኪሎ',
        'liter': 'ሊትር',
        'milliliter': 'ሚሊ ሊትር',
        
        // Instructions
        'first': 'መጀመሪያ',
        'then': 'ከዚያ',
        'next': 'ቀጥሎ',
        'after': 'ከዚያ በኋላ',
        'finally': 'በመጨረሻ',
        'now': 'አሁን',
        'until': 'እስከ',
        'about': 'ወደ',
        'minutes': 'ደቂቃዎች',
        'hour': 'ሰዓት',
        'hours': 'ሰዓቶች'
      },
      'am-en': {
        // Ingredients (Amharic to English)
        'ጨው': 'salt',
        'ሽንኩርት': 'sugar', 
        'ውሃ': 'water',
        'ዘይት': 'oil',
        'ቅቤ': 'butter',
        'ዱቄት': 'flour',
        'እንቁላል': 'egg',
        'ወተት': 'milk',
        'ዳቦ': 'bread',
        'ሩዝ': 'rice',
        'ስጋ': 'meat',
        'ዶሮ': 'chicken',
        'ዓሣ': 'fish',
        'አትክልት': 'vegetable',
        'አትክልቶች': 'vegetables',
        'ፍራፍሬ': 'fruit',
        'ፍራፍሬዎች': 'fruits',
        'ቅመም': 'spice',
        'ቅመሞች': 'spices',
        'በርበሬ': 'pepper',
        'ሽንኩርት': 'onion',
        'ነጭ ሽንኩርት': 'garlic',
        'ቲማቲም': 'tomato',
        'ድንች': 'potato',
        'ካሮት': 'carrot',
        
        // Cooking verbs
        'ቀላቀል': 'mix',
        'ማብሰል': 'cook',
        'ማፍላት': 'boil',
        'ማጠፍ': 'grill',
        'ማቅረብ': 'serve',
        'ጨምር': 'add',
        'ቁረጥ': 'cut',
        'ለጣጥል': 'peel',
        
        // Instructions
        'መጀመሪያ': 'first',
        'ከዚያ': 'then',
        'ቀጥሎ': 'next',
        'ከዚያ በኋላ': 'after',
        'በመጨረሻ': 'finally',
        'አሁን': 'now',
        'እስከ': 'until',
        'ወደ': 'about',
        'ደቂቃዎች': 'minutes',
        'ሰዓት': 'hour',
        'ሰዓቶች': 'hours'
      }
    };

    const mapKey = targetLanguage === 'am' ? 'en-am' : 'am-en';
    const map = wordMap[mapKey];
    let translated = text;

    // Replace words while preserving case
    Object.keys(map).forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      translated = translated.replace(regex, (match) => {
        // Preserve case: if original was capitalized, capitalize translation
        if (match[0] === match[0].toUpperCase()) {
          return map[word].charAt(0).toUpperCase() + map[word].slice(1);
        }
        return map[word];
      });
    });

    return translated !== text ? translated : null;
  }

  static async translateRecipe(recipeData, sourceLanguage) {
    const targetLanguage = sourceLanguage === 'en' ? 'am' : 'en';
    const translatedData = JSON.parse(JSON.stringify(recipeData));

    console.log(`Starting recipe translation from ${sourceLanguage} to ${targetLanguage}`);

    try {
      // Translate title
      if (recipeData.title && recipeData.title[sourceLanguage]) {
        console.log('Translating title...');
        translatedData.title[targetLanguage] = await this.translateText(
          recipeData.title[sourceLanguage], 
          targetLanguage
        );
      }

      // Translate description
      if (recipeData.description && recipeData.description[sourceLanguage]) {
        console.log('Translating description...');
        translatedData.description[targetLanguage] = await this.translateText(
          recipeData.description[sourceLanguage], 
          targetLanguage
        );
      }

      // Translate ingredients - handle line by line for better accuracy
      if (recipeData.ingredients && recipeData.ingredients[sourceLanguage]) {
        console.log('Translating ingredients...');
        const ingredientsText = recipeData.ingredients[sourceLanguage];
        
        if (ingredientsText.includes('\n')) {
          const lines = ingredientsText.split('\n').filter(line => line.trim());
          const translatedLines = await Promise.all(
            lines.map(async (line) => {
              const translatedLine = await this.translateText(line.trim(), targetLanguage);
              return translatedLine || line.trim(); // Fallback to original if translation fails
            })
          );
          translatedData.ingredients[targetLanguage] = translatedLines.join('\n');
        } else {
          translatedData.ingredients[targetLanguage] = await this.translateText(
            ingredientsText, 
            targetLanguage
          );
        }
      }

      // Translate steps - handle line by line
      if (recipeData.steps && recipeData.steps[sourceLanguage]) {
        console.log('Translating steps...');
        const stepsText = recipeData.steps[sourceLanguage];
        
        if (stepsText.includes('\n')) {
          const lines = stepsText.split('\n').filter(line => line.trim());
          const translatedLines = await Promise.all(
            lines.map(async (line, index) => {
              // Add step numbers if they're missing
              const stepText = line.replace(/^\d+\.?\s*/, ''); // Remove existing numbers
              const translatedStep = await this.translateText(stepText.trim(), targetLanguage);
              return `${index + 1}. ${translatedStep || stepText.trim()}`;
            })
          );
          translatedData.steps[targetLanguage] = translatedLines.join('\n');
        } else {
          translatedData.steps[targetLanguage] = await this.translateText(
            stepsText, 
            targetLanguage
          );
        }
      }

      // Handle category translation using predefined categories
      if (recipeData.category && recipeData.category[sourceLanguage]) {
        console.log('Translating category...');
        const categoryText = recipeData.category[sourceLanguage];
        
        // Find matching category
        const predefinedCategory = CATEGORIES.find(
          cat => cat[sourceLanguage].toLowerCase() === categoryText.toLowerCase() ||
                 (cat.en && cat.en.toLowerCase() === categoryText.toLowerCase()) ||
                 (cat.am && cat.am === categoryText)
        );
        
        if (predefinedCategory) {
          translatedData.category[targetLanguage] = predefinedCategory[targetLanguage];
        } else {
          // If not found in predefined, try to translate
          translatedData.category[targetLanguage] = await this.translateText(
            categoryText, 
            targetLanguage
          );
        }
      }

      console.log('Recipe translation completed successfully');
      return {
        ...translatedData,
        autoTranslated: true,
        translationError: false
      };

    } catch (error) {
      console.error('Recipe translation failed:', error);
      // Return partial translation with error flag
      return {
        ...translatedData,
        autoTranslated: false,
        translationError: true
      };
    }
  }
}

export default function AddRecipeScreen({ navigation }) {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [videoURL, setVideoURL] = useState("");
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [userData, setUserData] = useState(null);
  
  // UI state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [inputLanguage, setInputLanguage] = useState("en");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogIcon, setDialogIcon] = useState("alert-circle-outline");

  const { locale, t } = useLanguage();
  const { colors, isDarkMode } = useTheme(); // Theme hook

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const showCustomDialog = (title, message, icon = "alert-circle-outline") => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogIcon(icon);
    setShowDialog(true);
  };

  const LanguageSelector = () => {
    const targetLanguageName = inputLanguage === 'en' 
      ? t('addRecipe.languageSelector.amharic') 
      : t('addRecipe.languageSelector.english');

    return (
      <View style={[styles.languageSection, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addRecipe.languageSelector.title')}</Text>
        <View style={[styles.languageSwitcher, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.languageTab,
              inputLanguage === 'en' && [styles.activeLanguageTab, { backgroundColor: colors.card }]
            ]}
            onPress={() => setInputLanguage('en')}
          >
            <Ionicons 
              name={inputLanguage === 'en' ? "checkmark-circle" : "ellipse-outline"} 
              size={20} 
              color={inputLanguage === 'en' ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.languageText,
              { color: colors.textSecondary },
              inputLanguage === 'en' && [styles.activeLanguageText, { color: colors.primary }]
            ]}>
              {t('addRecipe.languageSelector.english')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.languageTab,
              inputLanguage === 'am' && [styles.activeLanguageTab, { backgroundColor: colors.card }]
            ]}
            onPress={() => setInputLanguage('am')}
          >
            <Ionicons 
              name={inputLanguage === 'am' ? "checkmark-circle" : "ellipse-outline"} 
              size={20} 
              color={inputLanguage === 'am' ? colors.primary : colors.textSecondary} 
            />
            <Text style={[
              styles.languageText,
              { color: colors.textSecondary },
              inputLanguage === 'am' && [styles.activeLanguageText, { color: colors.primary }]
            ]}>
              {t('addRecipe.languageSelector.amharic')}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.languageHint, { color: colors.textSecondary }]}>
          {t('addRecipe.languageSelector.hint').replace('{language}', targetLanguageName)}
        </Text>
      </View>
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showCustomDialog(
        t('addRecipe.errors.permissionTitle'),
        t('addRecipe.errors.permissionMessage'),
        "camera-outline"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets?.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategory(inputLanguage === 'en' ? selectedCategory.en : selectedCategory.am);
    setShowCategoryModal(false);
  };

  const getCurrentPlaceholders = () => {
    if (inputLanguage === 'en') {
      return {
        title: t('addRecipe.placeholders.title'),
        description: t('addRecipe.placeholders.description'),
        ingredients: t('addRecipe.placeholders.ingredients'),
        steps: t('addRecipe.placeholders.steps'),
        category: t('addRecipe.placeholders.category'),
        videoURL: t('addRecipe.placeholders.videoURL')
      };
    } else {
      return {
        title: t('addRecipe.placeholdersAmharic.title'),
        description: t('addRecipe.placeholdersAmharic.description'),
        ingredients: t('addRecipe.placeholdersAmharic.ingredients'),
        steps: t('addRecipe.placeholdersAmharic.steps'),
        category: t('addRecipe.placeholdersAmharic.category'),
        videoURL: t('addRecipe.placeholdersAmharic.videoURL')
      };
    }
  };

  const validateForm = () => {
    if (!image) {
      showCustomDialog(
        t('addRecipe.errors.missingImageTitle'),
        t('addRecipe.errors.missingImageMessage'),
        "image-outline"
      );
      return false;
    }
    
    if (!title.trim()) {
      showCustomDialog(
        t('addRecipe.errors.missingTitleTitle'),
        t('addRecipe.errors.missingTitleMessage'),
        "document-outline"
      );
      return false;
    }

    if (!category.trim()) {
      showCustomDialog(
        t('addRecipe.errors.missingCategoryTitle'),
        t('addRecipe.errors.missingCategoryMessage'),
        "pricetags-outline"
      );
      return false;
    }

    if (!ingredients.trim()) {
      showCustomDialog(
        t('addRecipe.errors.missingIngredientsTitle'),
        t('addRecipe.errors.missingIngredientsMessage'),
        "list-outline"
      );
      return false;
    }

    if (!steps.trim()) {
      showCustomDialog(
        t('addRecipe.errors.missingStepsTitle'),
        t('addRecipe.errors.missingStepsMessage'),
        "create-outline"
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setUploading(true);
      setTranslating(true);
      const user = auth.currentUser;
      
      if (!user) {
        showCustomDialog(
          t('addRecipe.errors.authTitle'),
          t('addRecipe.errors.authMessage'),
          "log-in-outline"
        );
        return;
      }

      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Prepare initial recipe data in the input language
      const initialRecipeData = {
        title: {
          [inputLanguage]: title.trim(),
        },
        description: {
          [inputLanguage]: description.trim(),
        },
        category: {
          [inputLanguage]: category.trim(),
        },
        ingredients: {
          [inputLanguage]: ingredients.trim(),
        },
        steps: {
          [inputLanguage]: steps.trim(),
        },
        
        // Single language fields
        imageBase64: base64,
        hasImage: true,
        videoURL: videoURL.trim(),
        authorId: user.uid,
        authorEmail: user.email,
        authorName: userData?.name || user.email.split('@')[0],
        approved: false,
        createdAt: serverTimestamp(),
        originalLanguage: inputLanguage,
        autoTranslated: false,
        translationError: false
      };

      console.log('Starting auto-translation process...');
      
      // Perform auto-translation to the other language
      const translatedRecipeData = await TranslationService.translateRecipe(
        initialRecipeData, 
        inputLanguage
      );

      setTranslating(false);
      console.log('Translation process completed');

      // Save the fully translated recipe to Firestore
      const docRef = await addDoc(collection(db, "recipes"), translatedRecipeData);
      
      const targetLanguageName = inputLanguage === 'en' 
        ? t('addRecipe.languageSelector.amharic') 
        : t('addRecipe.languageSelector.english');

      // Prepare success message based on translation result
      let successMessage;
      if (translatedRecipeData.autoTranslated) {
        successMessage = t('addRecipe.success.translationSuccess').replace('{language}', targetLanguageName);
      } else {
        successMessage = t('addRecipe.success.translationPartial').replace('{language}', targetLanguageName);
      }

      // Notify user
      try {
        await NotificationService.notifyCurrentUser(
          t('addRecipe.success.notificationTitle'),
          successMessage,
          { type: 'recipe_submitted', recipeTitle: title.trim() }
        );
      } catch (notifyError) {
        console.error('Error notifying user:', notifyError);
      }

      showCustomDialog(
        t('addRecipe.success.dialogTitle'),
        successMessage,
        translatedRecipeData.autoTranslated ? "checkmark-circle" : "information-circle"
      );
      
      // Navigate back after success
      setTimeout(() => {
        navigation.goBack();
      }, 3000);
      
    } catch (err) {
      setTranslating(false);
      console.log("Error uploading recipe:", err);
      showCustomDialog(
        t('addRecipe.errors.uploadTitle'),
        err.message || t('addRecipe.errors.uploadMessage'),
        "close-circle"
      );
    } finally {
      setUploading(false);
    }
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        { borderBottomColor: colors.border },
        category === (inputLanguage === 'en' ? item.en : item.am) && [styles.categoryItemSelected, { backgroundColor: isDarkMode ? 'rgba(243, 125, 28, 0.1)' : '#fef8f4' }]
      ]}
      onPress={() => handleCategorySelect(item)}
    >
      <Text style={[
        styles.categoryText,
        { color: colors.text },
        category === (inputLanguage === 'en' ? item.en : item.am) && [styles.categoryTextSelected, { color: colors.primary }]
      ]}>
        {inputLanguage === 'en' ? item.en : item.am}
      </Text>
      {category === (inputLanguage === 'en' ? item.en : item.am) && (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  const placeholders = getCurrentPlaceholders();

  const AutoTranslationInfo = () => {
    const targetLanguageName = inputLanguage === 'en' 
      ? t('addRecipe.languageSelector.amharic') 
      : t('addRecipe.languageSelector.english');

    return (
      <View style={[styles.translationInfo, { 
        backgroundColor: isDarkMode ? 'rgba(243, 125, 28, 0.1)' : '#f0f7ff',
        borderLeftColor: colors.primary 
      }]}>
        <Ionicons name="language" size={24} color={colors.primary} />
        <View style={styles.translationText}>
          <Text style={[styles.translationTitle, { color: colors.text }]}>{t('addRecipe.autoTranslation.title')}</Text>
          <Text style={[styles.translationDescription, { color: colors.textSecondary }]}>
            {t('addRecipe.autoTranslation.description').replace('{language}', targetLanguageName)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient 
        colors={[colors.primary, '#ff9d4d']} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addRecipe.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selector */}
        <LanguageSelector />

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Image Upload Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addRecipe.sections.image')}</Text>
            
            {image ? (
              <View style={styles.imageSelectedContainer}>
                <Image source={{ uri: image }} style={styles.imagePreview} />
                <TouchableOpacity 
                  style={styles.changePhotoButton}
                  onPress={pickImage}
                >
                  <LinearGradient 
                    colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0.5)"]}
                    style={styles.changePhotoGradient}
                  >
                    <Ionicons name="camera" size={20} color="#fff" />
                    <Text style={styles.changePhotoText}>{t('addRecipe.changePhoto')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                <View style={[styles.imagePlaceholder, { 
                  borderColor: colors.primary,
                  backgroundColor: isDarkMode ? 'rgba(243, 125, 28, 0.1)' : '#fef8f4'
                }]}>
                  <Ionicons name="camera-outline" size={40} color={colors.primary} />
                  <Text style={[styles.imagePlaceholderText, { color: colors.primary }]}>{t('addRecipe.uploadPhoto')}</Text>
                  <Text style={[styles.imagePlaceholderSubtext, { color: colors.textSecondary }]}>{t('addRecipe.photoRequirements')}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Basic Info Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addRecipe.sections.basicInfo')}</Text>
            
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <Ionicons name="restaurant-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={placeholders.title}
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Description */}
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={placeholders.description}
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* Category Selector */}
            <TouchableOpacity 
              style={[styles.categorySelector, { 
                backgroundColor: colors.background, 
                borderColor: colors.border 
              }]}
              onPress={() => setShowCategoryModal(true)}
            >
              <View style={styles.categorySelectorContent}>
                <Ionicons name="pricetags-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <View style={styles.categorySelectorText}>
                  <Text style={[
                    category ? [styles.categorySelected, { color: colors.text }] : [styles.categoryPlaceholder, { color: colors.textSecondary }]
                  ]}>
                    {category || placeholders.category}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Ingredients Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addRecipe.sections.ingredients')}</Text>
            <View style={[styles.textAreaContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <Ionicons name="list-outline" size={20} color={colors.textSecondary} style={styles.textAreaIcon} />
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder={placeholders.ingredients}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={ingredients}
                onChangeText={setIngredients}
              />
            </View>
          </View>

          {/* Steps Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addRecipe.sections.steps')}</Text>
            <View style={[styles.textAreaContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <Ionicons name="create-outline" size={20} color={colors.textSecondary} style={styles.textAreaIcon} />
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder={placeholders.steps}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                value={steps}
                onChangeText={setSteps}
              />
            </View>
          </View>

          {/* Video Section */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('addRecipe.sections.video')}</Text>
            <View style={[styles.inputContainer, { 
              backgroundColor: colors.background, 
              borderColor: colors.border 
            }]}>
              <Ionicons name="logo-youtube" size={20} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={placeholders.videoURL}
                placeholderTextColor={colors.textSecondary}
                value={videoURL}
                onChangeText={setVideoURL}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Auto-translation Info */}
          <AutoTranslationInfo />

          {/* Submit Button */}
          <View style={styles.submitSection}>
            {(uploading || translating) ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.uploadingText, { color: colors.text }]}>
                  {translating ? t('addRecipe.translating') : t('addRecipe.submitting')}
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  (!image || !title || !category || !ingredients || !steps) && styles.submitButtonDisabled
                ]} 
                onPress={handleSubmit}
                disabled={!image || !title || !category || !ingredients || !steps || uploading}
              >
                <LinearGradient 
                  colors={[colors.primary, '#ff9d4d']}
                  style={styles.submitGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
                  <Text style={styles.submitButtonText}>{t('addRecipe.submitButton')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              {t('addRecipe.note')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('addRecipe.categoryModal.title')}</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCategoryModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={CATEGORIES}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.en}
              showsVerticalScrollIndicator={false}
              style={styles.categoryList}
            />
          </View>
        </View>
      </Modal>

      {/* Custom Dialog */}
      <CustomDialog
        visible={showDialog}
        title={dialogTitle}
        message={dialogMessage}
        icon={dialogIcon}
        onClose={() => setShowDialog(false)}
      />
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
    paddingTop: 30,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  headerPlaceholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  languageSection: {
    borderRadius: 16,
    padding: 20,
    margin: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  languageSwitcher: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  languageTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeLanguageTab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  languageText: {
    fontSize: 16,
    fontWeight: "500",
  },
  activeLanguageText: {
    fontWeight: "600",
  },
  languageHint: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
    fontStyle: "italic",
  },
  formContainer: {
    padding: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  imageSelectedContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  changePhotoButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  changePhotoGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  changePhotoText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  imagePicker: {
    alignItems: "center",
  },
  imagePlaceholder: {
    width: "100%",
    height: 200,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  imagePlaceholderSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
    fontSize: 16,
  },
  categorySelector: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  categorySelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  categorySelectorText: {
    flex: 1,
    marginLeft: 4,
  },
  categoryPlaceholder: {
    fontSize: 16,
  },
  categorySelected: {
    fontSize: 16,
    fontWeight: "500",
  },
  textAreaContainer: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
  },
  textAreaIcon: {
    padding: 12,
    paddingTop: 16,
  },
  textArea: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 12,
    fontSize: 16,
    minHeight: 120,
  },
  translationInfo: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  translationText: {
    flex: 1,
    marginLeft: 12,
  },
  translationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  translationDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalCloseButton: {
    padding: 4,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  categoryItemSelected: {
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 16,
  },
  categoryTextSelected: {
    fontWeight: "600",
  },
  submitSection: {
    alignItems: "center",
    marginTop: 8,
  },
  submitButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#f37d1c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
  },
  uploadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  uploadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  noteText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});