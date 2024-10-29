// components/ProfileImage.js

import React from 'react';
import { Image, StyleSheet } from 'react-native';

const ProfileImage = ({ uri, accessibilityLabel }) => {
  return (
    <Image
      source={{ uri: uri || 'https://via.placeholder.com/150' }}
      style={styles.image}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
  },
});

export default ProfileImage;
