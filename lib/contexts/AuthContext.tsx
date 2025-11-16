// Win Room v2.0 - Auth Context
'use client';

import { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { JWTPayload } from '../types';

interface AuthContextType {
  token: string | null;
  user: JWTPayload | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function loadStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null as string | null, user: null as JWTPayload | null };
  }

  const storedToken = localStorage.getItem('win_room_token');
  if (!storedToken) {
    return { token: null as string | null, user: null as JWTPayload | null };
  }

  const decoded = decodeToken(storedToken);
  if (!decoded) {
    localStorage.removeItem('win_room_token');
    return { token: null as string | null, user: null as JWTPayload | null };
  }

  return { token: storedToken, user: decoded };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialAuth = useRef(loadStoredAuth());
  const [token, setToken] = useState<string | null>(initialAuth.current.token);
  const [user, setUser] = useState<JWTPayload | null>(initialAuth.current.user);

  const login = (newToken: string) => {
    localStorage.setItem('win_room_token', newToken);
    const decoded = decodeToken(newToken);
    if (!decoded) {
      localStorage.removeItem('win_room_token');
      setToken(null);
      setUser(null);
      return;
    }
    setToken(newToken);
    setUser(decoded);
  };

  const logout = () => {
    localStorage.removeItem('win_room_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        isAuthenticated: !!token && !!user,
      }}
    >
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
