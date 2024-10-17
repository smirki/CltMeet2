// ChatListScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image } from 'react-native';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance instead of axios
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [token, setToken] = useState('');
  const [registeredEvents, setRegisteredEvents] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState([]);

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
        setFilteredChats(chatsData); // Initialize filtered chats
      } catch (error) {
        console.error('Error fetching chats:', error);
      }
    };

    fetchChats();
  }, []);

  // Filter chats based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = chats.filter(chat =>
        (chat.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const renderItem = ({ item }) => {
    const isGroupChat = !item.user;
    const tagType = item.type; // Assuming 'type' is either 'romantic' or 'friend'

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('Chat', { chat: item })}
      >
        {/* Placeholder for profile picture */}
        <Image
          style={styles.profileImage}
          source={
            isGroupChat
              ? require('../assets/group_placeholder.png') // Placeholder for group chats
              : require('../assets/placeholder.png') // Placeholder for individual chats
          }
        />
        <View style={styles.chatDetails}>
          {isGroupChat ? (
            <Text style={styles.name}>{item.name}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', { userId: item.user.id })}
            >
              <Text style={styles.name}>{item.user.name}</Text>
            </TouchableOpacity>
          )}
          {!isGroupChat && tagType && (
            <View style={styles.tagContainer}>
              <Text style={tagType === 'romantic' ? styles.romanticTag : styles.friendTag}>
                {tagType.charAt(0).toUpperCase() + tagType.slice(1)}
              </Text>
            </View>
          )}
          <Text style={styles.lastMessage}>Tap to chat</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search chats..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {filteredChats.length > 0 ? (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.chatId}
          renderItem={renderItem}
          initialNumToRender={10} // Optimization for large data sets
          maxToRenderPerBatch={15}
          windowSize={10}
        />
      ) : (
        <Text>No chats found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  searchBar: {
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0', // Placeholder background color
    marginRight: 10,
  },
  chatDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#231F20',
  },
  lastMessage: {
    fontSize: 14,
    color: 'gray',
  },
  tagContainer: {
    marginTop: 4,
    marginBottom: 4,
  },
  romanticTag: {
    backgroundColor: '#FFCDD2',
    color: '#C62828',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    alignSelf: 'flex-start',
  },
  friendTag: {
    backgroundColor: '#C8E6C9',
    color: '#2E7D32',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    alignSelf: 'flex-start',
  },
});
