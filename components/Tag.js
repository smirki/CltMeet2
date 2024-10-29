// components/Tag.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Tag = ({ type }) => {
  if (!type) return null;

  const getStyle = () => {
    switch (type) {
      case 'romantic':
        return styles.romantic;
      case 'friend':
        return styles.friend;
      default:
        return styles.default;
    }
  };

  return (
    <View style={[styles.tagContainer, getStyle()]}>
      <Text style={styles.tagText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tagContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  romantic: {
    backgroundColor: '#ff6b6b',
  },
  friend: {
    backgroundColor: '#4ecdc4',
  },
  default: {
    backgroundColor: '#999',
  },
});

export default Tag;
