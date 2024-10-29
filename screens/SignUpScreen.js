import React, { useState, useContext, useRef, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';

// Get device dimensions for responsive design
const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ navigation }) {
  const { signup } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const buttonScale = useRef(new Animated.Value(1)).current;

  const handleSignUp = useCallback(async () => {
    // Basic validation
    if (!name || !email || !password || !age) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    // Age restriction
    if (parseInt(age) < 18) {
      Alert.alert('Age Restriction', 'You must be at least 18 years old to sign up.');
      return;
    }

    // Simple email regex for validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    // Password strength validation (minimum 6 characters)
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      await signup(email, password, name, age);
      Alert.alert('Success', 'Account created successfully');
      navigation.navigate('BioTagsScreen'); // Navigate to Bio & Tags screen after signup
    } catch (err) {
      setError(err.message);
      Alert.alert('Signup Error', err.message);
    }
  }, [name, email, password, age, signup, navigation]);

  const animateButton = useCallback(() => {
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
  }, [buttonScale]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
    >
      <ScrollView contentContainerStyle={styles.scrollView} keyboardShouldPersistTaps="handled">
        <Text style={styles.headerText}>Sign Up</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          style={styles.input}
          returnKeyType="next"
          onSubmitEditing={() => this.emailInput.focus()}
        />

        <TextInput
          ref={(input) => (this.emailInput = input)}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          returnKeyType="next"
          onSubmitEditing={() => this.passwordInput.focus()}
        />

        <TextInput
          ref={(input) => (this.passwordInput = input)}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          returnKeyType="next"
          onSubmitEditing={() => this.ageInput.focus()}
        />

        <TextInput
          ref={(input) => (this.ageInput = input)}
          placeholder="Age"
          value={age}
          onChangeText={setAge}
          keyboardType="numeric"
          style={styles.input}
          returnKeyType="done"
        />

        <Animated.View style={[styles.signUpButtonContainer, { transform: [{ scale: buttonScale }] }]}>
          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => {
              animateButton();
              handleSignUp();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Separate screen for Bio and Tags after login
export function BioTagsScreen({ navigation }) {
  const [bio, setBio] = useState('');
  const [tags, setTags] = useState('');

  const handleBioSubmit = () => {
    // Handle bio and tags submission here
    Alert.alert('Success', 'Welcome to the app!');
    navigation.navigate('Profile'); // Navigate to main app
  };

  return (
    <View style={styles.bioContainer}>
      <Text style={styles.headerText}>Complete Your Profile</Text>

      <TextInput
        placeholder="Bio"
        value={bio}
        onChangeText={setBio}
        style={[styles.input, styles.bioInput]}
        multiline
        numberOfLines={4}
      />

      <TextInput
        placeholder="Tags (separate by commas)"
        value={tags}
        onChangeText={setTags}
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.signUpButton}
        onPress={handleBioSubmit}
      >
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean, white background like Facebook
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1877F2', // Facebook blue color scheme
    marginBottom: 30,
    textAlign: 'center',
  },
  errorText: {
    color: '#D8000C',
    backgroundColor: '#FFBABA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: '#F0F2F5', // Light gray for input fields like Facebook
    borderRadius: 8,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 15,
  },
  signUpButtonContainer: {
    width: '100%',
    marginVertical: 20,
  },
  signUpButton: {
    paddingVertical: 15,
    backgroundColor: '#1877F2', // Facebook blue button
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
  },
  backButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  backText: {
    color: '#1877F2',
    fontSize: 16,
  },
  bioContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
  },
});
