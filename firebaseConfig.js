// firebaseConfig.js
// firebaseConfig.js - UPDATED WITH PERSISTENCE
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from "firebase/firestore";



const firebaseConfig = {


   apiKey: "AIzaSyAgC9C1yq1QuhV8EcdqWqsUY42YJkRYyPA",
  authDomain: "ethiopianrecipeapp.firebaseapp.com",
  projectId: "ethiopianrecipeapp",
  storageBucket: "ethiopianrecipeapp.firebasestorage.app",
  messagingSenderId: "180928055099",
  appId: "1:180928055099:web:a1e51b1910815cf1ac991e",
  measurementId: "G-ZE92J0DHVN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);