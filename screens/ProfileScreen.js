// screens/ProfileScreen.js

import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Modal,
  Button
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Swiper from 'react-native-swiper';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const { user } = useContext(AuthContext);
  const [profileImages, setProfileImages] = useState([]);
  const [mainProfileImage, setMainProfileImage] = useState(null);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axiosInstance.get('/getUserProfile', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setProfileImages(response.data.profileImages || []);
      setMainProfileImage(response.data.mainProfileImage || null);
      setBio(response.data.bio || '');
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Unable to fetch your profile.');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // Request permission to access media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required!');
      return;
    }

    // Launch image picker
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false, // Single selection
      quality: 0.7, // Compress image quality
    });

    if (!result.cancelled) {
      handleImageUpload(result.assets[0].uri);
    }
  };

  const handleImageUpload = async (uri) => {
    try {
      if (profileImages.length >= 5) {
        Alert.alert('Limit Reached', 'You can only upload up to 5 profile images.');
        return;
      }

      // Compress the image
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Resize to width of 800px
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Prepare form data
      const formData = new FormData();
      formData.append('avatar', {
        uri: manipResult.uri,
        name: `profile_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      // Upload to backend
      const response = await axiosInstance.post('/uploadProfilePictures', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (response.data.profileImages) {
        setProfileImages(response.data.profileImages);
        setMainProfileImage(response.data.mainProfileImage);
        Alert.alert('Success', 'Profile picture uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'There was an error uploading your image.');
    }
  };

  const handleImageEdit = (index) => {
    setSelectedImageIndex(index);
    setModalVisible(true);
  };

  const removeImage = async (index) => {
    try {
      const imageUrl = profileImages[index];
      const response = await axiosInstance.delete('/deleteProfileImage', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        data: { imageUrl },
      });

      if (response.status === 200) {
        const updatedImages = [...profileImages];
        updatedImages.splice(index, 1);
        setProfileImages(updatedImages);

        // If the removed image was the main profile image, set a new one
        if (mainProfileImage === imageUrl) {
          const newMainImage = updatedImages[0] || null;
          setMainProfileImage(newMainImage);
          // Update backend with new mainProfileImage if necessary
          // You might need to create an endpoint for this
        }

        Alert.alert('Success', 'Image removed successfully.');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      Alert.alert('Removal Failed', 'There was an error removing the image.');
    } finally {
      setModalVisible(false);
      setSelectedImageIndex(null);
    }
  };

  const setAsMainImage = async (index) => {
    try {
      const selectedImageUrl = profileImages[index];
      // Update mainProfileImage in Firestore
      await axiosInstance.post('/updateMainProfileImage', {
        mainProfileImage: selectedImageUrl,
      }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      setMainProfileImage(selectedImageUrl);
      Alert.alert('Success', 'Main profile image updated successfully.');
    } catch (error) {
      console.error('Error setting main profile image:', error);
      Alert.alert('Update Failed', 'There was an error setting the main profile image.');
    } finally {
      setModalVisible(false);
      setSelectedImageIndex(null);
    }
  };

  const renderImageItem = (item, index) => (
    <TouchableOpacity key={index} onPress={() => handleImageEdit(index)}>
      <Image 
        source={{ uri: item }} 
        style={styles.profileImage} 
        accessible={true}
        accessibilityLabel={`Profile image ${index + 1}`}
      />
      {mainProfileImage === item && (
        <View style={styles.mainBadge}>
          <Text style={styles.mainBadgeText}>Main</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      <View style={styles.imageContainer}>
        <Swiper 
          style={styles.wrapper} 
          showsButtons={false} 
          loop={false} 
          autoplay={false} 
          dotStyle={styles.dot} 
          activeDotStyle={styles.activeDot}
        >
          {profileImages.map((item, index) => renderImageItem(item, index))}
        </Swiper>
        {profileImages.length < 5 && (
          <TouchableOpacity style={styles.addButton} onPress={pickImage} accessible={true} accessibilityLabel="Add Profile Image">
            <Ionicons name="add" size={36} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.bioContainer}>
        <Text style={styles.bioLabel}>Bio:</Text>
        <Text style={styles.bioText}>{bio}</Text>
        {/* Implement bio editing if needed */}
      </View>

      {/* Modal for Image Options */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedImageIndex(null);
        }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Image</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => removeImage(selectedImageIndex)}>
              <Text style={styles.modalButtonText}>Delete Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalButton} onPress={() => setAsMainImage(selectedImageIndex)}>
              <Text style={styles.modalButtonText}>Set as Main Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#ccc' }]} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  imageContainer: {
    width: width * 0.8,
    height: 250,
    marginBottom: 20,
    position: 'relative',
    backgroundColor: '#f0f0f0', 
  },
  profileImage: {
    width: width * 0.8,
    height: 250,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FF3B30',
    marginBottom: 10,
  },
  mainBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF3B30',
    padding: 5,
    borderRadius: 5,
  },
  mainBadgeText: {
    color: '#fff',
    fontSize: 12,
  },
  addButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  bioContainer: {
    width: '100%',
    marginTop: 20,
  },
  bioLabel: {
    fontSize: 18,
    marginBottom: 5,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 16,
    color: '#555',
  },
  wrapper: {
    // Optional styling for Swiper
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
  modalBackground: {
    flex:1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:'center',
    alignItems:'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding:20,
    alignItems:'center',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  modalButton: {
    width: '100%',
    padding: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 5,
    marginVertical:5,
    alignItems:'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ProfileScreen;
