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
        // Em caso de erro crítico no DB, garantimos que o usuário seja nulo para forçar login
        setUser(null);
     }
  };

  // FAILSAFE: Force exit loading state after 6 seconds max
  useEffect(() => {
    const timer = setTimeout(() => {
        setIsLoading(prev => {
            if (prev) {
                console.warn("AuthContext: Loading timed out, forcing UI unlock.");
                return false;
            }
            return prev;
        });
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Check session on load and listen for changes
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        try {
            // Race condition check: se o DB demorar, o timeout vence e libera a UI
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout")), 4000));
            const authPromise = refreshUser();
            
            await Promise.race([authPromise, timeoutPromise]);
        } catch (error) {
            console.warn("Inicialização de sessão:", error);
        } finally {
            if (mounted) setIsLoading(false);
        }
    };
    initSession();

    // Setup listener
    let subscription: any = null;
    try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            
            if (event === 'PASSWORD_RECOVERY') {
                setRecoveryMode(true);
            }
            
            if (event === 'SIGNED_IN') {
                 // Pequeno delay para garantir que o token propagou
                 setTimeout(() => refreshUser(), 100);
            }
            
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setRecoveryMode(false);
            }
        });
        subscription = data.subscription;
    } catch (e) {
        console.error("Erro ao registrar listener do Supabase:", e);
        setIsLoading(false);
    }

    return () => {
        mounted = false;
        if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe();
        }
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