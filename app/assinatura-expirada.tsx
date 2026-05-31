import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AssinaturaExpiradaScreen() {
  const { empresa, signOut, assinaturaExpirada } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const diasAtrasados = Math.abs(empresa?.diasRestantes ?? 0);

  // Monitora se a assinatura deixou de estar expirada
  useEffect(() => {
    if (!assinaturaExpirada) {
      // Assinatura não está mais expirada, redireciona para home
      router.replace('/(tabs)');
    }
  }, [assinaturaExpirada]);

  async function handleRenovar() {
    // Vai para a tela de assinatura/pagamento que já tem toda a lógica de verificação
    router.replace('/assinatura');
  }

  async function handleSair() {
    try {
      setLoading(true);
      console.log('🚪 Iniciando logout...');
      await signOut();
      console.log('✅ Logout realizado, redirecionando para login');
      // Usa replace para não deixar na pilha de navegação
      // Aguarda um pouco para garantir que o contexto foi atualizado
      setTimeout(() => {
        router.replace('/login');
      }, 100);
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Erro ao fazer logout. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 20 }]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>⏰</Text>
        <Text style={styles.title}>Assinatura Expirada</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Sua assinatura venceu</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Empresa:</Text>
          <Text style={styles.infoValue}>{empresa?.nome}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[styles.infoValue, styles.expired]}>
            {diasAtrasados} {diasAtrasados === 1 ? 'dia' : 'dias'} atrásado
          </Text>
        </View>

        <Text style={styles.message}>
          Para continuar usando o Check Guincho, é necessário renovar sua assinatura.
        </Text>

        <Text style={styles.message}>
          Clique em Renovar Assinatura para ir ao pagamento.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) + 16 }]}>
        <TouchableOpacity
          style={styles.buttonRenovar}
          onPress={handleRenovar}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonTextRenovar}>Renovar Assinatura</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buttonSair}
          onPress={handleSair}
          disabled={loading}
        >
          <Text style={styles.buttonTextSair}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  expired: {
    color: '#ff6b6b',
  },
  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginTop: 20,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  buttonRenovar: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextRenovar: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSair: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonTextSair: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
