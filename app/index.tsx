import { useEffect } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { empresa, loading, assinaturaExpirada } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!empresa) {
        // Sem empresa autenticada -> login
        router.replace('/login');
      } else if (assinaturaExpirada) {
        // Empresa autenticada mas assinatura expirada -> tela de expiração
        router.replace('/assinatura-expirada');
      } else {
        // Empresa autenticada e assinatura válida -> home
        router.replace('/(tabs)');
      }
    }
  }, [loading, empresa, assinaturaExpirada]);

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Fallback para evitar flash
  if (!empresa) {
    return <Redirect href="/login" />;
  } else if (assinaturaExpirada) {
    return <Redirect href="/assinatura-expirada" />;
  } else {
    return <Redirect href="/(tabs)" />;
  }
}
