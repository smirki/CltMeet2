// firebaseConfig.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth'; // Import Firebase Auth if you're using authentication
import 'firebase/compat/firestore'; // Import Firestore if you're using Firestore
import 'firebase/compat/storage'; // Import Firebase Storage if you're using storage features

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDvp-58BF6W92fTQ9fYOBpdKRhCY4qO-AQ',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'cltmeet-6bbce.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'cltmeet-6bbce',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'cltmeet-6bbce.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '302424451390',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:302424451390:web:8f0ed794f55f0de0ed646f',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-BJC9D4LFRE',
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

export { firebase, db };
