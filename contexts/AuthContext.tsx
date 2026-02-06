import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService, { Empresa } from '../services/auth.service';

interface AuthContextData {
  empresa: Empresa | null;
  loading: boolean;
  assinaturaExpirada: boolean;
  signIn: (codigo: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateEmpresa: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [assinaturaExpirada, setAssinaturaExpirada] = useState(false);
  
  useEffect(() => {
    loadStoredData();
  }, []);
  
  // Helper function to check if subscription is expired
  function verificarAssinaturaExpirada(empresaData: Empresa | null): boolean {
    if (!empresaData) return false;
    const diasRestantes =
      empresaData.diasRestantes ?? (empresaData as any).dias_restantes ?? 0;
    return diasRestantes <= 0;
  }
  
  async function loadStoredData() {
    try {
      const token = await AsyncStorage.getItem('@checkguincho:token');
      const empresaJson = await AsyncStorage.getItem('@checkguincho:empresa');
      
      // Se não tem token ou empresa salvos, vai para login
      if (!token || !empresaJson) {
        setLoading(false);
        return;
      }
      
      // Tentar carregar empresa local primeiro
      const empresaLocal = JSON.parse(empresaJson);
      setEmpresa(empresaLocal);
      setAssinaturaExpirada(verificarAssinaturaExpirada(empresaLocal));
      
      // Tentar validar com o servidor (não bloqueante)
      try {
        const empresaAtualizada = await authService.getEmpresa();
        setEmpresa(empresaAtualizada);
        setAssinaturaExpirada(verificarAssinaturaExpirada(empresaAtualizada));
      } catch (error) {
        console.log('⚠️ Servidor offline - usando dados locais:', error);
        // Mantém empresa local mesmo se servidor estiver offline
      }
    } catch (error) {
      console.log('❌ Erro ao carregar dados - limpando autenticação:', error);
      // Se der erro ao carregar, limpa tudo e vai para login
      await authService.logout();
      setEmpresa(null);
      setAssinaturaExpirada(false);
    } finally {
      setLoading(false);
    }
  }
  
  async function signIn(codigo: string, senha: string) {
    try {
      const response = await authService.login(codigo, senha);
      setEmpresa(response.empresa);
      setAssinaturaExpirada(verificarAssinaturaExpirada(response.empresa));
    } catch (error) {
      throw error;
    }
  }
  
  async function signOut() {
    await authService.logout();
    setEmpresa(null);
    setAssinaturaExpirada(false);
  }
  
  async function updateEmpresa() {
    try {
      const empresaAtualizada = await authService.getEmpresa();
      setEmpresa(empresaAtualizada);
      setAssinaturaExpirada(verificarAssinaturaExpirada(empresaAtualizada));
    } catch (error) {
      console.log('Erro ao atualizar empresa:', error);
    }
  }
  
  return (
    <AuthContext.Provider
      value={{
        empresa,
        loading,
        assinaturaExpirada,
        signIn,
        signOut,
        updateEmpresa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return context;
}
