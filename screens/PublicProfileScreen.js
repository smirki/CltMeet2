// screens/PublicProfileScreen.js

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StyleSheet 
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import Swiper from 'react-native-swiper';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const PublicProfileScreen = ({ route, navigation }) => {
  const { otherUserId } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPublicProfile();
  }, []);

  const fetchPublicProfile = async () => {
    try {
      const response = await axiosInstance.get(`/publicProfile/${otherUserId}`);
      setProfile(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching public profile:', error);
      setLoading(false);
      Alert.alert('Error', 'Unable to fetch user profile.');
      navigation.goBack(); // Navigate back if profile can't be fetched
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text>User profile not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Swiper 
        style={styles.wrapper} 
        showsButtons={false} 
        loop={false} 
        autoplay={false} 
        dotStyle={styles.dot} 
        activeDotStyle={styles.activeDot}
      >
        {profile.profileImages && profile.profileImages.length > 0 ? (
          profile.profileImages.map((item, index) => (
            <Image 
              key={index}
              source={{ uri: item }} 
              style={styles.profileImage} 
              accessible={true}
              accessibilityLabel={`Profile image ${index + 1}`}
            />
          ))
        ) : (
          <Image 
            source={{ uri: 'https://via.placeholder.com/250' }} 
            style={styles.profileImage} 
            accessible={true}
            accessibilityLabel="Default profile image"
          />
        )}
      </Swiper>
      <Text style={styles.name}>{profile.name}{profile.age ? `, ${profile.age}` : ''}</Text>
      <Text style={styles.bio}>{profile.bio || 'No bio available.'}</Text>
      {/* Add more profile details as needed */}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex:1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  wrapper: {
    // Optional styling for Swiper
  },
  profileImage: {
    width: width * 0.8,
    height: 250,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  bio: {
    fontSize: 16,
    marginTop: 10,
    color: '#555',
    textAlign: 'center',
  },
  dot: {
    backgroundColor: 'rgba(0,0,0,.2)',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },
  activeDot: {
    backgroundColor: '#FF3B30',
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },
});

export default PublicProfileScreen;
