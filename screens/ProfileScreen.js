// screens/ProfileScreen.js

import React, { useContext, useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Image, Alert, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = () => {
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newProfile, setNewProfile] = useState({
    imageUrl: '',
    name: '',
    age: '',
    bio: '',
    tags: '',
    funThingsToDo: '',
    neighborhood: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/getUserProfile');
      setProfile(response.data);
      setNewProfile({
        imageUrl: response.data.imageUrl,
        name: response.data.name,
        age: response.data.age,
        bio: response.data.bio,
        tags: response.data.tags ? response.data.tags.join(', ') : '',
        funThingsToDo: response.data.funThingsToDo,
        neighborhood: response.data.neighborhood,
      });
      console.log('Fetched Profile:', response.data); // Debugging
    } catch (error) {
      console.error('Error fetching profile:', error.response?.data?.error || error.message);
      Alert.alert('Error', error.response?.data?.error || 'Failed to fetch profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setNewProfile({ ...newProfile, imageUrl: result.uri });
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updatedProfile = {
        imageUrl: newProfile.imageUrl,
        name: newProfile.name,
        age: newProfile.age,
        bio: newProfile.bio,
        tags: newProfile.tags.split(',').map((tag) => tag.trim()),
        funThingsToDo: newProfile.funThingsToDo,
        neighborhood: newProfile.neighborhood,
      };

      const response = await axiosInstance.put('/updateUserProfile', updatedProfile);
      setProfile(response.data);
      setEditing(false);
      Alert.alert('Profile Updated', 'Your profile has been updated successfully.');
    } catch (error) {
      console.error('Error updating profile:', error.response?.data?.error || error.message);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update profile.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {editing ? (
        <>
          <TouchableOpacity onPress={handleImagePick}>
            {newProfile.imageUrl ? (
              <Image source={{ uri: newProfile.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>Pick Image</Text>
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={newProfile.name}
            onChangeText={(text) => setNewProfile({ ...newProfile, name: text })}
            placeholder="Name"
          />
          <TextInput
            style={styles.input}
            value={newProfile.age}
            onChangeText={(text) => setNewProfile({ ...newProfile, age: text })}
            placeholder="Age"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            value={newProfile.bio}
            onChangeText={(text) => setNewProfile({ ...newProfile, bio: text })}
            placeholder="Bio"
            multiline
          />
          <TextInput
            style={styles.input}
            value={newProfile.tags}
            onChangeText={(text) => setNewProfile({ ...newProfile, tags: text })}
            placeholder="Profile Tags (comma separated)"
          />
          <TextInput
            style={styles.input}
            value={newProfile.funThingsToDo}
            onChangeText={(text) => setNewProfile({ ...newProfile, funThingsToDo: text })}
            placeholder="Fun Things To Do"
            multiline
          />
          <TextInput
            style={styles.input}
            value={newProfile.neighborhood}
            onChangeText={(text) => setNewProfile({ ...newProfile, neighborhood: text })}
            placeholder="Neighborhood in Charlotte"
          />

          <Button title="Save" onPress={handleSaveProfile} color="#FF3B30" />
          <Button title="Cancel" onPress={() => setEditing(false)} color="#666" />
        </>
      ) : (
        <>
          <TouchableOpacity onPress={handleImagePick}>
            {profile.imageUrl ? (
              <Image source={{ uri: profile.imageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.info}>Age: {profile.age}</Text>
          <Text style={styles.info}>Bio: {profile.bio}</Text>
          <Text style={styles.info}>Tags: {profile.tags ? profile.tags.join(', ') : 'N/A'}</Text>
          <Text style={styles.info}>Fun Things To Do: {profile.funThingsToDo || 'N/A'}</Text>
          <Text style={styles.info}>Neighborhood: {profile.neighborhood || 'N/A'}</Text>

          <View style={styles.buttonContainer}>
            <Button title="Edit Profile" onPress={() => setEditing(true)} color="#FF3B30" />
            <Button title="Logout" onPress={logout} color="#666" />
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 20,
    color: '#fff',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  info: {
    fontSize: 18,
    marginBottom: 5,
    color: '#666',
  },
  input: {
    width: '100%',
    padding: 10,
    marginVertical: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
});

export default ProfileScreen;
