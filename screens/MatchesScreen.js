// MatchesScreen.js
import React, { useContext, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SectionList,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import { MatchesContext } from '../MatchesContext';
import { useNavigation } from '@react-navigation/native';
import Tag from '../components/Tag';
import { Ionicons } from '@expo/vector-icons';
import ProfileImage from '../components/ProfileImage';
import SearchBar from '../components/SearchBar';
import axiosInstance from '../api/axiosInstance';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const MatchesScreen = () => {
  const { currentMatches, outgoingMatches, incomingMatches, fetchMatches, loading } = useContext(MatchesContext);
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  };

  const filteredIncomingMatches = useMemo(() => {
    return incomingMatches.filter(match => !match.matched);
  }, [incomingMatches]);

  const filterMatches = useCallback(
    (matches) => {
      if (!searchQuery.trim()) return matches;
      return matches.filter(match =>
        match.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    },
    [searchQuery]
  );

  const sections = useMemo(() => {
    const current = filterMatches(currentMatches);
    const incoming = filterMatches(filteredIncomingMatches);
    const outgoing = filterMatches(outgoingMatches);

    const data = [];

    if (current.length > 0) {
      data.push({ title: 'Current Matches', data: current });
    }

    if (incoming.length > 0) {
      data.push({ title: 'Incoming Matches', data: incoming });
    }

    if (outgoing.length > 0) {
      data.push({ title: 'Outgoing Matches', data: outgoing });
    }

    return data;
  }, [currentMatches, incomingMatches, outgoingMatches, filterMatches, filteredIncomingMatches]);

  if (loading) {
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
        { text: 'Unmatch', style: 'destructive', onPress: () => performUnmatch(matchId, userName) },
      ]
    );
  };

  const performUnmatch = async (matchId, userName) => {
    try {
      await axiosInstance.post('/unmatch', { matchId });
      Alert.alert('Success', `You have successfully unmatched with ${userName}.`);
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
        { text: 'Undo', style: 'destructive', onPress: () => performUndoOutgoing(matchId, userName) },
      ]
    );
  };

  const performUndoOutgoing = async (matchId, userName) => {
    try {
      await axiosInstance.post('/undoOutgoing', { matchId });
      Alert.alert('Success', `Your request to ${userName} has been canceled.`);
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
        { text: 'Accept', onPress: () => performAccept(matchId, userName) },
      ]
    );
  };

  const handleDeny = (matchId, userName) => {
    Alert.alert(
      'Deny Match',
      `Do you want to deny the match with ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deny', style: 'destructive', onPress: () => performDeny(matchId, userName) },
      ]
    );
  };

  const performAccept = async (matchId, userName) => {
    try {
      await axiosInstance.post('/acceptMatch', { matchId });
      Alert.alert('Success', `You have accepted the match with ${userName}.`);
      fetchMatches();
    } catch (error) {
      console.error('Error accepting match:', error);
      Alert.alert('Error', 'Failed to accept match. Please try again.');
    }
  };

  const performDeny = async (matchId, userName) => {
    try {
      await axiosInstance.post('/denyMatch', { matchId });
      Alert.alert('Success', `You have denied the match with ${userName}.`);
      fetchMatches();
    } catch (error) {
      console.error('Error denying match:', error);
      Alert.alert('Error', 'Failed to deny match. Please try again.');
    }
  };

  const renderMatchItem = ({ item, section }) => (
    <View key={item.matchId || item.requestId} style={styles.matchItem}>
      <TouchableOpacity
        onPress={() => navigation.navigate('Chat', { chat: { chatId: item.chatId, name: item.user.name } })}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${item.user.name}`}
        style={styles.matchInfoContainer}
      >
        <ProfileImage uri={item.user.imageUrl} accessibilityLabel={`${item.user.name}'s profile picture`} />
        <View style={styles.matchDetails}>
          <Text style={styles.userName}>{item.user.name}, {item.user.age}</Text>
          <Tag type={item.type} />
        </View>
      </TouchableOpacity>
      <View style={styles.actionIcons}>
        {section.title === 'Incoming Matches' && (
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
        {section.title === 'Outgoing Matches' && (
          <TouchableOpacity
            onPress={() => handleUndoOutgoing(item.matchId, item.user.name)}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={`Undo outgoing request to ${item.user.name}`}
          >
            <Ionicons name="arrow-undo-circle" size={24} color="#ff6b6b" />
          </TouchableOpacity>
        )}
        {section.title === 'Current Matches' && (
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

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeader}>{title}</Text>
      <Ionicons name="people-outline" size={24} color="#333" />
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-circle-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No matches found.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search matches..."
          accessible
          accessibilityLabel="Search matches"
        />
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.matchId || item.requestId}
          renderItem={renderMatchItem}
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={{ paddingBottom: 20 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F2EFEA',
  },
  container: {
    flex: 1,
    padding: 16,
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
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 16,
    elevation: 2, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 }, // iOS shadow
    shadowOpacity: 0.1, // iOS shadow
    shadowRadius: 2, // iOS shadow
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginVertical: 4,
    elevation: 1, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 1 }, // iOS shadow
    shadowOpacity: 0.1, // iOS shadow
    shadowRadius: 2, // iOS shadow
  },
  matchInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default MatchesScreen;
