// screens/LoginScreen.js

import React, { useState, useContext } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false); // To control bottom sheet

  const handleLogin = async () => {
    try {
      const response = await axiosInstance.post('/login', { email, password });
      const { token } = response.data;
      await login(token); // Store the token in AuthContext and AsyncStorage
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (

    <View style={styles.container}>

      <Text style={styles.title}>CltMeet2 Login</Text>

      <TextInput

        placeholder="Email"

        value={email}

        onChangeText={setEmail}

        style={styles.input}

        autoCapitalize="none"

        keyboardType="email-address"

      />

      <TextInput

        placeholder="Password"

        value={password}

        onChangeText={setPassword}

        style={styles.input}

        secureTextEntry

      />

      <Button title="Login" onPress={handleLogin} />

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>

        <Text style={styles.link}>Don't have an account? Sign Up</Text>

      </TouchableOpacity>

      <View style={styles.separator} />

      <Button title="Clear Storage" color="#FF3B30" />

    </View>

  );

};



const styles = StyleSheet.create({

  container: {

    flex: 1,

    padding: 20,

    backgroundColor: '#fff',

    justifyContent: 'center',

  },

  loaderContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

  },

  title: {

    fontSize: 28,

    marginBottom: 30,

    textAlign: 'center',

    fontWeight: 'bold',

    color: '#FF3B30',

  },

  input: {

    height: 50,

    borderColor: '#ccc',

    borderWidth: 1,

    marginBottom: 15,

    paddingHorizontal: 15,

    borderRadius: 8,

  },

  link: {

    color: '#1E90FF',

    marginTop: 15,

    textAlign: 'center',

    fontSize: 16,

  },

  separator: {

    height: 20,

  },

});



export default LoginScreen;