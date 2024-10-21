// ChatScreen.js

import React, { useState, useEffect, useContext, useCallback, useRef, useMemo } from 'react';
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
import { firebase } from '../firebaseConfig'; // Importing 'firebase' from firebaseConfig.js
import { AuthContext } from '../context/AuthContext'; // Ensure AuthContext is correctly set up

export default function ChatScreen({ route, navigation }) {
  const { chat } = route.params; // chat should contain chatId and name
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const usersCacheRef = useRef({});
  const { user, loading: authLoading, logout } = useContext(AuthContext); // Use AuthContext
  const [currentUserUid, setCurrentUserUid] = useState(null); // State for UID
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [otherUser, setOtherUser] = useState(null); // State to hold other user data
  const flatListRef = useRef(); // Reference to FlatList for scrolling

  // Memoize dbInstance to prevent re-creation on every render
  const dbInstance = useMemo(() => firebase.firestore(), []);

  const navigateToPublicProfile = (otherUserId) => {
    navigation.navigate('PublicProfile', { userId: otherUserId });
  };

  // Set currentUserUid from AuthContext
  useEffect(() => {
    if (authLoading) {
      console.log('AuthContext is loading...');
      return;
    }

    if (!user) {
      console.log('User not authenticated');
      Alert.alert('Authentication Error', 'You are not authenticated.', [
        { text: 'OK', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }

    setCurrentUserUid(user.uid);
    console.log('Current User UID:', user.uid);
  }, [user, authLoading, navigation]);

  // Set up Firestore listener for messages
  useEffect(() => {
    if (!currentUserUid) return;

    console.log('Setting up Firestore listener for chat:', chat.chatId);

    const messagesRef = dbInstance.collection('chats').doc(chat.chatId).collection('messages');
    const q = messagesRef.orderBy('timestamp', 'asc');

    const unsubscribe = q.onSnapshot(
      (querySnapshot) => {
        console.log('Received new messages snapshot');
        const msgs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Validate senderId and text
          if (data.senderId && data.text) { // Removed 'data.timestamp' from validation
            msgs.push({ id: doc.id, ...data });
          } else {
            console.warn('Invalid message data:', data);
          }
        });
        setMessages(msgs);
        setLoadingMessages(false);
        // Scroll to bottom when new messages arrive
        if (flatListRef.current && msgs.length > 0) {
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
  }, [chat.chatId, currentUserUid, dbInstance]); // 'dbInstance' is memoized

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
      const chatRef = dbInstance.collection('chats').doc(chat.chatId);
      const chatDoc = await chatRef.get();

      if (!chatDoc.exists) {
        console.error('Chat document does not exist:', chat.chatId);
        Alert.alert('Error', 'Chat does not exist.');
        return;
      }

      const messagesRef = chatRef.collection('messages');
      const newMessage = {
        senderId: currentUserUid, // Ensure this is the UID
        text: inputText.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      };
      console.log('Adding message to Firestore:', newMessage);
      await messagesRef.add(newMessage);

      // Correctly update the lastMessage field in the chat document
      const lastMessage = {
        text: inputText.trim(),
        senderId: currentUserUid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      };
      console.log('Updating lastMessage in Firestore:', lastMessage);
      await chatRef.update({ lastMessage });

      setInputText(''); // Clear input field after sending
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message.');
    }
  };

  // Function to get user name by UID with caching using useRef
  const getUserName = useCallback(
    async (uid) => {
      console.log('Fetching user name for UID:', uid);
      if (usersCacheRef.current[uid]) {
        console.log('User name found in cache:', usersCacheRef.current[uid].name);
        return usersCacheRef.current[uid].name;
      } else {
        try {
          const userDocRef = dbInstance.collection('users').doc(uid);
          const userDoc = await userDocRef.get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            usersCacheRef.current[uid] = userData; // Update cache
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
    [dbInstance]
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
        if (isMounted && name !== senderName) { // Update only if name has changed
          setSenderName(name);
          console.log('Sender name set to:', name);
        }
      };

      fetchName();

      return () => {
        isMounted = false;
      };
    }, [item.senderId, getUserName, senderName]);

    const otherUserId = item.senderId === currentUserUid ? chat.otherUserId : item.senderId; // Dynamically identify the other user

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
        {item.timestamp && (
          <Text style={styles.timestamp}>{new Date(item.timestamp.seconds * 1000).toLocaleTimeString()}</Text>
        )}
      </View>
    );
  });

  // Render each message item
  const renderItem = ({ item }) => <MessageItem item={item} />;

  // Key extractor with fallback
  const keyExtractor = (item) => item.id || Math.random().toString();

  // Show loading indicator while messages are being fetched
  if (authLoading || loadingMessages) {
    console.log('Loading profiles or waiting for auth...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text>Loading messages...</Text>
      </View>
    );
  }

  const otherUserId = chat.otherUserId;

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
            <TouchableOpacity
              onPress={() => navigateToPublicProfile(otherUserId)}
              style={{ padding: 20, borderBottomWidth: 1, borderColor: '#ccc' }}
              accessible={true}
              accessibilityLabel={`View profile of ${chat.otherUserName}`}
            >
              <Text style={{ fontSize: 18 }}>{chat.otherUserName}</Text>
              <Text>{chat.lastMessage}</Text>
            </TouchableOpacity>
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
  timestamp: {
    fontSize: 10,
    color: 'gray',
    alignSelf: 'flex-end',
    marginTop: 4,
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
