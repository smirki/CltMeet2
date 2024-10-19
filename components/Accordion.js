// components/Accordion.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import Collapsible from 'react-native-collapsible';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const Accordion = ({ title, children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed(!isCollapsed);
  };

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        onPress={toggleExpanded}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`${isCollapsed ? 'Expand' : 'Collapse'} ${title}`}
      >
        <Text style={styles.headerText}>{title}</Text>
        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={24}
          color="#333"
        />
      </TouchableOpacity>
      <Collapsible collapsed={isCollapsed}>
        <View style={styles.content}>
          {children}
        </View>
      </Collapsible>
    </View>
  );
};

const styles = StyleSheet.create({
  accordionContainer: {
    marginBottom: 16,
    backgroundColor: '#F2EFEA', // Updated to match parent
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2, // For Android shadow
    shadowColor: '#000', // For iOS shadow
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F2EFEA',
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    padding: 16,
    backgroundColor: '#F2EFEA', // Ensures content background matches accordion
  },
});

export default Accordion;
