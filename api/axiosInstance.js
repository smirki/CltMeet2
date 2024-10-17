// api/axiosInstance.js
import axios from 'axios';
import { Alert } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import React from 'react';

const backend_url = process.env.REACT_APP_SERVER_BASE_URL;

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: `${backend_url}`, // Ensure this matches SERVER_BASE_URL in .env
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please log in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // You can implement a global logout mechanism here if needed
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