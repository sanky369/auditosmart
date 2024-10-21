import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

interface AuthContextType {
  user: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  signup: (username: string, email: string, password: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data (in a real app, this would be handled by a backend)
const MOCK_USERS: { [key: string]: { password: string, email: string } } = {
  'user1': { password: 'password1', email: 'user1@example.com' },
  'user2': { password: 'password2', email: 'user2@example.com' },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    if (MOCK_USERS[username] && MOCK_USERS[username].password === password) {
      setUser(username);
      localStorage.setItem('user', username);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const signup = (username: string, email: string, password: string): boolean => {
    if (MOCK_USERS[username]) {
      return false; // Username already exists
    }
    MOCK_USERS[username] = { password, email };
    setUser(username);
    localStorage.setItem('user', username);
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};