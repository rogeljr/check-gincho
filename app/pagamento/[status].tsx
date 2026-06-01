import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';

const getStatusText = (status?: string) => {
  switch (status) {
    case 'sucesso':
      return {
        title: 'Pagamento aprovado',
        description: 'Estamos atualizando sua assinatura.',
        color: '#27AE60'
      };
    case 'falha':
      return {
        title: 'Pagamento não aprovado',
        description: 'Volte para a tela de assinatura para tentar novamente.',
        color: '#C62828'
      };
    default:
      return {
        title: 'Pagamento pendente',
        description: 'O pagamento ainda pode levar alguns minutos para confirmar.',
        color: '#D9822B'
      };
  }
};

export default function RetornoPagamentoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status } = useLocalSearchParams<{ status?: string | string[] }>();
  const { updateEmpresa } = useAuth();
  const normalizedStatus = Array.isArray(status) ? status[0] : status;
  const statusText = getStatusText(normalizedStatus);

  const voltarParaAssinatura = () => {
    router.replace('/assinatura');
  };

  useEffect(() => {
    let active = true;

    const refreshAndReturn = async () => {
      await updateEmpresa();
      setTimeout(() => {
        if (active) voltarParaAssinatura();
      }, 1400);
    };

    refreshAndReturn();

    return () => {
      active = false;
    };
  }, [updateEmpresa]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.card}>
        <Text style={[styles.title, { color: statusText.color }]}>{statusText.title}</Text>
        <Text style={styles.description}>{statusText.description}</Text>
        <ActivityIndicator color={statusText.color} style={styles.loading} />
        <TouchableOpacity style={styles.button} onPress={voltarParaAssinatura}>
          <Text style={styles.buttonText}>Voltar para assinatura</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#E6ECF3',
    borderRadius: 10,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center'
  },
  description: {
    color: '#444',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center'
  },
  loading: {
    marginTop: 20
  },
  button: {
    backgroundColor: '#27AE60',
    borderRadius: 8,
    marginTop: 24,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700'
  }
});
