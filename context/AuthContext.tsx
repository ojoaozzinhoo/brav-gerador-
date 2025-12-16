import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbService, User } from '../services/dbService';
import { supabase } from '../services/supabaseClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  recoveryMode: boolean;
  setRecoveryMode: (mode: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const refreshUser = async () => {
     try {
        const currentUser = await dbService.getCurrentUser();
        setUser(currentUser);
     } catch (error) {
        console.error("Erro ao atualizar usuário", error);
     }
  };

  // Check session on load and listen for changes
  useEffect(() => {
    const initSession = async () => {
        try {
            await refreshUser();
        } catch (error) {
            console.error("Sessão inválida", error);
        } finally {
            setIsLoading(false);
        }
    };
    initSession();

    // Listen for Auth Events (Recovery, Sign In, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setRecoveryMode(true);
        }
        
        if (event === 'SIGNED_IN') {
             await refreshUser();
        }
        
        if (event === 'SIGNED_OUT') {
            setUser(null);
            setRecoveryMode(false);
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const user = await dbService.authenticate(email, password);
    setUser(user);
  };

  const register = async (name: string, email: string, password: string) => {
    const user = await dbService.register(name, email, password);
    if (user) setUser(user);
  };

  const resetPassword = async (email: string) => {
    await dbService.resetPassword(email);
  };

  const updatePassword = async (password: string) => {
    await dbService.updatePassword(password);
  };

  const logout = () => {
    dbService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, recoveryMode, setRecoveryMode, login, register, resetPassword, updatePassword, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};