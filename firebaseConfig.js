// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Import Firebase Auth

const firebaseConfig = {
  apiKey: 'AIzaSyDvp-58BF6W92fTQ9fYOBpdKRhCY4qO-AQ',
  authDomain: 'cltmeet-6bbce.firebaseapp.com',
  projectId: 'cltmeet-6bbce',
  storageBucket: 'cltmeet-6bbce.appspot.com',
  messagingSenderId: '302424451390',
  appId: '1:302424451390:web:8f0ed794f55f0de0ed646f',
  measurementId: 'G-BJC9D4LFRE',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

export { db, auth };