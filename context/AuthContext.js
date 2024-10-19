// context/AuthContext.js

import React, { createContext, useState, useEffect } from 'react';
import { firebase } from '../firebaseConfig'; // Ensure firebase is correctly initialized
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../api/axiosInstance'; // Ensure the path is correct
import { Alert } from 'react-native';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // To handle loading state

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken(true); // Force refresh to get the latest token
          setUser(firebaseUser);
          await SecureStore.setItemAsync('userToken', idToken); // Securely store the token
        } catch (error) {
          console.error('Error fetching ID token:', error);
          Alert.alert('Authentication Error', 'Failed to retrieve authentication token.');
        }
      } else {
        setUser(null);
        await SecureStore.deleteItemAsync('userToken'); // Delete token securely
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Login function using Firebase Auth
  const login = async (email, password) => {
    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
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

      // Optionally, you can set the user state here or rely on onAuthStateChanged
      setUser(firebaseUser);
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
