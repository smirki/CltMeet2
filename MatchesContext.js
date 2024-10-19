// MatchesContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from './api/axiosInstance';
import { AuthContext } from './context/AuthContext';
import * as SecureStore from 'expo-secure-store';


export const MatchesContext = createContext();

export const MatchesProvider = ({ children }) => {
  const [currentMatches, setCurrentMatches] = useState([]);
  const [outgoingMatches, setOutgoingMatches] = useState([]);
  const [incomingMatches, setIncomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user, loading: authLoading } = useContext(AuthContext); // Use user and authLoading from AuthContext

useEffect(() => {
  if (user && !authLoading) {
    fetchMatches();
  }
}, [user, authLoading]);


const fetchMatches = async () => {
  try {
    setLoading(true);

    // Fetch Current Matches
    const matchesResponse = await axiosInstance.get('/matches');
    setCurrentMatches(matchesResponse.data.matches);

    // Fetch Outgoing Matches
    const outgoingResponse = await axiosInstance.get('/outgoingMatches');
    setOutgoingMatches(outgoingResponse.data.outgoingMatches);

    // Fetch Incoming Matches
    const incomingResponse = await axiosInstance.get('/incomingMatches');
    setIncomingMatches(incomingResponse.data.incomingMatches);

    setLoading(false);
  } catch (error) {
    console.error('Error fetching matches:', error);
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
