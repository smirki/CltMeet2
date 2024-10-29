// screens/ChatStack.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatListScreen from './ChatListScreen';
import ChatScreen from './ChatScreen';
import PublicProfileScreen from './PublicProfileScreen'; // Ensure this screen exists

const Stack = createNativeStackNavigator();

export default function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: 'Chats' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({ title: route.params.chat.name })}
      />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{ title: 'User Profile' }}
      />
    </Stack.Navigator>
  );
}
