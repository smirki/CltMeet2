// screens/EventsListScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { useNavigation } from '@react-navigation/native';
import { Icon, Button } from 'react-native-elements';
import { AuthContext } from '../context/AuthContext';
import { useContext } from 'react';

const { width } = Dimensions.get('window');

const EventsListScreen = () => {
  const navigation = useNavigation();
  const { user, loading: authLoading } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [lastVisible, setLastVisible] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/getUserProfile');
      if (response && response.data) {
        setUserProfile(response.data);
        setRegisteredEvents(response.data.registeredEvents ? Object.keys(response.data.registeredEvents) : []);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to fetch user profile.');
    }
  };

  const fetchEvents = async (pageNumber = 1, refresh = false) => {
    setLoading(true); // Ensure loading state is set at start
    try {
      console.log(`Fetching events for page ${pageNumber}`);
      const response = await axiosInstance.get('/events', {
        params: { page: pageNumber, limit: 10 },
      });

      if (response && response.data && response.data.events) {
        const fetchedEvents = response.data.events;
        console.log('Fetched events:', fetchedEvents);

        if (refresh) {
          setEvents(fetchedEvents);
        } else {
          setEvents(prevEvents => [...prevEvents, ...fetchedEvents]);
        }

        // Check if we should stop pagination
        setHasMore(fetchedEvents.length >= 10);
        setLastVisible(pageNumber);
      } else {
        console.warn('No events returned from the server');
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      Alert.alert('Error', 'Failed to fetch events.');
    } finally {
      setLoading(false); // Ensure loading is reset even on error
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchEvents(1, true); // Initial fetch on mount with refresh
  }, [user]);

  useEffect(() => {
    if (userProfile) {
      // Optionally, you can perform actions based on userProfile
    }
  }, [userProfile]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      fetchEvents(nextPage);
      setPage(nextPage);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchEvents(1, true).then(() => {
      setPage(1);
      setRefreshing(false);
    });
  };

  const renderEventItem = ({ item }) => {
    const isRegistered = registeredEvents.includes(item.id);

    const handlePress = () => {
      if (isRegistered) {
        // Navigate to Event Chat
        navigation.navigate('Chats', { chatId: `event_${item.id}`, chatName: item.title });
      } else {
        // Navigate to Event Details for purchase
        navigation.navigate('EventDetails', { eventId: item.id });
      }
    };

    return (
      <TouchableOpacity
        style={styles.eventContainer}
        onPress={handlePress}
        accessibilityLabel={`View details for ${item.title}`}
      >
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.eventImage}
          accessibilityLabel={`Image for ${item.title}`}
        />
        <View style={styles.eventDetails}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventDate}>
            {new Date(item.date.seconds * 1000).toLocaleDateString()} at {new Date(item.date.seconds * 1000).toLocaleTimeString()}
          </Text>
          <Text style={styles.eventLocation}>{item.location.name}</Text>
          <Text style={styles.eventCost}>{item.cost > 0 ? `$${item.cost}` : 'Free'}</Text>
          <Button
            title={isRegistered ? 'Go to Chat' : 'Purchase Tickets'}
            buttonStyle={isRegistered ? styles.chatButton : styles.purchaseButton}
            onPress={handlePress}
            icon={isRegistered ? <Icon name="comments" type="font-awesome" color="#FFFFFF" style={{ marginRight: 10 }} /> : null}
            accessibilityLabel={isRegistered ? `Go to chat for ${item.title}` : `Purchase tickets for ${item.title}`}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && page === 1) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loading && hasMore ? <ActivityIndicator size="small" color="#FF5A5F" /> : null}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        contentContainerStyle={styles.listContent}
        accessibilityLabel="Events Instagram-Style Feed"
      />
      {!loading && hasMore && (
        <Button
          title="Load More"
          onPress={handleLoadMore}
          buttonStyle={styles.loadMoreButton}
          accessibilityLabel="Load More Events"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  eventContainer: {
    marginBottom: 20,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  eventImage: {
    width: width * 0.9,
    height: width * 0.6,
    borderRadius: 15,
  },
  eventDetails: {
    width: width * 0.9,
    paddingVertical: 10,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 3,
  },
  eventLocation: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 3,
  },
  eventCost: {
    fontSize: 14,
    color: '#FF5A5F',
    fontWeight: '600',
    marginBottom: 10,
  },
  purchaseButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#FF5A5F',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'center',
    marginTop: 10,
  },
});

export default EventsListScreen;
