import React, { createContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { auth } from '../firebaseConfig';
import * as SecureStore from 'expo-secure-store';
import axiosInstance from '../api/axiosInstance';

// Create AuthContext
export const AuthContext = createContext();

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load token from SecureStore when app starts
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
          setUserToken(token);
          axiosInstance.defaults.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Error loading token:', error);
      } finally {
        setLoading(false);
      }
    };

    loadToken();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await axiosInstance.post('/login', { email, password });
      const { token } = response.data;

      if (token) {
        await SecureStore.setItemAsync('userToken', token);
        setUserToken(token);
        axiosInstance.defaults.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.response?.data?.error || 'An error occurred during login.');
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      setUserToken(null);
      delete axiosInstance.defaults.headers.Authorization;
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Failed', 'An error occurred during logout.');
    }
  };

  return (
    <AuthContext.Provider value={{ userToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};