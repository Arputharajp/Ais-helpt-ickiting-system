import { create } from 'zustand';
import axios from 'axios';
import React, { createContext, useContext, useEffect } from 'react';

// Setup axios defaults
// In production, VITE_API_URL points to the Railway backend (e.g. https://ais-helptable-backend.up.railway.app/api)
// In local dev, it falls back to /api which Vite proxies to localhost:3000
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '/api';
axios.defaults.withCredentials = true;


interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
  role?: any;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// Create context with the concrete AuthState type (not null) — useAuth() throws if accessed outside provider
export const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const store = useAuthStore();

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const response = await axios.get('/auth/me');
        if (response.data.success) {
          store.login(response.data.user);
        }
      } catch {
        store.logout();
      } finally {
        store.setLoading(false);
      }
    };

    fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
