import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/auth.service';
import pagamentoService, { Pagamento } from '../services/pagamento.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AssinaturaScreen() {
  const { empresa, updateEmpresa } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loadingPagamentos, setLoadingPagamentos] = useState(true);
  const [criandoPagamento, setCriandoPagamento] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);
  const intervalRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);
  const diasRestantes = empresa?.diasRestantes ?? 0;
  const pagamentoDisponivel = diasRestantes <= 0;

  const carregarPagamentos = useCallback(async () => {
    try {
      const lista = await pagamentoService.listarPagamentos();
      setPagamentos(lista || []);
      
      // Verificar se tem pagamento pendente recente (últimas 2 horas)
      const pendente = lista.find(p => {
        if (p.status !== 'pending') return false;
        const criado = new Date(p.createdAt).getTime();
        const agora = Date.now();
        const duasHoras = 2 * 60 * 60 * 1000;
        return (agora - criado) < duasHoras;
      });
      
      if (pendente) {
        iniciarVerificacaoAutomatica();
      }
    } catch (error: any) {
      console.warn('Erro ao listar pagamentos:', error?.message || error);
    } finally {
      setLoadingPagamentos(false);
    }
  }, []);

  useEffect(() => {
    carregarPagamentos();
    
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        carregarPagamentos();
        updateEmpresa();
      }
    });
    
    return () => {
      subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [carregarPagamentos]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Iniciando atualização...');
      
      // Primeiro carrega pagamentos
      await carregarPagamentos();
      console.log('✅ Pagamentos carregados');
      
      // Depois atualiza empresa
      await updateEmpresa();
      console.log('✅ Empresa atualizada');
      
      // Aguarda e verifica novamente
      setTimeout(async () => {
        try {
          const empresaAtualizada = await authService.getEmpresa();
          console.log('📊 Dados atualizados verificados:', empresaAtualizada);
          
          if (empresaAtualizada?.diasRestantes && empresaAtualizada.diasRestantes > 0) {
            // Pagamento foi aprovado! Redireciona direto
            console.log('✅ REDIRECIONANDO PARA HOME - router.push');
            router.push('/(tabs)');
            return;
          } else {
            // Ainda não foi aprovado
            Alert.alert(
              'ℹ️ Atualizando',
              'Os dados foram atualizados. Se o pagamento for confirmado, você será redirecionado automaticamente em alguns minutos.',
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          console.error('Erro ao verificar empresa:', error);
          Alert.alert('Erro', 'Erro ao verificar pagamento.');
        }
      }, 1200);
    } catch (error) {
      console.error('❌ Erro ao atualizar:', error);
      Alert.alert('Erro', 'Erro ao atualizar dados. Tente novamente.');
    } finally {
      setRefreshing(false);
    }
  };

  const iniciarVerificacaoAutomatica = () => {
    if (verificandoPagamento) return;
    
    setVerificandoPagamento(true);
    setTempoRestante(60); // 60 minutos = 1 hora
    
    // Contador de tempo
    intervalRef.current = setInterval(() => {
      setTempoRestante(prev => {
        if (prev === null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setVerificandoPagamento(false);
          return null;
        }
        return prev - 1;
      });
    }, 60000); // A cada 1 minuto
    
    // Verificação a cada 2 minutos
    const verificar = async () => {
      try {
        const lista = await pagamentoService.listarPagamentos();
        const aprovado = lista.find(p => p.status === 'approved' && 
          new Date(p.data_pagamento || p.updatedAt).getTime() > Date.now() - 3600000
        );
        
        if (aprovado) {
          if (intervalRef.current) clearInterval(intervalRef.current as any);
          if (pollingRef.current) clearTimeout(pollingRef.current as any);
          setVerificandoPagamento(false);
          setTempoRestante(null);
          
          await updateEmpresa();
          Alert.alert(
            '✅ Pagamento Detectado!',
            'Seu pagamento foi confirmado e a assinatura foi renovada automaticamente!',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
          return;
        }
        
        // Continuar verificando se ainda está no prazo
        if (tempoRestante && tempoRestante > 0) {
          pollingRef.current = setTimeout(verificar, 120000); // 2 minutos
        }
      } catch (error) {
        console.warn('Erro ao verificar pagamento:', error);
        pollingRef.current = setTimeout(verificar, 120000);
      }
    };
    
    verificar();
  };

  const handleCriarPagamento = async () => {
    try {
      if (!pagamentoDisponivel) {
        Alert.alert(
          'Renovação ainda indisponível',
          `Sua assinatura ainda tem ${diasRestantes} dia(s) restante(s). A renovação ficará disponível na data da próxima cobrança.`
        );
        return;
      }

      setCriandoPagamento(true);
      const quantidadeLicencas = empresa?.quantidade_licencas || 1;
      const pref = await pagamentoService.selecionarLicencas(quantidadeLicencas);
      const url = pref.checkout_url || pref.init_point || pref.sandbox_init_point;

      if (!url) {
        Alert.alert('Erro', 'Não foi possível gerar o link de pagamento.');
        return;
      }

      Alert.alert(
        'Redirecionando para Pagamento',
        'Você será redirecionado para o Mercado Pago. Após efetuar o pagamento, o app verificará automaticamente a aprovação (pode levar alguns minutos).',
        [
          {
            text: 'OK',
            onPress: async () => {
              await Linking.openURL(url);
              // Aguardar 5 segundos e iniciar verificação
              setTimeout(() => {
                iniciarVerificacaoAutomatica();
                carregarPagamentos();
              }, 5000);
            }
          }
        ]
      );
    } catch (error: any) {
      const mensagem =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error?.message ||
        'Falha ao gerar pagamento.';
      Alert.alert('Erro', mensagem);
    } finally {
      setCriandoPagamento(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatStatus = (status: Pagamento['status']) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'pending':
        return 'Pendente';
      case 'rejected':
        return 'Rejeitado';
      case 'cancelled':
        return 'Cancelado';
      case 'refunded':
        return 'Estornado';
      default:
        return status;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 30 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Assinatura e Pagamento</Text>
        <Text style={styles.subtitle}>Gerencie sua assinatura mensal do Check Guincho.</Text>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Status da Assinatura</Text>
        <Text style={[styles.statusValue, { color: diasRestantes > 0 ? '#2E7D32' : '#C62828' }]}
        >
          {diasRestantes > 0 ? 'Ativa' : 'Expirada'}
        </Text>
        <Text style={styles.statusInfo}>
          {diasRestantes} dias restantes
        </Text>

        {empresa?.diasRestantes !== undefined && empresa.diasRestantes <= 3 && (
          <Text style={styles.warningText}>
            {empresa.diasRestantes > 0
              ? '⚠️ Seu período está acabando.'
              : '❌ Assinatura expirada. Faça o pagamento para continuar.'}
          </Text>
        )}
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.actionTitle}>Pagamento</Text>
        <Text style={styles.actionText}>
          Pagamento via Mercado Pago (PIX, boleto ou cartão). Após aprovado, a assinatura é estendida por 30 dias.
        </Text>

        <TouchableOpacity
          style={[styles.payButton, (criandoPagamento || !pagamentoDisponivel) && styles.buttonDisabled]}
          onPress={handleCriarPagamento}
          disabled={criandoPagamento || !pagamentoDisponivel}
        >
          {criandoPagamento ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
              {pagamentoDisponivel ? 'Pagar / Renovar Assinatura' : 'Disponível na próxima cobrança'}
            </Text>
          )}
        </TouchableOpacity>

        {!pagamentoDisponivel && (
          <Text style={styles.paymentLockedText}>
            A cobrança só pode ser gerada quando a assinatura vencer.
          </Text>
        )}

        {verificandoPagamento && tempoRestante !== null && (
          <View style={styles.verificationBox}>
            <ActivityIndicator size="small" color="#27AE60" />
            <Text style={styles.verificationText}>
              ⏱️ Verificando pagamento automaticamente...
            </Text>
            <Text style={styles.verificationSubtext}>
              Tempo restante: {tempoRestante} minuto(s)
            </Text>
            <Text style={styles.verificationInfo}>
              O pagamento pode levar alguns minutos para ser aprovado.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Text style={styles.refreshButtonText}>Atualizar Agora</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.listTitle}>Histórico de Pagamentos</Text>

        {loadingPagamentos ? (
          <ActivityIndicator color="#27AE60" />
        ) : pagamentos.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum pagamento encontrado.</Text>
        ) : (
          pagamentos.map((p) => (
            <View key={p.id} style={styles.paymentRow}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentValue}>R$ {p.valor}</Text>
                <Text style={styles.paymentMeta}>Data: {formatDate(p.data_pagamento || p.createdAt)}</Text>
              </View>
              <View style={styles.paymentStatusBox}>
                <Text style={styles.paymentStatusText}>{formatStatus(p.status)}</Text>
                <Text style={styles.paymentTypeText}>{p.tipo_pagamento?.toUpperCase()}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6ECF3',
  },
  statusLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#777',
    marginBottom: 6,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusInfo: {
    marginTop: 4,
    fontSize: 14,
    color: '#333',
  },
  warningText: {
    marginTop: 8,
    color: '#D35400',
    fontSize: 13,
  },
  actionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6ECF3',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  actionText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 14,
  },
  payButton: {
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  refreshButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  refreshButtonText: {
    color: '#27AE60',
    fontWeight: '600',
  },
  paymentLockedText: {
    color: '#777',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  listCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6ECF3',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1A1A1A',
  },
  emptyText: {
    color: '#888',
    fontSize: 13,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  paymentMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  paymentStatusBox: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C3E50',
  },
  paymentTypeText: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  verificationBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#E8F8F5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
    alignItems: 'center',
  },
  verificationText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#27AE60',
    textAlign: 'center',
  },
  verificationSubtext: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#1E7D4C',
  },
  verificationInfo: {
    marginTop: 6,
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
});
