import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import Swiper from 'react-native-swiper';

const { height } = Dimensions.get('window');

const EditProfile = () => {
  const [isOpen, setIsOpen] = useState(false);
  const slideAnim = new Animated.Value(height); // Start the bottom sheet off-screen vertically

  // Toggle bottom sheet
  const toggleBottomSheet = () => {
    if (isOpen) {
      // Slide the bottom sheet down (off-screen)
      Animated.timing(slideAnim, {
        toValue: height, // Off the screen
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
    } else {
      // Slide the bottom sheet up (visible)
      Animated.timing(slideAnim, {
        toValue: 0, // Positioned at the bottom
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsOpen(true));
    }
  };

  return (
    <View style={styles.container}>
      {/* Edit icon */}
      <TouchableOpacity style={styles.editButton} onPress={toggleBottomSheet}>
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>

      {/* Bottom sheet */}
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

          {/* Add more slides as needed */}
        </Swiper>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#f05454',
    padding: 15,
    borderRadius: 10,
  },
  editText: {
    color: 'white',
    fontWeight: 'bold',
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
});

export default EditProfile;
