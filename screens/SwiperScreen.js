// SwiperScreen.js

import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { Entypo, Feather } from '@expo/vector-icons';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native'; // For animations
import { debounce } from 'lodash';
import { Image } from 'expo-image'; // Using Expo's Image component

const { width, height } = Dimensions.get('window');

export default function SwiperScreen() {
  const [profiles, setProfiles] = useState([]);
  const [lastVisible, setLastVisible] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noProfiles, setNoProfiles] = useState(false);
  const swiperRef = useRef(null);
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current; // For fade-in animation
  const pollingInterval = useRef(null);

  // Debounced function to fetch profiles to prevent rapid calls
  const debouncedFetchProfiles = useCallback(
    debounce(() => {
      fetchProfiles();
    }, 500),
    [lastVisible]
  );

  useEffect(() => {
    if (user && !authLoading) {
      fetchProfiles();
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [user, authLoading]);

  /**
   * Start polling for new profiles every 2.5 seconds
   */
  const startPolling = () => {
    pollingInterval.current = setInterval(() => {
      fetchNewProfiles();
    }, 10000); // 2.5 seconds
  };

  /**
   * Stop polling when component unmounts
   */
  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
  };

  /**
   * Fetch profiles from the server with pagination.
   */
  const fetchProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const response = await axiosInstance.get('/profiles', {
        params: {
          pageSize: 10,
          lastVisible: lastVisible,
        },
      });

      const { profiles: newProfiles, lastVisible: newLast } = response.data;

      if (newProfiles && newProfiles.length > 0) {
        setProfiles((prev) => [...prev, ...newProfiles]);
        setLastVisible(newLast);
        setNoProfiles(false);
      } else {
        setNoProfiles(true);
      }

      setLoadingProfiles(false);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setNoProfiles(true); // Assume no profiles on error to prevent crash
      setLoadingProfiles(false);
    }
  };

  /**
   * Fetch new profiles to ensure real-time updates
   */
  const fetchNewProfiles = async () => {
    try {
      const response = await axiosInstance.get('/profiles', {
        params: {
          pageSize: 5, // Fetch a small number of new profiles
          lastVisible: lastVisible,
        },
      });

      const { profiles: newProfiles, lastVisible: newLast } = response.data;

      if (newProfiles && newProfiles.length > 0) {
        setProfiles((prev) => [...prev, ...newProfiles]);
        setLastVisible(newLast);
        setNoProfiles(false);
      }

    } catch (error) {
      console.error('Error fetching new profiles:', error);
      // Silently fail without setting noProfiles to allow existing profiles to remain
    }
  };

  /**
   * Handle user choices: 'friend' or 'romantic'.
   */
  const handleChoice = async (profile, type) => {
    if (!profile || !profile.uid || !type) return;

    try {
      const response = await axiosInstance.post('/markSeen', {
        seenUserId: profile.uid,
        action: type,
      });

      if (response.data.chatId) {
        // Navigate to chat if matched
        navigation.navigate('Chat', {
          chat: { chatId: response.data.chatId, name: profile.name },
        });
      }

      // Proceed to swipe the card programmatically
      swiperRef.current.swipeRight();
    } catch (error) {
      console.error('Error handling choice:', error);
      // Handle errors silently or with subtle feedback
    }
  };

  /**
   * Handle swiping left (passing on a profile).
   */
  const onSwipedLeft = async (cardIndex) => {
    const passedProfile = profiles[cardIndex];
    if (!passedProfile || !passedProfile.uid) return;

    try {
      await axiosInstance.post('/markSeen', {
        seenUserId: passedProfile.uid,
        action: 'pass',
      });
    } catch (error) {
      console.error('Error marking profile as passed:', error);
      // Handle errors silently or with subtle feedback
    }
  };

  /**
   * Load more profiles when the user swipes through the current set.
   */
  const loadMoreProfiles = () => {
    if (lastVisible && !loadingProfiles) {
      debouncedFetchProfiles();
    }
  };

  /**
   * Refresh profiles manually via the refresh button.
   */
  const refreshProfiles = async () => {
    try {
      setRefreshing(true);
      setProfiles([]);
      setLastVisible(null);
      await fetchProfiles();
    } catch (error) {
      console.error('Error refreshing profiles:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * Animate the Swiper component for a smooth fade-in effect.
   */
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /**
   * Navigate to the Matches screen.
   */
  const navigateToMatches = () => {
    navigation.navigate('Matches');
  };

  /**
   * Render individual profile cards.
   */
  const renderCard = (card) => {
    if (!card) {
      return (
        <View style={styles.noMoreProfilesCard} accessible accessibilityLabel="No more profiles available">
          <LottieView
            source={require('../assets/animations/no_profiles.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
          <Text style={styles.noMoreText}>No more profiles available</Text>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.card, { opacity: fadeAnim }]} accessible accessibilityLabel={`Profile of ${card.name}, age ${card.age}`}>
        <Image
          source={{ uri: card.imageUrl || 'https://via.placeholder.com/300' }}
          style={styles.image}
          contentFit="cover"
          transition={500}
          accessibilityLabel={`${card.name}'s profile picture`}
        />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{card.name}, {card.age}</Text>
          <Text style={styles.bio} numberOfLines={2} ellipsizeMode="tail">{card.bio || 'No bio available.'}</Text>
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.choiceButton, styles.friendButton]}
            onPress={() => handleChoice(card, 'friend')}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Send friend request to ${card.name}`}
          >
            <Entypo name="heart-outlined" size={24} color="#fff" />
            <Text style={styles.buttonText}>Friend</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.choiceButton, styles.romanticButton]}
            onPress={() => handleChoice(card, 'romantic')}
            accessible
            accessibilityRole="button"
            accessibilityLabel={`Send romantic request to ${card.name}`}
          >
            <Entypo name="flower" size={24} color="#fff" />
            <Text style={styles.buttonText}>Romantic</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (authLoading || loadingProfiles) {
    return (
      <SafeAreaView style={styles.loadingContainer} accessible accessibilityLabel="Loading profiles">
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Loading profiles...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with "See Matches" and Refresh Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={navigateToMatches}
          accessible
          accessibilityRole="button"
          accessibilityLabel="See your matches"
        >
          <Text style={styles.headerButtonText}>See Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={refreshProfiles}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Refresh profiles"
        >
          <Entypo name="cycle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.swiperContainer}>
        {noProfiles ? (
          <View style={styles.noProfilesBackground} accessible accessibilityLabel="No profiles available">
            <LottieView
              source={require('../assets/animations/background_animation.json')}
              autoPlay
              loop
              style={styles.backgroundAnimation}
            />
          </View>
        ) : (
          <>
            <Swiper
              ref={swiperRef}
              cards={profiles}
              renderCard={renderCard}
              onSwipedLeft={onSwipedLeft}
              onSwipedAll={loadMoreProfiles}
              cardIndex={0}
              backgroundColor={'#f0f0f0'}
              stackSize={3}
              infinite={false}
              animateCardOpacity
              disableTopSwipe
              disableBottomSwipe
              disableRightSwipe // Disable manual right swipe
              overlayLabels={{
                left: {
                  title: 'PASS',
                  style: {
                    label: {
                      backgroundColor: 'red',
                      color: 'white',
                      fontSize: 24,
                      padding: 10,
                    },
                    wrapper: {
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      justifyContent: 'flex-start',
                      marginTop: 20,
                      marginLeft: -20,
                    },
                  },
                },
              }}
            />
            {/* Pass Button */}
            <TouchableOpacity
              style={styles.passButton}
              onPress={() => swiperRef.current.swipeLeft()}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Pass on this profile"
            >
              <Entypo name="cross" size={40} color="#FF3B30" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 }, // For iOS shadow
    shadowOpacity: 0.1, // For iOS shadow
    shadowRadius: 2, // For iOS shadow
  },
  headerButton: {
    padding: 10,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  swiperContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width * 0.9,
    height: height * 0.75,
    borderRadius: 20,
    shadowRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 0 },
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    elevation: 5, // For Android shadow
  },
  image: {
    width: '100%',
    height: '70%',
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
  },
  infoContainer: {
    width: '100%',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  buttonsContainer: {
    flexDirection: 'row',
    marginTop: 15,
    width: '90%',
    justifyContent: 'space-between',
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    width: '45%',
    justifyContent: 'center',
  },
  friendButton: {
    backgroundColor: '#4ecdc4',
  },
  romanticButton: {
    backgroundColor: '#ff6b6b',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  passButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 35,
    padding: 10,
    elevation: 5, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 }, // For iOS shadow
    shadowOpacity: 0.25, // For iOS shadow
    shadowRadius: 3.84, // For iOS shadow
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  noMoreProfilesCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMoreText: {
    fontSize: 18,
    color: '#555',
    marginTop: 20,
  },
  noProfilesBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noProfilesContainer: {
    position: 'absolute',
    top: height * 0.3,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  noProfilesText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
  lottie: {
    width: 200,
    height: 200,
  },
  backgroundAnimation: {
    width: width,
    height: height,
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
