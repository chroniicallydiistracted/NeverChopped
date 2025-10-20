// Authentication context for managing user state

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getUserData,
  setAccessToken,
  setUserData,
  clearAuthData,
  isAuthenticated as checkIsAuthenticated,
  StoredUser,
} from '../utils/tokenStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  user: StoredUser | null;
  login: (token: string, user: StoredUser) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const initAuth = () => {
      const authenticated = checkIsAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const userData = getUserData();
        setUser(userData);
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (token: string, userData: StoredUser) => {
    setAccessToken(token);
    setUserData(userData);
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    clearAuthData();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
