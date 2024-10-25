import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { signOut, signUp as firebaseSignUp, signIn as firebaseSignIn } from '../services/firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  signUp: async () => {},
  signIn: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && !user.displayName) {
          const userData = userDoc.data();
          // Update user profile if displayName is missing
          await updateProfile(user, {
            displayName: userData.displayName
          });
        }
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const result = await firebaseSignUp(email, password, displayName);
    setUser(result.user);
  };

  const signIn = async (email: string, password: string) => {
    const result = await firebaseSignIn(email, password);
    setUser(result.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, signUp, signIn }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
