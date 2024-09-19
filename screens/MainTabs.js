import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import EventsScreen from './EventsScreen';
import SwiperScreen from './SwiperScreen';
import MatchesScreen from './MatchesScreen';
import ChatStack from './ChatStack';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Swiper"
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="Swiper" component={SwiperScreen} />
      <Tab.Screen name="Matches" component={MatchesScreen} />
      <Tab.Screen name="Chats" component={ChatStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}