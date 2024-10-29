// components/SearchBar.js
import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import debounce from 'lodash.debounce';

const SearchBar = () => {
  const [searchText, setSearchText] = useState('');

  // Debounce the search input to prevent excessive calls
  const debouncedSearch = debounce((text) => {
  }, 300);

  useEffect(() => {
    debouncedSearch(searchText);
    // Cancel the debounce on unmount
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchText]);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color="#666" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Search matches..."
        value={searchText}
        onChangeText={setSearchText}
        accessibilityLabel="Search matches"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2EFEA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});

export default React.memo(SearchBar);
