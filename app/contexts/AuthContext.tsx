"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { signInWithPassword, signOutUser, getFirebaseAuth } from "../../lib/firebase";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const setupAuth = async () => {
      try {
        const auth = await getFirebaseAuth();
        if (!auth) {
          setLoading(false);
          return;
        }

        const { onAuthStateChanged } = await import("firebase/auth");
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Failed to setup auth:", error);
        setLoading(false);
      }
    };

    setupAuth();
  }, []);

  const signIn = async (password: string): Promise<any> => {
    const user = await signInWithPassword(password);
    return user;
  };

  const signOut = async (): Promise<void> => {
    await signOutUser();
  };

  const value = {
    user,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 