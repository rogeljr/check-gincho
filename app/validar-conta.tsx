import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import authService from '../services/auth.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ValidarContaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validarConta();
  }, [token]);

  const validarConta = async () => {
    try {
      if (!token) {
        setError('Token de validação não encontrado');
        setLoading(false);
        return;
      }

      const response = await authService.validarConta(token);
      setSuccess(true);
      setLoading(false);

      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.replace('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao validar conta');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Validando sua conta...</Text>
      </View>
    );
  }

  if (success) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>Conta Validada com Sucesso!</Text>
          <Text style={styles.successMessage}>
            Sua conta foi ativada! Agora você pode fazer login no aplicativo com seu código da empresa e a senha que você criou.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Próximos passos:</Text>
            <Text style={styles.infoItem}>• Abra a aba de Login</Text>
            <Text style={styles.infoItem}>• Digite seu código da empresa</Text>
            <Text style={styles.infoItem}>• Digite a senha que você criou</Text>
            <Text style={styles.infoItem}>• Comece a registrar seus sinistros!</Text>
          </View>
          <Text style={styles.redirectText}>
            Redirecionando para login em alguns segundos...
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.buttonText}>Ir para Login Agora</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }}
    >
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>✗</Text>
        <Text style={styles.errorTitle}>Erro ao Validar Conta</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.buttonText}>Voltar para Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    fontSize: 80,
    color: '#4CAF50',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  redirectText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorIcon: {
    fontSize: 80,
    color: '#f44336',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
