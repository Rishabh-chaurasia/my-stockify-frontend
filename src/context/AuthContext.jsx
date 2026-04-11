import React, { createContext, useContext, useEffect, useState } from 'react';
import { isAuthenticated, getStoredUsername, logout as apiLogout } from '../lib/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username,   setUsername]   = useState(null);
  const [isLoading,  setIsLoading]  = useState(true);

  useEffect(() => {
    setIsLoggedIn(isAuthenticated());
    setUsername(getStoredUsername());
    setIsLoading(false);
  }, []);

  const logout  = () => { apiLogout(); setIsLoggedIn(false); setUsername(null); };
  const setAuth = (u)  => { setIsLoggedIn(true); setUsername(u); };

  return (
    <AuthContext.Provider value={{ isLoggedIn, username, logout, setAuth, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
