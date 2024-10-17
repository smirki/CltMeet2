// ChatScreen.js

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
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
  updateDoc,
} from 'firebase/firestore';
import { AuthContext } from '../context/AuthContext'; // Ensure AuthContext is correctly set up
import { jwtDecode } from 'jwt-decode'; // Import jwt-decode

export default function ChatScreen({ route, navigation }) {
  const { chat } = route.params; // chat should contain chatId and name
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [usersCache, setUsersCache] = useState({});
  const { userToken, loading, logout } = useContext(AuthContext); // Use AuthContext
  const [currentUserUid, setCurrentUserUid] = useState(null); // State for UID
  const [loadingMessages, setLoadingMessages] = useState(true);
  const flatListRef = useRef(); // Reference to FlatList for scrolling

  // Decode JWT to extract UID
  useEffect(() => {
    if (loading) {
      console.log('AuthContext is loading...');
      return;
    }

    if (!userToken) {
      console.log('User not authenticated');
      Alert.alert('Authentication Error', 'You are not authenticated.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }

    try {
      const decodedToken = jwtDecode(userToken);
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
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      Alert.alert('Authentication Error', 'Invalid authentication token.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
    }
  }, [userToken, loading, navigation]);

  // Set up Firestore listener for messages
  useEffect(() => {
    if (!currentUserUid) return;

    console.log('Setting up Firestore listener for chat:', chat.chatId);

    const messagesRef = collection(db, 'chats', chat.chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        console.log('Received new messages snapshot');
        const msgs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Validate senderId
          if (data.senderId && data.text && data.timestamp) {
            msgs.push({ id: doc.id, ...data });
          } else {
            console.warn('Invalid message data:', data);
          }
        });
        setMessages(msgs);
        setLoadingMessages(false);
        // Scroll to bottom when new messages arrive
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      },
      (error) => {
        console.error('Error fetching messages:', error);
        Alert.alert('Error', 'Failed to load messages.');
        setLoadingMessages(false);
      }
    );

    return () => {
      console.log('Unsubscribing from messages snapshot');
      unsubscribe();
    };
  }, [chat.chatId, currentUserUid]);

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
        senderId: currentUserUid, // Ensure this is the UID
        text: inputText.trim(),
        timestamp: serverTimestamp(),
      };
      console.log('Adding message to Firestore:', newMessage);
      await addDoc(messagesRef, newMessage);

      // Correctly update the lastMessage field in the chat document
      const chatRef = doc(db, 'chats', chat.chatId);
      const lastMessage = {
        text: inputText.trim(),
        senderId: currentUserUid,
        timestamp: serverTimestamp(),
      };
      console.log('Updating lastMessage in Firestore:', lastMessage);
      await updateDoc(chatRef, { lastMessage });

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
  const MessageItem = React.memo(({ item }) => {
    const isMyMessage = item.senderId === currentUserUid;
    const [senderName, setSenderName] = useState('Loading...');

    useEffect(() => {
      let isMounted = true; // To prevent state update on unmounted component

      const fetchName = async () => {
        // Validate senderId format (assuming UIDs are alphanumeric and of specific length)
        if (!item.senderId || item.senderId.length < 10) { // Adjust length as per your UID structure
          console.warn('Invalid senderId detected:', item.senderId);
          if (isMounted) {
            setSenderName('Unknown');
          }
          return;
        }

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
    }, [item.senderId]);

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
  });

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
            ref={flatListRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current.scrollToEnd({ animated: true })}
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
