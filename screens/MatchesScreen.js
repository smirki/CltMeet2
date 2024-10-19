import React, { useContext, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { MatchesContext } from '../MatchesContext';
import { useNavigation } from '@react-navigation/native';
import Tag from '../components/Tag';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import ProfileImage from '../components/ProfileImage';
import Accordion from '../components/Accordion';
import SearchBar from '../components/SearchBar';
import axiosInstance from '../api/axiosInstance';

const { width } = Dimensions.get('window');

const MatchesScreen = () => {
  const { currentMatches, outgoingMatches, incomingMatches, fetchMatches, loading } = useContext(MatchesContext);
  const navigation = useNavigation();
  const { loading: authLoading } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIncomingMatches = useMemo(() => {
    return incomingMatches.filter(match => !match.matched);
  }, [incomingMatches]);

  const filterMatches = useCallback((matches) => {
    if (!searchQuery.trim()) return matches;
    return matches.filter(match => match.user.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  const filteredCurrentMatches = useMemo(() => filterMatches(currentMatches), [currentMatches, filterMatches]);
  const filteredOutgoingMatches = useMemo(() => filterMatches(outgoingMatches), [outgoingMatches, filterMatches]);
  const filteredIncomingMatchesFiltered = useMemo(() => filterMatches(filteredIncomingMatches), [filteredIncomingMatches, filterMatches]);

  if (loading || authLoading) {
    return (
      <View style={styles.loaderContainer} accessible accessibilityLabel="Loading matches">
        <ActivityIndicator size="large" color="#FF3B30" />
        <Text style={styles.loadingText}>Loading matches...</Text>
      </View>
    );
  }

  const handleUnmatch = (matchId, userName) => {
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch with ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmatch', style: 'destructive', onPress: () => performUnmatch(matchId) },
      ]
    );
  };

  const performUnmatch = async (matchId) => {
    try {
      await axiosInstance.post('/unmatch', { matchId });
      Alert.alert('Success', 'You have successfully unmatched.');
      fetchMatches();
    } catch (error) {
      console.error('Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch. Please try again.');
    }
  };

  const handleUndoOutgoing = (matchId, userName) => {
    Alert.alert(
      'Undo Request',
      `Do you want to cancel your request to ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Undo', style: 'destructive', onPress: () => performUndoOutgoing(matchId) },
      ]
    );
  };

  const performUndoOutgoing = async (matchId) => {
    try {
      await axiosInstance.post('/undoOutgoing', { matchId });
      Alert.alert('Success', 'Your outgoing request has been canceled.');
      fetchMatches();
    } catch (error) {
      console.error('Error undoing outgoing request:', error);
      Alert.alert('Error', 'Failed to undo request. Please try again.');
    }
  };

  const handleAccept = (matchId, userName) => {
    Alert.alert(
      'Accept Match',
      `Do you want to accept the match with ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => performAccept(matchId) },
      ]
    );
  };

  const handleDeny = (matchId, userName) => {
    Alert.alert(
      'Deny Match',
      `Do you want to deny the match with ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deny', style: 'destructive', onPress: () => performDeny(matchId) },
      ]
    );
  };

  const performAccept = async (matchId) => {
    try {
      await axiosInstance.post('/acceptMatch', { matchId });
      Alert.alert('Success', 'You have accepted the match.');
      fetchMatches();
    } catch (error) {
      console.error('Error accepting match:', error);
      Alert.alert('Error', 'Failed to accept match. Please try again.');
    }
  };

  const performDeny = async (matchId) => {
    try {
      await axiosInstance.post('/denyMatch', { matchId });
      Alert.alert('Success', 'You have denied the match.');
      fetchMatches();
    } catch (error) {
      console.error('Error denying match:', error);
      Alert.alert('Error', 'Failed to deny match. Please try again.');
    }
  };

  const renderMatchItem = (item, section) => (
    <View key={item.matchId || item.requestId} style={styles.matchItem}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Chat', { chat: { chatId: item.chatId, name: item.user.name } })}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${item.user.name}`}
      >
        <ProfileImage uri={item.user.imageUrl} accessibilityLabel={`${item.user.name}'s profile picture`} />
        <View style={styles.matchDetails}>
          <Text style={styles.userName}>{item.user.name}, {item.user.age}</Text>
          <Tag type={item.type} />
        </View>
      </TouchableOpacity>
      <View style={styles.actionIcons}>
        {section === 'Incoming Matches' && (
          <>
            <TouchableOpacity
              onPress={() => handleAccept(item.matchId, item.user.name)}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`Accept match with ${item.user.name}`}
            >
              <Ionicons name="checkmark-circle" size={24} color="#4ecdc4" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeny(item.matchId, item.user.name)}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel={`Deny match with ${item.user.name}`}
            >
              <Ionicons name="close-circle" size={24} color="#ff6b6b" />
            </TouchableOpacity>
          </>
        )}
        {section === 'Outgoing Matches' && (
          <TouchableOpacity
            onPress={() => handleUndoOutgoing(item.matchId, item.user.name)}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={`Undo outgoing request to ${item.user.name}`}
          >
            <Ionicons name="arrow-undo-circle" size={24} color="#ff6b6b" />
          </TouchableOpacity>
        )}
        {section === 'Current Matches' && (
          <TouchableOpacity
            onPress={() => handleUnmatch(item.matchId, item.user.name)}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={`Unmatch with ${item.user.name}`}
          >
            <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <SearchBar onSearch={setSearchQuery} />

      {/* Current Matches */}
      <Accordion title="Current Matches">
        {filteredCurrentMatches.map((item) => renderMatchItem(item, 'Current Matches'))}
      </Accordion>

      {/* Incoming Matches */}
      <Accordion title="Incoming Matches">
        {filteredIncomingMatchesFiltered.map((item) => renderMatchItem(item, 'Incoming Matches'))}
      </Accordion>

      {/* Outgoing Matches */}
      <Accordion title="Outgoing Matches">
        {filteredOutgoingMatches.map((item) => renderMatchItem(item, 'Outgoing Matches'))}
      </Accordion>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFEA',
    padding: 16,
    paddingTop: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  matchDetails: {
    flex: 1,
    paddingLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 8,
  },
});

export default MatchesScreen;
