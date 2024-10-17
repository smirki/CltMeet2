// App.js

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MatchesProvider } from './MatchesContext';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ProfileScreen from './screens/ProfileScreen';
import MainTabs from './screens/MainTabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';
import PaymentMethodScreen from './screens/AddPaymentMethodScreen';

const Stack = createNativeStackNavigator();

// Create a separate component to handle navigation based on auth state
const AppNavigator = () => {
  const { userToken, loading } = React.useContext(AuthContext);

  if (loading) {
    // Show a loading indicator while checking for token
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={userToken ? "Main" : "Login"}>
      {userToken ? (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: 'Profile' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ title: 'Sign Up' }}
          />
        </>
      )}
      <Stack.Screen
            name="Payments"
            component={PaymentMethodScreen}
            options={{ headerShown: false }}
          />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StripeProvider publishableKey="pk_test_51OfniJDtK57hwiI4CY9u4qzBlNrMLx4n86CmF7hSvmcDFwRJje8noHmnWaw8ESybJHZAXWQPvCBdq0Auu8Ey8lbP00fLL5NXkH">
          <NavigationContainer>
            <MatchesProvider>
              <AppNavigator />
            </MatchesProvider>
          </NavigationContainer>
        </StripeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
