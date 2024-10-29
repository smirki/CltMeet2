// MainTabs.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons'; // Import vector icons

import EventsScreen from './EventsScreen';
import SwiperScreen from './SwiperScreen';
import MatchesScreen from './MatchesScreen'; // Ensure this screen exists
import ChatStack from './ChatStack';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Events" // Set 'Events' as the initial route
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false, // Hide text labels
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          // Set icon based on route name
          switch (route.name) {
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Swiper':
              iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
              break;
            case 'Chats':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'person';
          }

          // Return the icon component
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF3B30',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          paddingVertical: 10,
          height: 80, // Adjust height for better touch targets
        },
      })}
    >
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Swiper" component={SwiperScreen} />
      {/* Removed the 'Matches' Tab */}
      <Tab.Screen name="Chats" component={ChatStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
