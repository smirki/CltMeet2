// MatchesContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import axiosInstance from './api/axiosInstance';
import { AuthContext } from './context/AuthContext';

export const MatchesContext = createContext();

export const MatchesProvider = ({ children }) => {
  const [currentMatches, setCurrentMatches] = useState([]);
  const [outgoingMatches, setOutgoingMatches] = useState([]);
  const [incomingMatches, setIncomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const { userToken } = useContext(AuthContext);

  useEffect(() => {
    if (userToken) {
      fetchMatches();
    }
  }, [userToken]);

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
