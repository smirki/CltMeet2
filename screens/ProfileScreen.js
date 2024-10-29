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
  TextInput,
  FlatList,
  Switch,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons, Entypo, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const { user, logout } = useContext(AuthContext); // Access logout from AuthContext
  const [profileImages, setProfileImages] = useState([]);
  const [mainProfileImage, setMainProfileImage] = useState(null);
  const [bio, setBio] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [location, setLocation] = useState('');
  const [interests, setInterests] = useState([]);
  const [socialLinks, setSocialLinks] = useState({ instagram: '', twitter: '' });
  const [privacy, setPrivacy] = useState(true); // true = Public, false = Private
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [tickets, setTickets] = useState([]); // New state for tickets
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [newInterest, setNewInterest] = useState('');
  const [selectedSocial, setSelectedSocial] = useState('');
  const [userStats, setUserStats] = useState({ matches: 0, sentRequests: 0, receivedRequests: 0 });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  // Fetch event details for each ticket
useEffect(() => {
  if (tickets.length > 0) {
    fetchTicketDetails();
  }
}, [tickets]);

const fetchTicketDetails = async () => {
  try {
    const detailedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        const eventDoc = await db.collection('events').doc(ticket.eventId).get();
        const eventData = eventDoc.exists ? eventDoc.data() : {};
        return {
          ...ticket,
          eventTitle: eventData.title || 'Unknown Event',
        };
      })
    );
    setTickets(detailedTickets);
  } catch (error) { 
    console.error('Error fetching ticket details:', error);
  }
};


  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/getUserProfile', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      const fullImageUrls = (response.data.profileImages || []).map(
        (image) => `${process.env.EXPO_PUBLIC_API_URL}${image}`
      );
      console.log(fullImageUrls);
      setProfileImages(fullImageUrls || []);
      setMainProfileImage(response.data.mainProfileImage || null);
      setBio(response.data.bio || '');
      setName(response.data.name || '');
      setAge(response.data.age ? String(response.data.age) : '');
      setLocation(response.data.location || '');
      setInterests(response.data.interests || []);
      setSocialLinks(response.data.socialLinks || { instagram: '', twitter: '' });
      setPrivacy(response.data.privacy !== undefined ? response.data.privacy : true);
      setRegisteredEvents(response.data.registeredEvents ? Object.keys(response.data.registeredEvents) : []);
      setTickets(response.data.tickets || []); // Populate tickets
      setUserStats(response.data.userStats || { matches: 0, sentRequests: 0, receivedRequests: 0 });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Unable to fetch your profile.');
      setLoading(false);
    }
  };

  const renderImageItem = ({ item, index }) => (
    <TouchableOpacity 
      key={index.toString()} 
      onPress={() => handleImageEdit(index)} 
      style={styles.imageItem}
      accessible={true}
      accessibilityLabel={`Profile image ${index + 1}. Double tap to manage.`}
    >
      <Image 
        source={{ uri: item }} 
        style={styles.profileImage} 
      />
      {mainProfileImage === item && (
        <View style={styles.mainBadge}>
          <Text style={styles.mainBadgeText}>Main</Text>
        </View>
      )}
    </TouchableOpacity>
  );

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
    // Navigate to image management options inline or through a dropdown
    Alert.alert(
      'Manage Image',
      'Choose an action',
      [
        {
          text: 'Delete Image',
          onPress: () => removeImage(index),
          style: 'destructive',
        },
        {
          text: 'Set as Main Image',
          onPress: () => setAsMainImage(index),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const removeImage = async (index) => {
    try {
      const imageUrl = profileImages[index];
      const response = await axiosInstance.delete('/deleteProfileImage', {
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
          // Update backend with new mainProfileImage
          await axiosInstance.post('/updateMainProfileImage', {
            mainProfileImage: newMainImage,
          }, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });
        }

        Alert.alert('Success', 'Image removed successfully.');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      Alert.alert('Removal Failed', 'There was an error removing the image.');
    }
  };

  const setAsMainImage = async (index) => {
    try {
      const selectedImageUrl = profileImages[index];
      // Update mainProfileImage in backend
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
    }
  };

  const openEditField = (field) => {
    setEditingField(field);
  };

  const saveField = async () => {
    try {
      let updateData = {};
      switch (editingField) {
        case 'name':
          updateData.name = name;
          break;
        case 'age':
          updateData.age = parseInt(age) || null;
          break;
        case 'bio':
          updateData.bio = bio;
          break;
        case 'location':
          updateData.location = location;
          break;
        default:
          break;
      }

      await axiosInstance.post('/updateProfile', updateData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      Alert.alert('Success', `${capitalize(editingField)} updated successfully!`);
      setEditingField(null);
      fetchUserProfile(); // Refresh profile to get updated data
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Update Failed', 'There was an error updating your profile.');
    }
  };

  const cancelEdit = () => {
    // Re-fetch profile to discard changes
    fetchUserProfile();
    setEditingField(null);
  };

  const addInterest = async () => {
    if (newInterest.trim() === '') {
      Alert.alert('Invalid Input', 'Interest cannot be empty.');
      return;
    }
    const updatedInterests = [...interests, newInterest.trim()];
    setInterests(updatedInterests);
    setNewInterest('');
    try {
      await axiosInstance.post('/updateProfile', { interests: updatedInterests }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      Alert.alert('Success', 'Interest added successfully!');
    } catch (error) {
      console.error('Error adding interest:', error);
      Alert.alert('Update Failed', 'There was an error adding your interest.');
    }
  };

  const removeInterest = async (index) => {
    const updatedInterests = [...interests];
    updatedInterests.splice(index, 1);
    setInterests(updatedInterests);
    try {
      await axiosInstance.post('/updateProfile', { interests: updatedInterests }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      Alert.alert('Success', 'Interest removed successfully!');
    } catch (error) {
      console.error('Error removing interest:', error);
      Alert.alert('Update Failed', 'There was an error removing your interest.');
    }
  };

  const openSocialEdit = (platform) => {
    setSelectedSocial(platform);
  };

  const saveSocialLink = async () => {
    try {
      const updatedSocialLinks = { ...socialLinks, [selectedSocial]: socialLinks[selectedSocial] };
      await axiosInstance.post('/updateProfile', { socialLinks: updatedSocialLinks }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      Alert.alert('Success', `${capitalize(selectedSocial)} link updated successfully!`);
      setSelectedSocial('');
      fetchUserProfile(); // Refresh profile to get updated data
    } catch (error) {
      console.error('Error updating social links:', error);
      Alert.alert('Update Failed', 'There was an error updating your social links.');
    }
  };

  const togglePrivacy = async (value) => {
    try {
      setPrivacy(value);
      await axiosInstance.post('/updateProfile', { privacy: value }, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      Alert.alert('Success', `Profile is now ${value ? 'Public' : 'Private'}.`);
      fetchUserProfile(); // Refresh profile to get updated data
    } catch (error) {
      console.error('Error updating privacy:', error);
      Alert.alert('Update Failed', 'There was an error updating your privacy settings.');
    }
  };

  const capitalize = (s) => {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => performLogout() },
      ],
      { cancelable: true }
    );
  };

  const performLogout = async () => {
    try {
      await logout();
      Alert.alert('Logged Out', 'You have been successfully logged out.');
      // Navigation to LoginScreen is handled by AuthContext and App Navigator
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Logout Failed', 'There was an error logging you out.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Your Profile</Text>
            <TouchableOpacity 
              onPress={handleLogout} 
              style={styles.logoutButton}
              accessible={true}
              accessibilityLabel="Logout Button"
              accessibilityHint="Tap to logout of your account"
            >
              <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Images Section */}
          <View style={styles.imageContainer}>
            <FlatList 
              data={profileImages}
              renderItem={renderImageItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.imageList}
              accessible={true}
              accessibilityLabel="Profile images carousel"
            />
            {profileImages.length < 5 && (
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={pickImage} 
                accessible={true} 
                accessibilityLabel="Add Profile Image"
              >
                <Ionicons name="add" size={36} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bio Section */}
          <View style={styles.bioContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bio</Text>
              <TouchableOpacity 
                onPress={() => openEditField('bio')} 
                style={styles.editButton}
                accessible={true}
                accessibilityLabel="Edit Bio"
              >
                <Feather name="edit-2" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            {editingField === 'bio' ? (
              <View style={styles.editContainer}>
                <TextInput 
                  style={styles.input}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Enter your bio"
                  multiline
                  numberOfLines={4}
                  accessible={true}
                  accessibilityLabel="Edit bio input"
                />
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={saveField}
                    accessible={true}
                    accessibilityLabel="Save Bio"
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={cancelEdit}
                    accessible={true}
                    accessibilityLabel="Cancel Edit Bio"
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.bioText}>{bio || 'No bio available.'}</Text>
            )}
          </View>

          {/* Personal Information Section */}
          <View style={styles.infoContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            {/* Name */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              {editingField === 'name' ? (
                <View style={styles.editContainer}>
                  <TextInput 
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    accessible={true}
                    accessibilityLabel="Edit name input"
                  />
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={saveField}
                      accessible={true}
                      accessibilityLabel="Save Name"
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={cancelEdit}
                      accessible={true}
                      accessibilityLabel="Cancel Edit Name"
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>{name || 'Not Provided'}</Text>
                  <TouchableOpacity 
                    onPress={() => openEditField('name')} 
                    style={styles.iconButton}
                    accessible={true}
                    accessibilityLabel="Edit Name"
                  >
                    <Feather name="edit-2" size={18} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Age */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Age:</Text>
              {editingField === 'age' ? (
                <View style={styles.editContainer}>
                  <TextInput 
                    style={styles.input}
                    value={age}
                    onChangeText={setAge}
                    placeholder="Enter your age"
                    keyboardType="numeric"
                    accessible={true}
                    accessibilityLabel="Edit age input"
                  />
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={saveField}
                      accessible={true}
                      accessibilityLabel="Save Age"
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={cancelEdit}
                      accessible={true}
                      accessibilityLabel="Cancel Edit Age"
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>{age || 'Not Provided'}</Text>
                  <TouchableOpacity 
                    onPress={() => openEditField('age')} 
                    style={styles.iconButton}
                    accessible={true}
                    accessibilityLabel="Edit Age"
                  >
                    <Feather name="edit-2" size={18} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Location */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              {editingField === 'location' ? (
                <View style={styles.editContainer}>
                  <TextInput 
                    style={styles.input}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Enter your location"
                    accessible={true}
                    accessibilityLabel="Edit location input"
                  />
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={saveField}
                      accessible={true}
                      accessibilityLabel="Save Location"
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={cancelEdit}
                      accessible={true}
                      accessibilityLabel="Cancel Edit Location"
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.infoValueContainer}>
                  <Text style={styles.infoValue}>{location || 'Not Provided'}</Text>
                  <TouchableOpacity 
                    onPress={() => openEditField('location')} 
                    style={styles.iconButton}
                    accessible={true}
                    accessibilityLabel="Edit Location"
                  >
                    <Feather name="edit-2" size={18} color="#007AFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Interests Section */}
          <View style={styles.interestsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Interests</Text>
              <TouchableOpacity 
                onPress={() => addInterest()} 
                style={styles.addInterestButton}
                accessible={true}
                accessibilityLabel="Add Interest"
              >
                <Feather name="plus" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={interests}
              renderItem={({ item, index }) => (
                <View key={index.toString()} style={styles.interestItem}>
                  <Text style={styles.interestText}>{item}</Text>
                  <TouchableOpacity 
                    onPress={() => removeInterest(index)} 
                    style={styles.removeInterestButton}
                    accessible={true}
                    accessibilityLabel={`Remove interest ${item}`}
                  >
                    <Entypo name="cross" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
              horizontal={false}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.interestsList}
              accessible={true}
              accessibilityLabel="List of interests"
            />
          </View>

          {/* Social Media Links Section */}
          <View style={styles.socialContainer}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            {['instagram', 'twitter'].map(platform => (
              <View key={platform} style={styles.socialLinkItem}>
                <Text style={styles.socialPlatform}>{capitalize(platform)}:</Text>
                {editingField === `social_${platform}` ? (
                  <View style={styles.editContainer}>
                    <TextInput 
                      style={styles.input}
                      value={socialLinks[platform]}
                      onChangeText={(text) => setSocialLinks({ ...socialLinks, [platform]: text })}
                      placeholder={`Enter your ${platform} link`}
                      accessible={true}
                      accessibilityLabel={`Edit ${platform} link input`}
                    />
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={saveSocialLink}
                        accessible={true}
                        accessibilityLabel={`Save ${platform} link`}
                      >
                        <Text style={styles.buttonText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={cancelEdit}
                        accessible={true}
                        accessibilityLabel={`Cancel Edit ${platform} link`}
                      >
                        <Text style={styles.buttonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.socialInfoContainer}>
                    <Text style={styles.socialLinkText}>{socialLinks[platform] || 'Not Provided'}</Text>
                    <TouchableOpacity 
                      onPress={() => openSocialEdit(platform)} 
                      style={styles.iconButton}
                      accessible={true}
                      accessibilityLabel={`Edit ${platform} link`}
                    >
                      <Feather name="edit-2" size={18} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Privacy Settings Section */}
          <View style={styles.privacyContainer}>
            <Text style={styles.sectionTitle}>Profile Privacy</Text>
            <View style={styles.privacySwitchContainer}>
              <Text style={styles.privacyText}>{privacy ? 'Public' : 'Private'}</Text>
              <Switch
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={privacy ? '#f5dd4b' : '#f4f3f4'}
                ios_backgroundColor="#3e3e3e"
                onValueChange={togglePrivacy}
                value={privacy}
                accessible={true}
                accessibilityLabel="Toggle Profile Privacy"
              />
            </View>
          </View>

          {/* Registered Events Section */}
          <View style={styles.eventsContainer}>
            <Text style={styles.sectionTitle}>Registered Events</Text>
            {registeredEvents.length > 0 ? (
              <FlatList 
                data={registeredEvents}
                renderItem={({ item }) => (
                  <View key={item} style={styles.eventItem}>
                    <Text style={styles.eventText}>{item}</Text>
                    {/* Optionally, add buttons to view event details or unregister */}
                  </View>
                )}
                keyExtractor={(item) => item}
                scrollEnabled={false}
                accessible={true}
                accessibilityLabel="List of registered events"
              />
            ) : (
              <Text style={styles.noEventsText}>No registered events.</Text>
            )}
          </View>

          {/* Tickets Section */}
          <View style={styles.ticketsContainer}>
            <Text style={styles.sectionTitle}>Your Tickets</Text>
            {tickets.length > 0 ? (
              <FlatList 
                data={tickets}
                renderItem={({ item }) => (
                  <View key={item.id} style={styles.ticketItem}>
                    <Text style={styles.ticketTitle}>{item.eventId}</Text>
                    <Text style={styles.ticketDetail}>Purchased on: {new Date(item.purchaseDate.seconds * 1000).toLocaleDateString()}</Text>
                    <Text style={styles.ticketDetail}>Amount: ${item.amount}</Text>
                    <Text style={styles.ticketDetail}>Status: {item.status}</Text>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                accessible={true}
                accessibilityLabel="List of purchased tickets"
              />
            ) : (
              <Text style={styles.noTicketsText}>You have not purchased any tickets yet.</Text>
            )}
          </View>

          {/* User Statistics Section */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Your Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userStats.matches}</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userStats.sentRequests}</Text>
                <Text style={styles.statLabel}>Sent Requests</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{userStats.receivedRequests}</Text>
                <Text style={styles.statLabel}>Received Requests</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  container: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    paddingBottom: 40,
  },
  loadingContainer: {
    flex:1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    marginLeft: 5,
    fontSize: 16,
    fontWeight: '600',
  },

// Image Styles
imageContainer: {
  width: '100%',
  height: 200,
  marginBottom: 20,
  position: 'relative',
},
imageList: {
  alignItems: 'center',
},
imageItem: {
  marginRight: 10,
},
profileImage: {
  width: 150,
  height: 150,
  borderRadius: 15,
  backgroundColor: '#e0e0e0',
},
mainBadge: {
  position: 'absolute',
  bottom: 10,
  left: 10,
  backgroundColor: '#FF3B30',
  paddingVertical: 2,
  paddingHorizontal: 6,
  borderRadius: 5,
},
mainBadgeText: {
  color: '#fff',
  fontSize: 12,
  fontWeight: '600',
},
addButton: {
  position: 'absolute',
  bottom: 15,
  right: 15,
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: '#007AFF',
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 5, // For Android shadow
  shadowColor: '#000', // For iOS shadow
  shadowOffset: { width: 0, height: 2 }, // For iOS shadow
  shadowOpacity: 0.3, // For iOS shadow
  shadowRadius: 3, // For iOS shadow
},

// Section Titles
sectionTitle: {
  fontSize: 20,
  fontWeight: '700',
  color: '#333',
  marginBottom: 10,
},

// Bio Styles
bioContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  elevation: 2, // For Android shadow
  shadowColor: '#000', // For iOS shadow
  shadowOffset: { width: 0, height: 1 }, // For iOS shadow
  shadowOpacity: 0.1, // For iOS shadow
  shadowRadius: 1, // For iOS shadow
},
sectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
bioText: {
  fontSize: 16,
  color: '#555',
  marginTop: 10,
},
editButton: {
  padding: 5,
},
editContainer: {
  marginTop: 10,
},
input: {
  width: '100%',
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 10,
  fontSize: 16,
  backgroundColor: '#fdfdfd',
},
actionButtons: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  marginTop: 10,
},
saveButton: {
  backgroundColor: '#28a745',
  paddingVertical: 8,
  paddingHorizontal: 15,
  borderRadius: 8,
  marginRight: 10,
},
cancelButton: {
  backgroundColor: '#dc3545',
  paddingVertical: 8,
  paddingHorizontal: 15,
  borderRadius: 8,
},
buttonText: {
  color: '#fff',
  fontSize: 16,
},

// Personal Information Styles
infoContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
},
infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginVertical: 10,
},
infoLabel: {
  fontSize: 16,
  color: '#555',
},
infoValueContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
infoValue: {
  fontSize: 16,
  color: '#333',
  marginRight: 10,
},
iconButton: {
  padding: 5,
},

// Interests Styles
interestsContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
},
interestItem: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#e0f7fa',
  padding: 10,
  borderRadius: 20,
  margin: 5,
  flex: 1,
  justifyContent: 'space-between',
},
interestText: {
  fontSize: 14,
  color: '#00796b',
},
removeInterestButton: {
  padding: 2,
},
interestsList: {
  marginTop: 10,
},
addInterestButton: {
  padding: 5,
},

// Social Media Styles
socialContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
},
socialLinkItem: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginVertical: 10,
},
socialPlatform: {
  fontSize: 16,
  color: '#555',
  flex: 1,
},
socialInfoContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 2,
  justifyContent: 'space-between',
},
socialLinkText: {
  fontSize: 16,
  color: '#007AFF',
  flex: 1,
},

// Privacy Styles
privacyContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
},
privacyText: {
  fontSize: 16,
  color: '#555',
},
privacySwitchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},

// Registered Events Styles
eventsContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
},
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
noEventsText: {
  fontSize: 16,
  color: '#777',
  marginTop: 10,
},

// Tickets Styles
ticketsContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
},
ticketItem: {
  backgroundColor: '#e8f5e9',
  padding: 11,
  borderRadius: 10,
  marginVertical:5,
  elevation: 2, // For Android shadow
  shadowColor: '#000', // For iOS shadow
  shadowOffset: { width: 0, height: 1 }, // For iOS shadow
  shadowOpacity: 0.1, // For iOS shadow
  shadowRadius: 1, // For iOS shadow
},
ticketTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#388e3c',
},
ticketDetail: {
  fontSize: 14,
  color: '#555555',
},
noTicketsText: {
  fontSize: 16,
  color: '#777777',
  marginTop: 10,
},

// Statistics Styles
statsContainer: {
  width: '100%',
  marginBottom: 20,
  backgroundColor: '#fff',
  padding: 15,
  borderRadius: 10,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 1,
},
statsRow: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  width: '100%',
  marginTop: 10,
},
statBox: {
  alignItems: 'center',
},
statNumber: {
  fontSize: 22,
  fontWeight: '700',
  color: '#333',
},
statLabel: {
  fontSize: 14,
  color: '#555',
},
});

export default ProfileScreen;
