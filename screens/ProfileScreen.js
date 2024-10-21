import React, { useContext, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import Header from './Header';
import { Ionicons } from '@expo/vector-icons';
import EventCard from './EventCard';
import Swiper from 'react-native-swiper';

const { width, height } = Dimensions.get('window');

const ProfileScreen = () => {
  const { user } = useContext(AuthContext);
  const [mainProfileImage, setMainProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = useState(new Animated.Value(height))[0]; // Bottom sheet off-screen initially

  useEffect(() => {
    fetchProfile();
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axiosInstance.get('/my-events', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const data = await response.data;
      setEvents(data.events);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axiosInstance.get('/getUserProfile', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setMainProfileImage(response.data.mainProfileImage || null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Unable to fetch your profile.');
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permissions are required!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.7,
    });

    if (!result.cancelled) {
      handleImageUpload(result.uri);
    }
  };

  const handleImageUpload = async (uri) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const formData = new FormData();
      formData.append('avatar', {
        uri: manipResult.uri,
        name: `profile_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const response = await axiosInstance.post('/uploadProfilePictures', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (response.data.mainProfileImage) {
        setMainProfileImage(response.data.mainProfileImage);
        Alert.alert('Success', 'Profile picture uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'There was an error uploading your image.');
    }
  };

  const toggleBottomSheet = (open) => {
    if (open) {
      Animated.timing(slideAnim, {
        toValue: 0, // Slide up to the bottom of the screen
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsOpen(true));
    } else {
      Animated.timing(slideAnim, {
        toValue: height, // Slide down off the screen
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Header currentPage="Home" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.imageContainer}>
          {mainProfileImage ? (
            <Image
              source={{ uri: mainProfileImage }}
              style={styles.profileImage}
              accessible={true}
              accessibilityLabel="Main profile image"
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>U</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.editIcon}
            onPress={() => toggleBottomSheet(true)}
            accessible={true}
            accessibilityLabel="Edit profile image"
          >
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Text displaying name and age */}
        <Text style={styles.nameText}>Ayush, 22</Text>
      </ScrollView>

      <View style={styles.eventsContainer}>
        <Text style={styles.eventsTitle}>My Events</Text>
        <FlatList
          data={events}
          horizontal
          renderItem={({ item }) => <EventCard event={item} />}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {/* Bottom sheet for editing profile images */}
      <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.sheetTitle}>Edit Your Images</Text>

        {/* Swiper for images */}
        <Swiper
          style={styles.swiper}
          showsPagination={true}
          loop={false}
        >
          <View style={styles.slide}>
            <Image
              source={{ uri: 'https://example.com/image1.jpg' }} // Replace with actual image URL
              style={styles.image}
            />
            <Text style={styles.label}>Image 1</Text>
          </View>

          <View style={styles.slide}>
            <Image
              source={{ uri: 'https://example.com/image2.jpg' }} // Replace with actual image URL
              style={styles.image}
            />
            <Text style={styles.label}>Image 2</Text>
          </View>
        </Swiper>

        <TouchableOpacity
          style={styles.modalButton}
          onPress={() => toggleBottomSheet(false)}
        >
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    paddingTop: 35,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  imageContainer: {
    width: 120,
    height: 120,
    marginBottom: 10,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 50,
    color: '#999',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    padding: 5,
  },
  nameText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  eventsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },


  listContainer: {
    paddingLeft: 10,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.6, // Adjust as needed (60% of the screen height)
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    padding: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  swiper: {
    flex: 1,
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  label: {
    marginTop: 10,
    fontSize: 16,
  },
  modalButton: {
    width: '100%',
    padding: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 5,
    marginVertical: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default ProfileScreen;
