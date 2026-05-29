import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { databaseService, SinistroLocal } from '../../services/database.service';
import apiService from '../../services/api.service';
import { useAuth } from '../../contexts/AuthContext';

export default function SinistrosPendentesScreen() {
  const router = useRouter();
  const { assinaturaExpirada } = useAuth();
  const [sinistrosPendentes, setSinistrosPendentes] = useState<SinistroLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Monitora se a assinatura expirou enquanto estava vendo esta tela
  useFocusEffect(
    useCallback(() => {
      if (assinaturaExpirada) {
        console.log('⏰ Assinatura expirada detectada, redirecionando...');
        router.replace('/assinatura-expirada');
        return;
      }
      carregarSinistrosPendentes();
    }, [assinaturaExpirada, router])
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  const carregarSinistrosPendentes = async () => {
    try {
      setLoading(true);
      const pendentes = await databaseService.listarSinistrosPendentes();
      setSinistrosPendentes(pendentes || []);
    } catch (error) {
      console.error('Erro ao carregar sinistros pendentes:', error);
      Alert.alert('Erro', 'Não foi possível carregar sinistros pendentes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await carregarSinistrosPendentes();
    setRefreshing(false);
  };

  const sincronizarSinistro = async (sinistro: SinistroLocal) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Sem conexão com a internet. Tente novamente quando voltar online.');
      return;
    }

    try {
      setLoading(true);

      // Preparar dados para envio (mantém status finalizado se tiver)
      const sinistroData = {
        numero_sinistro: sinistro.numero_sinistro,
        nome_cliente: sinistro.nome_cliente,
        cpf_cliente: sinistro.cpf_cliente,
        telefone_cliente: sinistro.telefone_cliente,
        placa_veiculo: sinistro.placa_veiculo,
        modelo_veiculo: sinistro.modelo_veiculo,
        cor_veiculo: sinistro.cor_veiculo,
        tipo_atendimento: 'Guincho',
        origem_latitude: sinistro.origem_latitude,
        origem_longitude: sinistro.origem_longitude,
        origem_endereco: sinistro.origem_endereco,
        destino_latitude: sinistro.destino_latitude,
        destino_longitude: sinistro.destino_longitude,
        destino_endereco: sinistro.destino_endereco,
        quilometragem: sinistro.quilometragem,
        observacoes: sinistro.observacoes,
        status: sinistro.status, // Mantém finalizado se já tiver assinatura
      };

      // Se tem servidor_id, é atualização
      if (sinistro.servidor_id) {
        await apiService.put(`sinistros/${sinistro.servidor_id}`, sinistroData);
        
        // Sincronizar assinatura se houver
        if (sinistro.assinatura_base64) {
          try {
            // Converter base64 para DataURI se necessário
            const assinaturaDataUri = sinistro.assinatura_base64.startsWith('data:') 
              ? sinistro.assinatura_base64 
              : `data:image/png;base64,${sinistro.assinatura_base64}`;
            
            await apiService.post(`sinistros/${sinistro.servidor_id}/assinatura`, {
              assinatura_base64: assinaturaDataUri,
              nome: sinistro.nome_cliente
            });
          } catch (error) {
            console.warn('Erro ao sincronizar assinatura:', error);
          }
        }
      } else {
        // Se não tem, é criação
        const response = await apiService.post('sinistros', sinistroData);
        sinistro.servidor_id = (response as any).id;
      }

      // Sincronizar fotos
      const fotos = await databaseService.listarFotosSinistro(sinistro.id!);
      for (const foto of fotos) {
        if (!foto.servidor_id && foto.base64) {
          try {
            const fotoResponse = await apiService.post(`sinistros/${sinistro.servidor_id}/fotos`, {
              imagem_base64: foto.base64,
              tipo: foto.tipo,
              descricao: foto.descricao,
            });
            await databaseService.atualizarFoto(foto.id!, { servidor_id: (fotoResponse as any).id, sincronizado: true });
          } catch (error) {
            console.warn('Erro ao sincronizar foto:', error);
          }
        }
      }

      // Marcar como sincronizado e salvar servidor_id
      await databaseService.atualizarSinistro(sinistro.id!, { 
        sincronizado: true,
        servidor_id: sinistro.servidor_id 
      });

      Alert.alert('Sucesso', 'Sinistro sincronizado com sucesso!');
      await carregarSinistrosPendentes();
    } catch (error: any) {
      console.error('Erro ao sincronizar sinistro:', error);
      Alert.alert('Erro', error?.message || 'Falha ao sincronizar sinistro');
    } finally {
      setLoading(false);
    }
  };

  const abrirSinistro = (sinistro: SinistroLocal) => {
    router.push({
      pathname: '/sinistro/novo',
      params: { edit_id: sinistro.servidor_id || sinistro.id },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading && sinistrosPendentes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sinistros Pendentes</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: isOnline ? '#27AE60' : '#E74C3C' }
        ]}>
          <Text style={styles.statusText}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {sinistrosPendentes.length} sinistro(s) aguardando sincronização
        </Text>
        {!isOnline && (
          <Text style={styles.warningText}>
            ⚠️ Sem internet. Sincronização automática quando voltar online.
          </Text>
        )}
      </View>

      {/* Lista */}
      {sinistrosPendentes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum sinistro pendente</Text>
          <Text style={styles.emptySubtext}>Todos os sinistros foram sincronizados ✓</Text>
        </View>
      ) : (
        <FlatList
          data={sinistrosPendentes}
          keyExtractor={(item) => `${item.id}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>#{item.numero_sinistro}</Text>
                  <Text style={styles.cardClient}>{item.nome_cliente}</Text>
                  <Text style={styles.cardPlate}>Placa: {item.placa_veiculo}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <View style={[
                  styles.syncStatus,
                  { backgroundColor: item.sincronizado ? '#27AE60' : '#F39C12' }
                ]}>
                  <Text style={styles.syncStatusText}>
                    {item.sincronizado ? '✓' : '⟳'}
                  </Text>
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => abrirSinistro(item)}
                >
                  <Text style={styles.viewButtonText}>Visualizar</Text>
                </TouchableOpacity>

                {!item.sincronizado && isOnline && (
                  <TouchableOpacity
                    style={styles.syncButton}
                    onPress={() => sincronizarSinistro(item)}
                  >
                    <Text style={styles.syncButtonText}>Sincronizar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    marginBottom: 5,
  },
  warningText: {
    fontSize: 12,
    color: '#E74C3C',
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95A5A6',
  },
  listContent: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardClient: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 4,
  },
  cardPlate: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: '#95A5A6',
  },
  syncStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStatusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#3498DB',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#27AE60',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
