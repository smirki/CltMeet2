// components/Tag.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Tag = ({ type }) => {
  const getBackgroundColor = () => {
    switch (type) {
      case 'friend':
        return '#4ecdc4';
      case 'romantic':
        return '#ff6b6b';
      default:
        return '#ccc';
    }
  };

  const getIconName = () => {
    switch (type) {
      case 'friend':
        return 'person-outline';
      case 'romantic':
        return 'heart-outline';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <View style={[styles.tagContainer, { backgroundColor: getBackgroundColor() }]}>
      <Ionicons name={getIconName()} size={14} color="#fff" style={styles.icon} />
      <Text style={styles.tagText}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  icon: {
    marginRight: 4,
  },
});

export default React.memo(Tag);
