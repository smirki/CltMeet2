// ChatListScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance instead of axios
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [token, setToken] = useState('');
  const [registeredEvents, setRegisteredEvents] = useState({});

  useEffect(() => {
    const fetchChats = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);

      try {
        // Fetch chats from backend using axiosInstance
        const response = await axiosInstance.get('/chats');
        let chatsData = response.data.chats;

        // Add Charlotte group chat
        const groupChatDocRef = doc(db, 'groupChats', 'charlotteGroupChat');
        const groupChatDoc = await getDoc(groupChatDocRef);
        if (groupChatDoc.exists()) {
          const groupChatData = {
            chatId: 'charlotteGroupChat',
            name: 'Charlotte Group Chat',
          };
          chatsData = [groupChatData, ...chatsData];
        }

        // Fetch user's registered events using axiosInstance
        const userProfileResponse = await axiosInstance.get('/getUserProfile');
        const userRegisteredEvents = userProfileResponse.data.registeredEvents || {};
        setRegisteredEvents(userRegisteredEvents);

        // Add event chats
        const eventChats = [];
        for (const eventId of Object.keys(userRegisteredEvents)) {
          // Fetch event details from Firestore
          const eventDocRef = doc(db, 'events', eventId);
          const eventDoc = await getDoc(eventDocRef);
          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            const eventChat = {
              chatId: `event_${eventId}`,
              name: eventData.title,
            };
            eventChats.push(eventChat);
          }
        }

        // Combine all chats
        chatsData = [...eventChats, ...chatsData];

        setChats(chatsData);
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    fetchChats();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => navigation.navigate('Chat', { chat: item })}
    >
      <Text style={styles.name}>{item.user ? item.user.name : item.name}</Text>
      <Text style={styles.lastMessage}>Tap to chat</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {chats.length > 0 ? (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.chatId}
          renderItem={renderItem}
        />
      ) : (
        <Text>No chats yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  chatItem: {
    padding: 15,
    borderBottomWidth: 1,
  },
  name: {
    fontSize: 18,
  },
  lastMessage: {
    fontSize: 14,
    color: 'gray',
  },
});
