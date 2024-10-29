// screens/SignUpScreen.js

import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import { AuthContext } from '../context/AuthContext';
import { Image } from 'expo-image';

// Get device dimensions for responsive design
const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ navigation }) {
  const { signup } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');

  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false); // State to track if user has started typing

  // Animated values
  const modalY = useRef(new Animated.Value(height / 2)).current; // Start at center
  const textOpacity = useRef(new Animated.Value(1)).current; // Text initially visible
  const bgScrollAnim = useRef(new Animated.Value(0)).current; // For background scrolling

  // Refs for inputs
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const ageInputRef = useRef(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      _keyboardDidShow,
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      _keyboardDidHide,
    );

    // Start background scrolling animation
    Animated.loop(
      Animated.timing(bgScrollAnim, {
        toValue: -width, // Scroll to the left
        duration: 30000, // 30 seconds for a full scroll
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [bgScrollAnim]);

  const _keyboardDidShow = () => {
    Animated.parallel([
      Animated.timing(modalY, {
        toValue: height * 0.05, // Move modal up
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(textOpacity, {
        toValue: 0, // Fade out text
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const _keyboardDidHide = () => {
    Animated.parallel([
      Animated.timing(modalY, {
        toValue: height / 2, // Center modal
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(textOpacity, {
        toValue: 1, // Fade in text
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleSignUp = async () => {
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
  };

  const handleBack = () => {
    // Revert to initial state
    setIsTyping(false);
    setName('');
    setEmail('');
    setPassword('');
    setAge('');
    Animated.parallel([
      Animated.timing(modalY, {
        toValue: height / 2, // Center modal
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(textOpacity, {
        toValue: 1, // Fade in text
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
    Keyboard.dismiss();
  };

  const handleInputFocus = () => {
    if (!isTyping) {
      setIsTyping(true);
      Animated.parallel([
        Animated.timing(modalY, {
          toValue: height * 0.5, // Move modal up
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(textOpacity, {
          toValue: 0, // Fade out text
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.select({ ios: 0, android: 20 })}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.innerContainer}>
          {/* Rotating (Scrolling) Background Image */}
          <Animated.Image
            source={require('../assets/login-bg.jpg')} // You can use the same background or a different one
            style={[
              styles.backgroundImage,
              {
                transform: [{ translateX: bgScrollAnim }],
              },
            ]}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['rgba(19,26,35,0.1)', 'rgba(19,26,35,.8)']}
            style={styles.gradientOverlay}
          />

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo-transparent.png')}
              style={styles.logo}
              resizeMode="contain"
              accessible={true}
              accessibilityLabel="CltMeet Logo"
            />
          </View>

          {/* Main Text */}
          <Animated.View style={[styles.textContainer, { opacity: textOpacity }]}>
            <Text style={styles.title}>Join us and connect with others</Text>
          </Animated.View>

          {/* Sign Up Modal */}
          <Animated.View style={[styles.modal, { top: modalY }]}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Back Arrow (visible when isTyping is true) */}
            {isTyping && (
              <TouchableOpacity
                style={styles.backArrow}
                onPress={handleBack}
                accessibilityLabel="Back Button"
                accessibilityHint="Go back to previous screen"
              >
                <Icon name="arrow-left" size={20} color="#F48278" />
              </TouchableOpacity>
            )}

            {/* Name Input */}
            <TextInput
              placeholder="Name"
              value={name}
              onChangeText={(text) => setName(text)}
              style={styles.input}
              autoCapitalize="words"
              accessibilityLabel="Name Input"
              accessibilityHint="Enter your full name"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current.focus()}
              blurOnSubmit={false}
              placeholderTextColor="#ccc"
              onFocus={handleInputFocus}
            />

            {/* Email Input */}
            {isTyping && (
              <TextInput
                ref={emailInputRef}
                placeholder="Email"
                value={email}
                onChangeText={(text) => setEmail(text)}
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                accessibilityLabel="Email Input"
                accessibilityHint="Enter your email address"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current.focus()}
                blurOnSubmit={false}
                placeholderTextColor="#ccc"
              />
            )}

            {/* Password Input */}
            {isTyping && (
              <TextInput
                ref={passwordInputRef}
                placeholder="Password"
                value={password}
                onChangeText={(text) => setPassword(text)}
                style={styles.input}
                secureTextEntry
                accessibilityLabel="Password Input"
                accessibilityHint="Enter your password"
                returnKeyType="next"
                onSubmitEditing={() => ageInputRef.current.focus()}
                blurOnSubmit={false}
                placeholderTextColor="#ccc"
              />
            )}

            {/* Age Input */}
            {isTyping && (
              <TextInput
                ref={ageInputRef}
                placeholder="Age"
                value={age}
                onChangeText={(text) => setAge(text)}
                style={styles.input}
                keyboardType="numeric"
                accessibilityLabel="Age Input"
                accessibilityHint="Enter your age"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
                placeholderTextColor="#ccc"
              />
            )}

            {/* Sign Up Button (visible when isTyping is true) */}
            {isTyping && (
              <TouchableOpacity
                style={styles.loginButton} // Reusing loginButton style for consistency
                onPress={handleSignUp}
                accessibilityLabel="Sign Up Button"
                accessibilityHint="Tap to create your account"
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Sign Up</Text>
              </TouchableOpacity>
            )}

            {/* Back to Login Link (visible when not typing) */}
            {!isTyping && (
              <TouchableOpacity
                style={styles.signUpLink}
                onPress={() => navigation.navigate('Login')}
                accessibilityLabel="Back to Login Link"
                accessibilityHint="Navigate to login screen"
              >
                <Text style={styles.linkText}>Already have an account? Log In</Text>
              </TouchableOpacity>
            )}

            {/* Or Continue With (visible when not typing) */}
            {!isTyping && (
              <View style={styles.orContainer}>
                <View style={styles.line} />
                <Text style={styles.orText}>Or continue with</Text>
                <View style={styles.line} />
              </View>
            )}

            {/* Social Login Buttons (visible when not typing) */}
            {!isTyping && (
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Apple Signup', 'Continue with Apple')}
                  accessibilityLabel="Continue with Apple"
                  accessibilityHint="Tap to sign up with Apple"
                >
                  <Icon name="apple" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Google Signup', 'Continue with Google')}
                  accessibilityLabel="Continue with Google"
                  accessibilityHint="Tap to sign up with Google"
                >
                  <Icon name="google" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => Alert.alert('Facebook Signup', 'Continue with Facebook')}
                  accessibilityLabel="Continue with Facebook"
                  accessibilityHint="Tap to sign up with Facebook"
                >
                  <Icon name="facebook" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Terms and Privacy Policy (visible when not typing) */}
            {!isTyping && (
              <Text style={styles.termsText}>
                By signing up, you agree to CLTMeet's{' '}
                <Text
                  style={styles.linkTerms}
                  onPress={() => Alert.alert('Terms of Use', 'Navigate to Terms of Use')}
                >
                  Terms of Use
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.linkTerms}
                  onPress={() => Alert.alert('Privacy Policy', 'Navigate to Privacy Policy')}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            )}
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131A23',
  },
  innerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    width: width * 2, // Make it wider for seamless scrolling
    height: height * 1.5,
    top: -height * 0.25,
    left: 0,
  },
  gradientOverlay: {
    position: 'absolute',
    width: width,
    height: height,
    top: 0,
    left: 0,
  },
  logoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
    zIndex: 10, // Ensure logo is on top
  },
  logo: {
    width: 180, // Small size
    height: 80,
  },
  textContainer: {
    marginTop: height * 0.3,
    paddingHorizontal: 20,
    alignItems: 'flex-start', // Left aligned
    opacity: 1,
    zIndex: 1,
    width: width * 0.8, // To align text properly
  },
  title: {
    fontSize: 28, // Larger font
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'left', // Left aligned
  },
  modal: {
    position: 'absolute',
    width: width * 0.9,
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#1E2A38',
    borderRadius: 20,
    // Removed shadow properties
    zIndex: 2,
  },
  backArrow: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 5,
  },
  input: {
    height: 50,
    backgroundColor: '#2E3A4F',
    borderRadius: 15, // Rounded rectangular
    paddingHorizontal: 20,
    paddingVertical: 10, // Increased padding
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2E3A4F', // Same as background initially
    marginBottom: 15,
  },
  inputFocused: {
    borderColor: '#F48278', // Accent color on focus
    borderWidth: 2, // Thicker border on focus
  },
  loginButton: {
    backgroundColor: '#F48278',
    paddingVertical: 15,
    borderRadius: 15, // Consistent with input fields
    alignItems: 'center',
    marginTop: 10,
    // Removed shadow properties
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signUpLink: {
    marginTop: 15,
    alignItems: 'center',
  },
  linkText: {
    color: '#F48278',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ccc',
  },
  orText: {
    marginHorizontal: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  socialButton: {
    width: 50,
    height: 50,
    backgroundColor: '#2E3A4F',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  termsText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkTerms: {
    color: '#F48278',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#D8000C',
    backgroundColor: '#FFBABA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 14,
    textAlign: 'center',
    width: '100%',
  },
});
