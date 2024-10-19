// components/ProfileImage.js
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const ProfileImage = ({ uri, accessibilityLabel }) => {
  return (
    <View style={styles.imageContainer}>
      <Image
        source={{ uri }}
        style={styles.image}
        accessibilityLabel={accessibilityLabel}
        accessible
      />
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default React.memo(ProfileImage);
