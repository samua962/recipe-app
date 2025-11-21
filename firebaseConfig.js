// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = getFirestore(app);
