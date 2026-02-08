import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authApi, LoginInput, RegisterInput } from '../api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        const parsedStoredUser = JSON.parse(storedUser);
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (error: any) {
          const status = error?.response?.status;

          // Only clear session for real auth failures.
          if (status === 401 || status === 403) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
          } else {
            // Preserve existing session on transient/profile fetch issues.
            setUser(parsedStoredUser);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (input: LoginInput) => {
    const response = await authApi.login(input);
    setUser(response.user);
    return response.user;
  };

  const register = async (input: RegisterInput) => {
    const response = await authApi.register(input);
    setUser(response.user);
    return response.user;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
