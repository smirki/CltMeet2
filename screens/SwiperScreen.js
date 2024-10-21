import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Entypo } from '@expo/vector-icons';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import * as SecureStore from 'expo-secure-store'; // Import SecureStore to get token
import { useNavigation } from '@react-navigation/native';

export default function SwiperScreen() {
  const [profiles, setProfiles] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const swiperRef = useRef(null);
  const { user, loading, logout } = useContext(AuthContext); // Access user and loading from AuthContext
  const navigation = useNavigation();

  // Fetch the token when necessary
  const getUserToken = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) throw new Error('No user token found');
      return token;
    } catch (error) {
      console.error('Error retrieving user token:', error);
      Alert.alert('Error', 'Please log in to continue.');
    }
  };

  useEffect(() => {
    if (loading || !user) {
      // Wait for user authentication to resolve
      console.log('Authentication is still loading or no user found.');
      return;
    }

    const fetchProfiles = async () => {
      setLoadingProfiles(true);
      const token = await getUserToken();
      if (!token) return; // Don't proceed if there is no token

      try {
        console.log('Fetching profiles...');
        const response = await axiosInstance.get('/profiles', {
          params: {
            pageSize: 10,
            lastVisible: lastVisible,
          },
          headers: {
            Authorization: `Bearer ${token}`, // Pass the user token in the request headers
          },
        });

        console.log('API Response:', response.data);

        const { profiles: newProfiles, lastVisible: newLast } = response.data;

        if (!newProfiles || newProfiles.length === 0) {
          console.warn('No profiles received from API');
          setLoadingProfiles(false);
          return;
        }

        setProfiles((prev) => [...prev, ...newProfiles]);
        setLastVisible(newLast);
        console.log(`Fetched ${newProfiles.length} profiles`);
      } catch (error) {
        console.error('Error fetching profiles:', error);
        Alert.alert('Error', 'Failed to load profiles.');
      } finally {
        setLoadingProfiles(false);
      }
    };

    fetchProfiles();
  }, [loading, user, lastVisible]);

  const handleChoice = async (profile, type) => {
    console.log(`Handling choice: ${type} for profile: ${profile.name} (UID: ${profile.uid})`);
    const token = await getUserToken();
    if (!token) return;

    try {
      const response = await axiosInstance.post('/markSeen', {
        seenUserId: profile.uid,
        action: type,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Choice Response:', response.data);

      if (response.data.chatId) {
        Alert.alert(`You matched with ${profile.name}!`, 'Navigate to chat?', [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Go to Chat',
            onPress: () => {
              navigation.navigate('Chat', { chat: { chatId: response.data.chatId, name: profile.name } });
            },
          },
        ]);
      } else if (response.data.message) {
        Alert.alert('Success', response.data.message);
      } else {
        Alert.alert('Success', 'Action completed successfully.');
      }

      console.log(`Swiping right on profile: ${profile.name}`);
      swiperRef.current.swipeRight();
    } catch (error) {
      console.error('Error handling choice:', error);
      Alert.alert('Error', 'Failed to perform the action.');
    }
  };

  const onSwipedLeft = async (cardIndex) => {
    const passedProfile = profiles[cardIndex];
    console.log(`Swiped left on profile: ${passedProfile.name} (UID: ${passedProfile.uid})`);
    const token = await getUserToken();
    if (!token) return;

    try {
      await axiosInstance.post('/markSeen', {
        seenUserId: passedProfile.uid,
        action: 'pass',
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log(`Marked profile as passed: ${passedProfile.name}`);
      Alert.alert('Passed', `You passed on ${passedProfile.name}.`);
    } catch (error) {
      console.error('Error marking profile as passed:', error);
      Alert.alert('Error', 'Failed to mark profile as passed.');
    }
  };

  const loadMoreProfiles = async () => {
    if (lastVisible) {
      console.log('Loading more profiles...');
      setLastVisible(lastVisible); // Trigger useEffect to fetch more profiles
    }
  };

  if (loading || loadingProfiles) {
    console.log('Loading profiles or waiting for auth...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text>Loading profiles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profiles.length > 0 ? (
        <>
          <Swiper
            ref={swiperRef}
            cards={profiles}
            renderCard={(card) => {
              console.log('Rendering card:', card);
              if (!card) {
                return (
                  <View style={styles.card}>
                    <Text>No more profiles</Text>
                  </View>
                );
              }
              return (
                <View style={styles.card}>
                  <Image source={{ uri: card.imageUrl }} style={styles.image} />
                  <Text style={styles.name}>
                    {card.name}, {card.age}
                  </Text>
                  <View style={styles.choiceContainer}>
                    <TouchableOpacity
                      style={[styles.choiceButton, { backgroundColor: '#4ecdc4' }]}
                      onPress={() => handleChoice(card, 'friend')}
                    >
                      <Text style={styles.choiceText}>Friend</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.choiceButton, { backgroundColor: '#ff6b6b' }]}
                      onPress={() => handleChoice(card, 'romantic')}
                    >
                      <Text style={styles.choiceText}>Romantic</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            onSwipedLeft={onSwipedLeft}
            onSwipedAll={loadMoreProfiles}
            cardIndex={0}
            backgroundColor={'#f0f0f0'}
            stackSize={3}
            disableRightSwipe // Disable manual right swipe to enforce using buttons
            infinite={false}
            animateCardOpacity
          />
          <View style={styles.controlContainer}>
            <TouchableOpacity
              onPress={() => {
                console.log('Manual swipe left triggered');
                swiperRef.current.swipeLeft();
              }}
              style={styles.controlButton}
            >
              <Entypo name="cross" size={50} color="red" />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.noProfilesContainer}>
          <Text>No profiles available.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  card: {
    flex: 0.75,
    borderRadius: 10,
    shadowRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 0 },
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
  },
  image: {
    width: '95%',
    height: '75%',
    borderRadius: 10,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    marginTop: 10,
    fontWeight: '600',
  },
  choiceContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  choiceButton: {
    flex: 1,
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  choiceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  controlContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  controlButton: {
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProfilesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
