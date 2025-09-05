import React, { createContext, useContext, useState, useCallback } from 'react';
import { AuthState, User, LoginCredentials } from '@/lib/types';
import { authenticateUser } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('hotelfix_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      const authenticatedUser = authenticateUser(credentials.email, credentials.password);
      
      if (authenticatedUser) {
        setUser(authenticatedUser);
        localStorage.setItem('hotelfix_user', JSON.stringify(authenticatedUser));
        toast({
          title: 'Login realizado com sucesso',
          description: `Bem-vindo de volta, ${authenticatedUser.name}!`,
        });
        navigate('/dashboard');
      } else {
        throw new Error('Credenciais inválidas');
      }
    } catch (error) {
      toast({
        title: 'Erro no login',
        description: 'Email ou senha incorretos',
        variant: 'destructive',
      });
      throw error;
    }
  }, [navigate, toast]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('hotelfix_user');
    toast({
      title: 'Logout realizado',
      description: 'Até logo!',
    });
    navigate('/login');
  }, [navigate, toast]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
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