// MatchesScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';
import axiosInstance from '../api/axiosInstance'; // Use axiosInstance instead of axios
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MatchesScreen({ navigation }) {
  const [matches, setMatches] = useState([]);
  const [outgoingMatches, setOutgoingMatches] = useState([]);
  const [token, setToken] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      const storedToken = await AsyncStorage.getItem('userToken');
      setToken(storedToken);

      try {
        const response = await axiosInstance.get('/matches'); // Base URL is handled by axiosInstance
        setMatches(response.data.matches);

        const outgoingResponse = await axiosInstance.get('/outgoingMatches');
        setOutgoingMatches(outgoingResponse.data.outgoingMatches);
      } catch (error) {
        console.error('Error fetching matches:', error);
      }
    };

    fetchMatches();
  }, []);

  const deleteOutgoingMatch = async (requestId) => {
    try {
      await axiosInstance.delete(`/matchRequests/${requestId}`);
      setOutgoingMatches(outgoingMatches.filter((match) => match.requestId !== requestId));
      Alert.alert('Match request canceled');
    } catch (error) {
      console.error('Error canceling match request:', error);
    }
  };

  const deleteMatch = async (matchId) => {
    try {
      await axiosInstance.delete(`/matches/${matchId}`);
      setMatches(matches.filter((match) => match.matchId !== matchId));
      Alert.alert('Match deleted');
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  const renderOutgoingItem = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActionsForOutgoing(progress, dragX, item.requestId)}
    >
      <View style={styles.matchItem}>
        <Text style={styles.name}>{item.user.name}</Text>
        <Text style={styles.type}>
          Outgoing {item.type === 'romantic' ? 'Romantic' : 'Friend'} Request
        </Text>
      </View>
    </Swipeable>
  );

  const renderRightActionsForOutgoing = (progress, dragX, requestId) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteOutgoingMatch(requestId)}
      >
        <MaterialIcons name="cancel" size={30} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderRightActions = (progress, dragX, matchId) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteMatch(matchId)}
      >
        <MaterialIcons name="delete" size={30} color="#fff" />
      </TouchableOpacity>
    );
  };

  const openChat = async (match) => {
    try {
      const chat = {
        chatId: match.chatId,
        user: match.user,
      };
      navigation.navigate('Chat', { chat });
    } catch (error) {
      console.error('Error opening chat:', error);
    }
  };

  const renderItem = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item.matchId)}
    >
      <TouchableOpacity onPress={() => openChat(item)}>
        <View style={styles.matchItem}>
          <Text style={styles.name}>{item.user.name}</Text>
          <Text style={styles.type}>
            Matched as {item.type === 'romantic' ? 'Romantic' : 'Friend'}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={styles.container}>
      {matches.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Matches</Text>
          <FlatList
            data={matches}
            keyExtractor={(item) => item.matchId}
            renderItem={renderItem}
          />
        </>
      )}
      {outgoingMatches.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Outgoing Requests</Text>
          <FlatList
            data={outgoingMatches}
            keyExtractor={(item) => item.requestId}
            renderItem={renderOutgoingItem}
          />
        </>
      )}
      {matches.length === 0 && outgoingMatches.length === 0 && (
        <Text>No matches or outgoing requests yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  matchItem: {
    padding: 15,
    borderBottomWidth: 1,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 18,
  },
  type: {
    fontSize: 14,
    color: 'gray',
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 20,
  },
});
