import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { databaseService, SinistroLocal } from '../services/database.service';
import apiService from '../services/api.service';
import { ENDPOINTS } from '../config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SinistroStatus {
  id: number;
  numero_sinistro: string;
  nome_cliente: string;
  status: 'sincronizado' | 'erro' | 'sincronizando' | 'pendente';
  mensagem?: string;
}

export default function SinistrosOfflineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sinistrosOffline, setSinistrosOffline] = useState<SinistroLocal[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [statusSincronizacao, setStatusSincronizacao] = useState<SinistroStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarSinistrosOffline();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    
    return unsubscribe;
  }, []);

  const carregarSinistrosOffline = async () => {
    try {
      setLoading(true);
      await databaseService.initDatabase();
      const sinistros = await databaseService.listarSinistros();
      
      // Filtrar apenas os não sincronizados
      const pendentes = sinistros.filter(s => !s.sincronizado);
      setSinistrosOffline(pendentes);
      
      // Inicializar status
      const status = pendentes
        .filter(s => s.id !== undefined)
        .map(s => ({
          id: s.id!,
          numero_sinistro: s.numero_sinistro,
          nome_cliente: s.nome_cliente,
          status: 'pendente' as const,
        }));
      setStatusSincronizacao(status);
    } catch (error) {
      console.error('Erro ao carregar sinistros offline:', error);
      Alert.alert('Erro', 'Erro ao carregar sinistros');
    } finally {
      setLoading(false);
    }
  };

  const sincronizarTodos = async () => {
    if (!isOnline) {
      Alert.alert('Sem conexão', 'Conecte-se à internet para sincronizar');
      return;
    }

    if (sinistrosOffline.length === 0) {
      Alert.alert('Nenhum sinistro', 'Não há sinistros para sincronizar');
      return;
    }

    setSincronizando(true);
    let sucessos = 0;
    let erros = 0;

    try {
      for (let i = 0; i < sinistrosOffline.length; i++) {
        const sinistro = sinistrosOffline[i];
        
        try {
          // Atualizar status para sincronizando
          setStatusSincronizacao(prev => 
            prev.map(s => s.id === sinistro.id 
              ? { ...s, status: 'sincronizando' as const, mensagem: 'Sincronizando...' }
              : s
            )
          );

          // 1️⃣ ENVIAR SINISTRO
          const sinistroData = {
            placa_veiculo: sinistro.placa_veiculo,
            tipo_atendimento: sinistro.tipo_atendimento || 'Guincho',
            nome_cliente: sinistro.nome_cliente,
            cpf_cliente: sinistro.cpf_cliente,
            telefone_cliente: sinistro.telefone_cliente,
            modelo_veiculo: sinistro.modelo_veiculo,
            cor_veiculo: sinistro.cor_veiculo,
            origem_latitude: sinistro.origem_latitude,
            origem_longitude: sinistro.origem_longitude,
            origem_endereco: sinistro.origem_endereco,
            destino_latitude: sinistro.destino_latitude,
            destino_longitude: sinistro.destino_longitude,
            destino_endereco: sinistro.destino_endereco,
            quilometragem: sinistro.quilometragem,
            observacoes: sinistro.observacoes,
          };

          const response = await apiService.post<{ id: number }>(
            ENDPOINTS.SINISTROS,
            sinistroData
          );
          
          const servidorId = response.id;

          // 2️⃣ ENVIAR FOTOS
          if (sinistro.id) {
            const fotos = await databaseService.listarFotosSinistro(sinistro.id);
            for (const foto of fotos) {
              try {
                await apiService.post(`sinistros/${servidorId}/fotos`, {
                  imagem_base64: foto.base64,
                  descricao: foto.descricao,
                  ordem: foto.ordem || 0,
                });

                // Marcar foto como sincronizada
                if (foto.id) {
                  await databaseService.atualizarFoto(foto.id, { sincronizado: true });
                }
              } catch (fotoError) {
                console.warn(`Erro ao enviar foto ${foto.id}:`, fotoError);
                // Continua com próximas fotos
              }
            }
          }

          // 3️⃣ ENVIAR ASSINATURA (se existir)
          if (sinistro.assinatura_base64) {
            try {
              await apiService.post(`sinistros/${servidorId}/assinatura`, {
                assinatura_base64: sinistro.assinatura_base64,
                nome: sinistro.nome_cliente,
              });
            } catch (assinError) {
              console.warn('Erro ao enviar assinatura:', assinError);
              // Continua mesmo assim
            }
          }

          // ✅ Marcar sinistro como sincronizado no local
          if (sinistro.id) {
            await databaseService.atualizarSinistro(sinistro.id, {
              sincronizado: true,
              servidor_id: servidorId,
            });
          }

          setStatusSincronizacao(prev => 
            prev.map(s => s.id === sinistro.id 
              ? { ...s, status: 'sincronizado' as const, mensagem: 'Sincronizado com sucesso' }
              : s
            )
          );

          sucessos++;
        } catch (sinError: any) {
          console.error(`Erro ao sincronizar sinistro ${sinistro.id}:`, sinError);
          
          setStatusSincronizacao(prev => 
            prev.map(s => s.id === sinistro.id 
              ? { 
                  ...s, 
                  status: 'erro' as const, 
                  mensagem: sinError.message || 'Erro ao sincronizar'
                }
              : s
            )
          );
          
          erros++;
        }
      }

      // 🎉 Resultado final
      Alert.alert(
        'Sincronização Concluída',
        `✅ ${sucessos} sincronizado(s)\n❌ ${erros} erro(s)`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (sucessos > 0) {
                carregarSinistrosOffline(); // Recarregar lista
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erro geral na sincronização:', error);
      Alert.alert('Erro', 'Erro na sincronização. Tente novamente.');
    } finally {
      setSincronizando(false);
    }
  };

  const renderizarItem = ({ item }: { item: SinistroStatus }) => {
    const getStatusColor = () => {
      switch (item.status) {
        case 'sincronizado':
          return '#27AE60';
        case 'erro':
          return '#E74C3C';
        case 'sincronizando':
          return '#3498DB';
        default:
          return '#95A5A6';
      }
    };

    const getStatusIcon = () => {
      switch (item.status) {
        case 'sincronizado':
          return 'checkmark-circle';
        case 'erro':
          return 'close-circle';
        case 'sincronizando':
          return 'hourglass';
        default:
          return 'ellipsis-horizontal';
      }
    };

    return (
      <View style={[styles.sinistroCard, { borderLeftColor: getStatusColor(), borderLeftWidth: 4 }]}>
        <View style={styles.sinistroHeader}>
          <View style={styles.sinistroInfo}>
            <Text style={styles.numeroSinistro}>{item.numero_sinistro}</Text>
            <Text style={styles.nomeSinistro}>{item.nome_cliente}</Text>
          </View>
          <Ionicons 
            name={getStatusIcon()} 
            size={24} 
            color={getStatusColor()} 
          />
        </View>
        {item.mensagem && (
          <Text style={[styles.mensagem, { color: getStatusColor() }]}>
            {item.mensagem}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498DB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Sincronizar Sinistros</Text>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#27AE60' : '#E74C3C' }]}>
          <Text style={styles.statusText}>{isOnline ? '● Online' : '● Offline'}</Text>
        </View>
      </View>

      {sinistrosOffline.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-circle" size={64} color="#27AE60" />
          <Text style={styles.emptyTitle}>Tudo Sincronizado!</Text>
          <Text style={styles.emptyText}>Não há sinistros pendentes de sincronização.</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📱 {sinistrosOffline.length} sinistro(s) aguardando sincronização
            </Text>
            {!isOnline && (
              <Text style={styles.warningText}>
                ⚠️ Sem conexão com a internet. Conecte-se para sincronizar.
              </Text>
            )}
          </View>

          <FlatList
            data={statusSincronizacao}
            renderItem={renderizarItem}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) + 96 }]}
            scrollEnabled={true}
          />

          <TouchableOpacity
            style={[
              styles.sincronizarButton,
              {
                opacity: sincronizando || !isOnline ? 0.6 : 1,
                bottom: Math.max(insets.bottom, 20),
              }
            ]}
            onPress={sincronizarTodos}
            disabled={sincronizando || !isOnline}
          >
            {sincronizando ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.sincronizarButtonText}>Sincronizando...</Text>
              </>
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.sincronizarButtonText}>Sincronizar Tudo</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2C3E50',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: '#E8F4F8',
    borderLeftColor: '#3498DB',
    borderLeftWidth: 4,
    padding: 16,
    margin: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  warningText: {
    fontSize: 13,
    color: '#E74C3C',
    marginTop: 8,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sinistroCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  sinistroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sinistroInfo: {
    flex: 1,
  },
  numeroSinistro: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  nomeSinistro: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 4,
  },
  mensagem: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  sincronizarButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#27AE60',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  sincronizarButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
