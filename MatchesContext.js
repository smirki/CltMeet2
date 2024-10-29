// MatchesContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from './api/axiosInstance';
import { AuthContext } from './context/AuthContext';
import { Alert } from 'react-native';

export const MatchesContext = createContext();

export const MatchesProvider = ({ children }) => {
  const [currentMatches, setCurrentMatches] = useState([]);
  const [outgoingMatches, setOutgoingMatches] = useState([]);
  const [incomingMatches, setIncomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user, loading: authLoading } = useContext(AuthContext); // Access user and auth loading state

  useEffect(() => {
    if (user && !authLoading) {
      fetchMatches();
    }
  }, [user, authLoading]);

  const fetchMatches = async () => {
    try {
      setLoading(true);

      // Fetch Current Matches
      const matchesResponse = await axiosInstance.get('/matches', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setCurrentMatches(matchesResponse.data.matches);

      // Fetch Outgoing Matches
      const outgoingResponse = await axiosInstance.get('/outgoingMatches', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setOutgoingMatches(outgoingResponse.data.outgoingMatches);

      // Fetch Incoming Matches
      const incomingResponse = await axiosInstance.get('/incomingMatches', {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setIncomingMatches(incomingResponse.data.incomingMatches);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      Alert.alert('Error', 'Unable to fetch your matches. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <MatchesContext.Provider
      value={{
        currentMatches,
        outgoingMatches,
        incomingMatches,
        fetchMatches,
        loading,
      }}
    >
      {children}
    </MatchesContext.Provider>
  );
};
