// api/axiosInstance.js

import axios from 'axios';
import { Alert } from 'react-native';
import eventEmitter from '../eventEmitter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: "http://192.168.1.162:3000", // Ensure this matches SERVER_BASE_URL in .env
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Authorization header
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken'); // Ensure the key matches where you stored the token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
              eventEmitter.emit('logout'); // Emit logout event
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
