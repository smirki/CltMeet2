// SwiperScreen.js

import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Entypo } from '@expo/vector-icons';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance
import { AuthContext } from '../context/AuthContext'; // Import AuthContext

export default function SwiperScreen() {
    
    
  const [profiles, setProfiles] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const swiperRef = useRef(null);
  const { userToken, logout } = useContext(AuthContext); // Access userToken from AuthContext

  useEffect(() => {
    console.log('SwiperScreen useEffect triggered');
    const fetchProfiles = async () => {
      if (!userToken) {
        console.log('No userToken afirevailable, cannot fetch profiles');
        Alert.alert('Authentication Error', 'Please log in to view profiles.', [
          { text: 'OK', onPress: () => {} },
        ]);
        return;
      }

      try {
        console.log('Fetching profiles...');
        const response = await axiosInstance.get('/profiles', {
          params: {
            pageSize: 10,
            lastVisible: lastVisible,
          },
        });

        console.log('API Response:', response.data);

        const { profiles: newProfiles, lastVisible: newLast } = response.data;

        if (!newProfiles || newProfiles.length === 0) {
          console.warn('No profiles received from API');
          Alert.alert('No Profiles', 'No more profiles available.');
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
  }, [userToken, lastVisible]);

  const handleChoice = async (profile, type) => {
    console.log(`Handling choice: ${type} for profile: ${profile.name} (UID: ${profile.uid})`);
    if (!userToken) {
      console.log('No userToken available, cannot send choice');
      Alert.alert('Authentication Error', 'Please log in to perform actions.');
      return;
    }

    try {
      const response = await axiosInstance.post('/markSeen', {
        seenUserId: profile.uid,
        action: type,
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

    if (!userToken) {
      console.log('No userToken available, cannot mark as passed');
      Alert.alert('Authentication Error', 'Please log in to perform actions.');
      return;
    }

    try {
      await axiosInstance.post('/markSeen', {
        seenUserId: passedProfile.uid,
        action: 'pass',
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

  // Render loading indicator if profiles are still loading
  if (loadingProfiles) {
    console.log('Loading profiles...');
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
