// screens/SignUpScreen.js

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

export default function SignUpScreen({ navigation }) {
  const { signup } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState(''); // Added name state
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const buttonScale = new Animated.Value(1); // For button animation

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      await signup(email, password, name, age, bio);
      Alert.alert('Success', 'Account created successfully');
      navigation.navigate('Home'); // Navigate to Home or desired screen after signup
    } catch (err) {
      setError(err.message);
      Alert.alert('Signup Error', err.message);
    }
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.headerText}>Create Account</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          accessibilityLabel="Name Input"
          accessibilityHint="Enter your full name"
        />

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          accessibilityLabel="Email Input"
          accessibilityHint="Enter your email address"
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          accessibilityLabel="Password Input"
          accessibilityHint="Enter your password"
        />

        <TextInput
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={styles.input}
          accessibilityLabel="Age Input"
          accessibilityHint="Enter your age"
        />

        <TextInput
          placeholder="Bio"
          value={bio}
          onChangeText={setBio}
          style={styles.input}
          accessibilityLabel="Bio Input"
          accessibilityHint="Enter a short bio"
        />

        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => {
              animateButton();
              handleSignUp();
            }}
            accessibilityLabel="Sign Up Button"
            accessibilityHint="Tap to create your account"
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back Button"
          accessibilityHint="Go back to login screen"
        >
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6347',
    marginBottom: 30,
    fontFamily: 'Recoleta',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    fontSize: 14,
  },
  input: {
    width: '100%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  signUpButton: {
    width: '100%',
    paddingVertical: 15,
    backgroundColor: '#ff6347',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    marginTop: 10,
  },
  backText: {
    color: '#007aff',
    fontSize: 16,
  },
});
