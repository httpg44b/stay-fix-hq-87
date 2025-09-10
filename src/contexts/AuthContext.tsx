import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { LoginCredentials } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usersService, type User } from '@/services/users.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for auth changes FIRST (no async calls inside)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
      const hasUser = !!sess?.user;
      setIsAuthenticated(hasUser);

      if (hasUser && sess?.user) {
        // Defer fetching the profile to avoid deadlocks inside the auth callback
        setTimeout(() => {
          loadUserProfile(sess.user!.id);
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const hasUser = !!session?.user;
      setIsAuthenticated(hasUser);

      if (hasUser && session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const userProfile = await usersService.getById(userId);
      setUser(userProfile);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Do not force sign out if profile loading fails; keep session and auth state
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id);
        toast({
          title: 'Login realizado com sucesso',
          description: `Bem-vindo de volta!`,
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({
        title: 'Erro no login',
        description: error.message || 'Email ou senha incorretos',
        variant: 'destructive',
      });
      throw error;
    }
  }, [navigate, toast]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    toast({
      title: 'Logout realizado',
      description: 'Até logo!',
    });
    navigate('/login');
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};