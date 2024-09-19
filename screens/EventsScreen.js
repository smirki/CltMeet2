// EventsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, Button, Share, Animated } from 'react-native';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance instead of axios
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState({});
  const [token, setToken] = useState('');
  const isFocused = useIsFocused();
  const fadeAnim = new Animated.Value(0); // For fade-in animation

  useEffect(() => {
    if (isFocused) {
      fetchEvents();
      // Start the fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [isFocused]);

  const fetchEvents = async () => {
    const storedToken = await AsyncStorage.getItem('userToken');
    setToken(storedToken);

    try {
      const response = await axiosInstance.get('/events');
      setEvents(response.data.events);

      const userProfileResponse = await axiosInstance.get('/getUserProfile');
      setRegisteredEvents(userProfileResponse.data.registeredEvents || {});
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const registerEvent = async (eventId) => {
    try {
      await axiosInstance.post('/registerForEvent', { eventId });
      Alert.alert('Registered', 'You have registered for the event.');
      fetchEvents(); // Refresh events
    } catch (error) {
      console.error('Error registering for event:', error);
    }
  };

  const openEventChat = async (event) => {
    const chatId = `event_${event.id}`;
    const chatName = event.title;

    const chatData = {
      chatId: chatId,
      name: chatName,
    };

    navigation.navigate('Chat', { chat: chatData });
  };

  const shareEvent = async (event) => {
    try {
      await Share.share({
        message: `Check out this event: ${event.title} happening on ${event.time}!`,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not share the event.');
    }
  };

  const renderItem = ({ item }) => (
    <Animated.View style={{ ...styles.eventCard, opacity: fadeAnim }}>
      <TouchableOpacity onPress={() => Alert.alert(item.title, item.description)}>
        <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }} style={styles.eventImage} />
        <View style={styles.eventContent}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.details}>📍 {item.distance || '5 miles away'}</Text>
          <Text style={styles.details}>⏰ {item.time || '2 PM'}</Text>
          <Text style={styles.details}>📅 {item.date || 'Sept 30, 2024'}</Text>
          <Text style={styles.details}>Registered Users: {item.registeredCount || 0}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.shareButton} onPress={() => shareEvent(item)}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
        {!registeredEvents[item.id] ? (
          <Button title="Register" onPress={() => registerEvent(item.id)} />
        ) : (
          <Button title="Chat" onPress={() => openEventChat(item)} />
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>CLTMEET</Text>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6347', // Tomato color for a pop of color
    textAlign: 'center',
    fontFamily: 'Recoleta', // Unique font for CLTMEET
    marginBottom: 20,
  },
  eventCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    transition: 'all 0.3s ease',
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  eventContent: {
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  details: {
    fontSize: 14,
    color: '#888',
    marginBottom: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  shareButton: {
    backgroundColor: '#ff6347',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  shareText: {
    color: '#FFF',
    fontWeight: '600',
  },
});
