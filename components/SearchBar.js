// components/SearchBar.js

import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchBar = ({ value, onChangeText, placeholder, accessibilityLabel }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#666" style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Search'}
        style={styles.input}
        accessibilityLabel={accessibilityLabel || 'Search input'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  icon: {
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
});

export default SearchBar;
