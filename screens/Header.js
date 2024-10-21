import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import the icon library

const Header = ({ title, currentPage }) => {
  const navigation = useNavigation();

  // Function to handle settings icon action
  const handleSettingsPress = () => {
    if (currentPage === 'Profile') {
        navigation.navigate('Chats', { screen: 'Chat' });
    } else if (currentPage === 'Home') {
      navigation.navigate('Profile'); // Navigate to Profile from Home page
    } else {
      navigation.goBack(); // Go back to the previous screen
    }
  };

  // Function to handle logout action
  const handleLogoutPress = () => {
    // Add your logout logic here (e.g., clear session, redirect to login, etc.)
    console.log('Logging out...');
    navigation.navigate('Login'); // Navigate to Login page
  };

  // Icon rendering based on the current page
  const renderIcons = () => {
    if (currentPage === 'Profile') {
      // Return both settings and logout icons on Profile page
      return (
        <>
          <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
            <Icon name="sign-out" size={25} color="#e63558" /> {/* Settings icon */}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleLogoutPress}>
            <Icon name="sign-out" size={25} color="#e63558" /> {/* Logout icon */}
          </TouchableOpacity>
        </>
      );
    } else {
      // Return the appropriate icon for Home/Settings pages
      return (
          <>
        <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
          <Icon
            name={currentPage === 'Settings' ? 'arrow-left' : 'cog'} // Back icon on Settings, cog on other pages
            size={25}
            color="#e63558"
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.iconButton} onPress={handleSettingsPress}>
          <Icon
            name={currentPage === 'Settings' ? 'arrow-left' : 'sign-out'} // Back icon on Settings, cog on other pages
            size={25}
            color="#e63558"
          />
        </TouchableOpacity>

        </>
        
      );
    }
  };

  return (
    <View style={styles.header}>
      {/* App name */}
      <Text style={styles.appName}>CltMeet</Text>

      {/* Icons section */}
      <View style={styles.iconsContainer}>
        {renderIcons()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    width: '100%',
    height: 50,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e63558',
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
    marginLeft: 5, // Space between icons
  },
});

export default Header;
