// context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import { firebase } from '../firebaseConfig'; // Ensure Firebase is correctly initialized
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../api/axiosInstance'; // Ensure the path is correct
import { Alert } from 'react-native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To handle loading state

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          // Listen for authentication state changes
          const unsubscribe = firebase.auth().onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
              setUser(firebaseUser);
              // Optionally, refresh the token if necessary
              const idToken = await firebaseUser.getIdToken(true);
              await SecureStore.setItemAsync('userToken', idToken); // Update stored token
            } else {
              await SecureStore.deleteItemAsync('userToken');
              setUser(null);
            }
            setLoading(false);
          });
          // Cleanup subscription on unmount
          return () => unsubscribe();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function using Firebase Auth
  const login = async (email, password) => {
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      const idToken = await firebaseUser.getIdToken(true); // Force refresh to get the latest token
      setUser(firebaseUser);
      await SecureStore.setItemAsync('userToken', idToken); // Securely store the token
    } catch (error) {
      throw error; // Let the calling function handle the error
    }
  };

  // Signup function using Firebase Auth and then backend /signup
  const signup = async (email, password, name, age, bio) => {
    try {
      // Create user with Firebase Auth
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;

      // Get the ID token
      const idToken = await firebaseUser.getIdToken(true);

      // Call backend /signup to create additional user data
      await axiosInstance.post('/signup', {
        name,
        age,
        bio,
      }, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      setUser(firebaseUser);
      await SecureStore.setItemAsync('userToken', idToken); // Securely store the token
    } catch (error) {
      throw error; // Let the calling function handle the error
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await firebase.auth().signOut();
      setUser(null);
      await SecureStore.deleteItemAsync('userToken');
    } catch (error) {
      throw error; // Let the calling function handle the error
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
