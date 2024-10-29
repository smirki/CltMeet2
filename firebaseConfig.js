// firebaseConfig.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth'; // Import Firebase Auth if you're using authentication
import 'firebase/compat/firestore'; // Import Firestore if you're using Firestore
import 'firebase/compat/storage'; // Import Firebase Storage if you're using storage features

const firebaseConfig = {
  apiKey: "AIzaSyCs-s7oTJni9DdufXjIRjTENVqRbWWDsto",
  authDomain: "cltmeet-manavdev.firebaseapp.com",
  projectId: "cltmeet-manavdev",
  storageBucket: "cltmeet-manavdev.appspot.com",
  messagingSenderId: "733149583772",
  appId: "1:733149583772:web:c8e61f3d7f59b6d8e91059"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

export { firebase, db };
