// MatchesContext.js
import React, { createContext, useState } from 'react';

export const MatchesContext = createContext();

export const MatchesProvider = ({ children }) => {
  const [matches, setMatches] = useState([]);
  const [outgoingMatches, setOutgoingMatches] = useState([]);

  return (
    <MatchesContext.Provider
      value={{ matches, setMatches, outgoingMatches, setOutgoingMatches }}
    >
      {children}
    </MatchesContext.Provider>
  );
};