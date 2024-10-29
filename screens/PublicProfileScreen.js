// screens/PublicProfileScreen.js

import React, { useEffect, useState, useContext } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ActivityIndicator, 
  ScrollView, 
  Alert, 
  TouchableOpacity, 
  Linking 
} from 'react-native';
import axiosInstance from '../api/axiosInstance';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext'; // Assuming you have AuthContext
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PublicProfileScreen({ route }) {
  const { userId } = route.params;
  const { user } = useContext(AuthContext); // Access user context if needed
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    fetchPublicProfile();
  }, [userId]);

  const fetchPublicProfile = async () => {
    try {
      setLoadingProfile(true);
      const response = await axiosInstance.get(`/publicProfile/${userId}`, {
        headers: {
          Authorization: user ? `Bearer ${user.token}` : undefined, // Include token if user is logged in
        },
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching public profile:', error);
      Alert.alert('Error', 'Failed to load public profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  if (loadingProfile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Image */}
        <Image 
          source={{ uri: profile.mainProfileImage || 'https://via.placeholder.com/150' }} 
          style={styles.profileImage} 
          accessible={true}
          accessibilityLabel={`${profile.name}'s profile picture`}
        />
        
        {/* Name and Age */}
        <Text style={styles.name}>{profile.name}{profile.age ? `, ${profile.age}` : ''}</Text>
        
        {/* Bio */}
        <Text style={styles.bio}>{profile.bio || 'No bio available.'}</Text>

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {profile.interests.map((interest, index) => (
                <View key={index} style={styles.interestItem}>
                  <Ionicons name="ios-star" size={16} color="#FFD700" />
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Social Media Links */}
        {profile.socialLinks && (profile.socialLinks.instagram || profile.socialLinks.twitter) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            {profile.socialLinks.instagram && (
              <TouchableOpacity 
                style={styles.socialLink} 
                onPress={() => handleOpenURL(profile.socialLinks.instagram)}
                accessible={true}
                accessibilityLabel="Open Instagram Profile"
              >
                <Ionicons name="logo-instagram" size={24} color="#C13584" />
                <Text style={styles.socialText}>Instagram</Text>
              </TouchableOpacity>
            )}
            {profile.socialLinks.twitter && (
              <TouchableOpacity 
                style={styles.socialLink} 
                onPress={() => handleOpenURL(profile.socialLinks.twitter)}
                accessible={true}
                accessibilityLabel="Open Twitter Profile"
              >
                <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                <Text style={styles.socialText}>Twitter</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Events */}
        {profile.registeredEvents && profile.registeredEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Registered Events</Text>
            {profile.registeredEvents.map((event, index) => (
              <View key={index} style={styles.eventItem}>
                <Text style={styles.eventText}>{event}</Text>
                {/* Optionally, add a button to view event details */}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const handleOpenURL = async (url) => {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Invalid URL', 'Cannot open the provided URL.');
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    Alert.alert('Error', 'An error occurred while trying to open the link.');
  }
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    paddingBottom: 40,
  },
  loadingContainer: {
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex:1,
    justifyContent:'center',
    alignItems:'center',
    backgroundColor: '#f9f9f9',
  },
  errorText: {
    fontSize:16,
    color:'red',
  },

  // Profile Image Styles
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e0e0',
  },

  // Name and Bio Styles
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 15,
    color: '#333',
    textAlign: 'center',
  },
  bio: {
    fontSize: 16,
    color: '#555',
    marginTop: 10,
    textAlign: 'center',
  },

  // Sections Styles
  section: {
    width: '100%',
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 1 }, // For iOS shadow
    shadowOpacity: 0.1, // For iOS shadow
    shadowRadius: 1, // For iOS shadow
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },

  // Interests Styles
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    padding: 8,
    borderRadius: 15,
    margin: 5,
  },
  interestText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#00796b',
  },

  // Social Media Styles
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical:5,
  },
  socialText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },

  // Events Styles
  eventItem: {
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 10,
    marginVertical:5,
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 1 }, // For iOS shadow
    shadowOpacity: 0.1, // For iOS shadow
    shadowRadius: 1, // For iOS shadow
  },
  eventText: {
    fontSize: 16,
    color: '#ff6f00',
  },

  // General Styles
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
});
