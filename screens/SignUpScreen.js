import React, { useState } from 'react';
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
} from 'react-native';
import axios from 'axios';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const buttonScale = new Animated.Value(1); // For button animation

  const handleSignUp = async () => {
    try {
      await axios.post('http://192.168.1.143:3000/signup', {
        email,
        password,
        age,
        bio,
      });
      Alert.alert('Success', 'Account created successfully');
      navigation.goBack();
    } catch (err) {
      setError(err.response ? err.response.data.error : 'An error occurred');
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
      <View style={styles.inner}>
        <Text style={styles.headerText}>Create Account</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 30,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6347',
    marginBottom: 40,
    fontFamily: 'Recoleta', // Unique font
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
    marginTop: 20,
  },
  backText: {
    color: '#007aff',
    fontSize: 16,
  },
});
