// components/Tag.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Tag = ({ type }) => {
  const getTagStyle = () => {
    switch (type) {
      case 'friend':
        return styles.friendTag;
      case 'romantic':
        return styles.romanticTag;
      default:
        return styles.defaultTag;
    }
  };

  const getTagText = () => {
    switch (type) {
      case 'friend':
        return 'Friend';
      case 'romantic':
        return 'Romantic';
      default:
        return 'Match';
    }
  };

  return (
    <View style={[styles.tagContainer, getTagStyle()]}>
      <Text style={styles.tagText}>{getTagText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tagContainer: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  friendTag: {
    backgroundColor: '#34C759', // Green
  },
  romanticTag: {
    backgroundColor: '#FF3B30', // Red
  },
  defaultTag: {
    backgroundColor: '#8E8E93', // Gray
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});

export default Tag;
