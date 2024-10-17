// screens/MatchesScreen.js
import React, { useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { MatchesContext } from '../MatchesContext';
import { useNavigation } from '@react-navigation/native';
import Tag from '../context/Tag'; // We'll create this component for tags
import { Ionicons } from '@expo/vector-icons'; // For icons

const MatchesScreen = () => {
  const { currentMatches, outgoingMatches, incomingMatches, loading } = useContext(MatchesContext);
  const navigation = useNavigation();

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  const renderMatchItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => navigation.navigate('Chat', { chatId: item.chatId, user: item.user })}
      >
        <View style={styles.matchInfo}>
          <Ionicons name="person-circle" size={36} color="#FF3B30" style={styles.userIcon} />
          <View style={styles.matchDetails}>
            <Text style={styles.userName}>{item.user.name}</Text>
            <Tag type={item.type} />
          </View>
          <Ionicons name="chatbubble-outline" size={24} color="#888" style={styles.chatIcon} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Current Matches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Matches</Text>
        {currentMatches.length === 0 ? (
          <Text style={styles.noMatchesText}>No current matches.</Text>
        ) : (
          <FlatList
            data={currentMatches}
            keyExtractor={(item) => item.matchId}
            renderItem={renderMatchItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchList}
          />
        )}
      </View>

      {/* Incoming Matches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Incoming Matches</Text>
        {incomingMatches.length === 0 ? (
          <Text style={styles.noMatchesText}>No incoming matches.</Text>
        ) : (
          <FlatList
            data={incomingMatches}
            keyExtractor={(item) => item.requestId}
            renderItem={renderMatchItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchList}
          />
        )}
      </View>

      {/* Outgoing Matches */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Outgoing Matches</Text>
        {outgoingMatches.length === 0 ? (
          <Text style={styles.noMatchesText}>No outgoing matches.</Text>
        ) : (
          <FlatList
            data={outgoingMatches}
            keyExtractor={(item) => item.requestId}
            renderItem={renderMatchItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchList}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3DF',
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#231F20',
  },
  noMatchesText: {
    fontSize: 16,
    color: '#888',
  },
  matchList: {
    paddingBottom: 12,
  },
  matchItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    width: 220,
    alignItems: 'center',
    flexDirection: 'row',
  },
  matchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  matchDetails: {
    flex: 1,
    paddingHorizontal: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#231F20',
  },
  userIcon: {
    marginRight: 10,
  },
  chatIcon: {
    marginLeft: 10,
  },
});

export default MatchesScreen;
