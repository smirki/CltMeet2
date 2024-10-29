// api/axiosInstance.js

import axios from 'axios';
import { firebase } from '../firebaseConfig'; // Ensure firebase is correctly initialized
import { Alert } from 'react-native';

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000', // Replace with your backend API URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase ID Token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const user = firebase.auth().currentUser;
      if (user) {
        const idToken = await user.getIdToken(true); // Force refresh to get the latest token
        config.headers.Authorization = `Bearer ${idToken}`;
      }
    } catch (error) {
      console.error('Error fetching ID token for request:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              firebase.auth().signOut(); // Sign out the user
            },
          },
        ],
        { cancelable: false }
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
