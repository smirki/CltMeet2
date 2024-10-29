// ChatListScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, loading: authLoading, logout } = useContext(AuthContext);
  const [loadingChats, setLoadingChats] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      if (authLoading || !user) {
        // Wait until authentication is resolved
        console.log('Waiting for authentication to resolve...');
        return;
      }

      try {
        setLoadingChats(true);

        // Fetch chats from backend using axiosInstance
        const response = await axiosInstance.get('/chats');
        let chatsData = response.data.chats;

        // Optionally, you can add predefined group or event chats here if they are not part of the backend response
        /*
        const groupChat = {
          chatId: 'charlotteGroupChat',
          name: 'Charlotte Group Chat',
          type: 'group',
        };
        chatsData = [groupChat, ...chatsData];
        */

        setChats(chatsData);
        setLoadingChats(false);
      } catch (error) {
        console.error('Error fetching chats:', error);
        Alert.alert('Error', 'Failed to fetch chats.');
        setLoadingChats(false);
      }
    };

    fetchChats();
  }, [user, authLoading]);

  // Filter chats based on search query
  useEffect(() => {
    if (searchQuery) {
      const filtered = chats.filter((chat) =>
        (chat.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats]);

  const [filteredChats, setFilteredChats] = useState([]);

  const renderItem = ({ item }) => {
    const isGroupChat = item.type === 'group';
    const isEventChat = item.type === 'event';
    const tagType = item.type === 'romantic' || item.type === 'friend' ? item.type : null;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('Chat', { chat: item })}
        accessibilityRole="button"
        accessibilityLabel={`Open chat with ${item.name}`}
      >
        {/* Profile Image */}
        <Image
          style={styles.profileImage}
          source={
            isGroupChat
              ? require('../assets/group_placeholder.png') // Placeholder for group chats
              : isEventChat
              ? require('../assets/event_placeholder.png') // Placeholder for event chats
              : require('../assets/placeholder.png') // Placeholder for individual chats
          }
        />
        <View style={styles.chatDetails}>
          <Text style={styles.name}>{item.name}</Text>
          {tagType && (
            <View style={styles.tagContainer}>
              <Text
                style={
                  tagType === 'romantic' ? styles.romanticTag : styles.friendTag
                }
              >
                {tagType.charAt(0).toUpperCase() + tagType.slice(1)}
              </Text>
            </View>
          )}
          <Text style={styles.lastMessage}>Tap to chat</Text>
        </View>
        {!isGroupChat && !isEventChat && (
          <Ionicons
            name="chatbubble-outline"
            size={24}
            color="#888"
            style={styles.chatIcon}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (authLoading || loadingChats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search chats..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        accessibilityLabel="Search chats"
      />
      {filteredChats.length > 0 ? (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.chatId}
          renderItem={renderItem}
          initialNumToRender={10} // Optimization for large data sets
          maxToRenderPerBatch={15}
          windowSize={10}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <Text style={styles.noChatsText}>No chats found.</Text>
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
  chatIcon: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChatsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
    fontSize: 16,
  },
});
