import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons'; // Import vector icons

import EventsScreen from './EventsScreen';
import SwiperScreen from './SwiperScreen';
import MatchesScreen from './MatchesScreen';
import ChatStack from './ChatStack';
import ProfileScreen from './ProfileScreen';
import AddPaymentMethodScreen from './AddPaymentMethodScreen';


const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Swiper"
      screenOptions={({ route }) => ({
        headerShown: false,
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
            case 'Matches':
              iconName = focused ? 'heart' : 'heart-outline';
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
        tabBarStyle: { paddingBottom: 5 },
      })}
    >
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Swiper" component={SwiperScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Chats" component={ChatStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="PaymentMethodScreen" component={AddPaymentMethodScreen} />
    </Tab.Navigator>
  );
}
