// ChatScreen.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { db } from '../firebaseConfig'; // Ensure this path is correct
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext'; // Ensure AuthContext is correctly set up
import { Buffer } from 'buffer'; // Import Buffer for JWT decoding

// Helper function to decode JWT and extract payload
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
};

export default function ChatScreen({ route, navigation }) {
  const { chat } = route.params; // chat should contain chatId and name
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [usersCache, setUsersCache] = useState({});
  const { userToken, loading, logout } = useContext(AuthContext); // Updated to use userToken
  const [currentUserUid, setCurrentUserUid] = useState(null); // New state for UID
  const [loadingMessages, setLoadingMessages] = useState(true);

  useEffect(() => {
    console.log('ChatScreen useEffect triggered');
    // Wait until authentication is loaded
    if (loading) {
      console.log('AuthContext is loading...');
      return;
    }

    // If no authenticated user, alert and navigate to Login
    if (!userToken) {
      console.log('User not authenticated');
      Alert.alert('Authentication Error', 'You are not authenticated.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }

    // Decode JWT to extract UID
    const decodedToken = parseJwt(userToken);
    if (decodedToken && decodedToken.uid) {
      setCurrentUserUid(decodedToken.uid);
      console.log('Extracted UID from token:', decodedToken.uid);
    } else {
      console.warn('Failed to extract UID from token');
      Alert.alert('Authentication Error', 'Invalid authentication token.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }

    // Reference to the messages subcollection in Firestore
    const messagesRef = collection(db, 'chats', chat.chatId, 'messages');

    // Create a query ordered by timestamp in ascending order
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    // Subscribe to real-time updates using onSnapshot
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log('Received new messages snapshot');
        const msgs = [];
        querySnapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() });
        });
        setMessages(msgs);
        setLoadingMessages(false);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        Alert.alert('Error', 'Failed to load messages.');
        setLoadingMessages(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      console.log('Unsubscribing from messages snapshot');
      unsubscribe();
    };
  }, [chat.chatId, userToken, loading, navigation]);

  // Function to send a message
  const sendMessage = async () => {
    console.log('sendMessage triggered with inputText:', inputText);
    if (inputText.trim() === '') {
      console.log('Attempted to send empty message');
      return; // Prevent sending empty messages
    }

    if (!currentUserUid) {
      console.log('currentUserUid is not set');
      Alert.alert('Error', 'You are not authenticated.');
      return;
    }

    try {
      const messagesRef = collection(db, 'chats', chat.chatId, 'messages');
      const newMessage = {
        senderId: currentUserUid, // Use the extracted UID
        text: inputText.trim(),
        timestamp: serverTimestamp(),
      };
      console.log('Adding message to Firestore:', newMessage);
      await addDoc(messagesRef, newMessage);

      // Optionally, update the lastMessage field for displaying in chat lists
      const chatRef = doc(db, 'chats', chat.chatId);
      const lastMessage = {
        text: inputText.trim(),
        senderId: currentUserUid,
        timestamp: serverTimestamp(),
      };
      console.log('Updating lastMessage in Firestore:', lastMessage);
      await addDoc(collection(db, 'chats', chat.chatId, 'lastMessage'), lastMessage);

      setInputText(''); // Clear input field after sending
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message.');
    }
  };

  // Function to get user name by UID with caching
  const getUserName = useCallback(
    async (uid) => {
      console.log('Fetching user name for UID:', uid);
      if (usersCache[uid]) {
        console.log('User name found in cache:', usersCache[uid].name);
        return usersCache[uid].name;
      } else {
        try {
          const userDocRef = doc(db, 'users', uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsersCache((prev) => ({ ...prev, [uid]: userData }));
            console.log('Fetched user data from Firestore:', userData);
            return userData.name;
          } else {
            console.warn('User document does not exist for UID:', uid);
            return 'Unknown';
          }
        } catch (error) {
          console.error('Error fetching user name:', error);
          return 'Unknown';
        }
      }
    },
    [usersCache]
  );

  // Component to render individual messages
  const MessageItem = ({ item }) => {
    const isMyMessage = item.senderId === currentUserUid;
    const [senderName, setSenderName] = useState('Loading...');

    useEffect(() => {
      let isMounted = true; // To prevent state update on unmounted component
      const fetchName = async () => {
        const name = await getUserName(item.senderId);
        if (isMounted) {
          setSenderName(name);
          console.log('Sender name set to:', name);
        }
      };
      fetchName();
      return () => {
        isMounted = false;
      };
    }, [item.senderId, getUserName]);

    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessage : styles.theirMessage,
        ]}
      >
        {!isMyMessage && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    );
  };

  // Render each message item
  const renderItem = ({ item }) => <MessageItem item={item} />;

  // Key extractor with fallback
  const keyExtractor = (item) => item.id || Math.random().toString();

  // Show loading indicator while messages are being fetched
  if (loading || loadingMessages) {
    console.log('Loading messages...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* Chat Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>{chat.name}</Text>
          </View>

          {/* Messages List */}
          <FlatList
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesContainer}
            inverted // To show latest messages at the bottom
            showsVerticalScrollIndicator={false}
          />

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message"
              style={styles.input}
              multiline
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                { opacity: inputText.trim() ? 1 : 0.5 },
              ]}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

// Styles for the ChatScreen component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  inner: {
    flex: 1,
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
  },
  messagesContainer: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 20,
    marginVertical: 5,
  },
  myMessage: {
    backgroundColor: '#dcf8c6',
    alignSelf: 'flex-end',
    borderTopRightRadius: 0,
  },
  theirMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  senderName: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 3,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#007aff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
