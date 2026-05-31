import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, Redirect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api.service';
import { databaseService, SinistroLocal } from '../../services/database.service';
import { ENDPOINTS } from '../../config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Sinistro {
  id: number;
  numero_sinistro: string;
  nome_cliente: string;
  placa_veiculo: string;
  status: string;
  createdAt: string;
}

interface SinistroListItem extends Sinistro {
  isLocal?: boolean;
  local_id?: number;
  servidor_id?: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { empresa, loading: authLoading, updateEmpresa, assinaturaExpirada } = useAuth();
  
  const [sinistros, setSinistros] = useState<SinistroListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Date filter state
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(today);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Monitora se a assinatura expirou enquanto estava vendo esta tela
  useFocusEffect(
    useCallback(() => {
      if (assinaturaExpirada) {
        console.log('⏰ Assinatura expirada detectada, redirecionando...');
        router.replace('/assinatura-expirada');
      }
    }, [assinaturaExpirada, router])
  );
  
  useEffect(() => {
    if (empresa) {
      loadSinistros();
    }
  }, [empresa, startDate, endDate]);
  
  const loadSinistros = async () => {
    try {
      setLoading(true);
      // Format dates for API: YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const response = await apiService.get<SinistroListItem[]>(
        `${ENDPOINTS.SINISTROS}?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      const apiSinistros = response || [];

      // Também carregar sinistros locais não sincronizados
      await databaseService.initDatabase();
      const locais = await databaseService.listarSinistrosNaoSincronizados();
      const serverIds = new Set(apiSinistros.map(s => s.id));

      const locaisMap: SinistroListItem[] = locais
        .filter((l: SinistroLocal) => !l.servidor_id || !serverIds.has(l.servidor_id))
        .map((l: SinistroLocal) => ({
          id: l.id || 0,
          local_id: l.id,
          servidor_id: l.servidor_id,
          numero_sinistro: l.numero_sinistro,
          nome_cliente: l.nome_cliente,
          placa_veiculo: l.placa_veiculo,
          status: 'offline',
          createdAt: l.createdAt,
          isLocal: true,
        }));

      setSinistros([...locaisMap, ...apiSinistros]);
    } catch (error) {
      console.error('Erro ao carregar sinistros:', error);
      try {
        await databaseService.initDatabase();
        const locais = await databaseService.listarSinistrosNaoSincronizados();
        const locaisMap: SinistroListItem[] = (locais || []).map((l: SinistroLocal) => ({
          id: l.id || 0,
          local_id: l.id,
          servidor_id: l.servidor_id,
          numero_sinistro: l.numero_sinistro,
          nome_cliente: l.nome_cliente,
          placa_veiculo: l.placa_veiculo,
          status: 'offline',
          createdAt: l.createdAt,
          isLocal: true,
        }));
        setSinistros(locaisMap);
      } catch (localError) {
        console.error('Erro ao carregar sinistros locais:', localError);
        setSinistros([]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await updateEmpresa();
    await loadSinistros();
    setRefreshing(false);
  };
  
  const handleStartDateChange = (event: any, date?: Date) => {
    setShowStartDatePicker(false);
    if (date) {
      setStartDate(date);
    }
  };
  
  const handleEndDateChange = (event: any, date?: Date) => {
    setShowEndDatePicker(false);
    if (date) {
      setEndDate(date);
    }
  };
  
  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'offline': return '#8E44AD';
      case 'rascunho': return '#95A5A6';
      case 'em_andamento': return '#3498DB';
      case 'finalizado': return '#27AE60';
      default: return '#95A5A6';
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'offline': return 'Offline';
      case 'rascunho': return 'Rascunho';
      case 'em_andamento': return 'Em Andamento';
      case 'finalizado': return 'Finalizado';
      default: return status;
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  const getDiasRestantesColor = (dias: number) => {
    if (dias > 3) return '#27AE60';
    if (dias > 0) return '#F39C12';
    return '#E74C3C';
  };
  
  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#27AE60" />
      </View>
    );
  }
  
  if (!empresa) {
    return <Redirect href="/login" />;
  }
  
  return (
    <View style={styles.container}>
      {/* Header com informações da empresa */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.companyName}>{empresa.nome}</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => router.push('/configuracoes')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.statusContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getDiasRestantesColor(empresa?.diasRestantes || 0) }
          ]}>
            <Text style={styles.statusText}>
              {empresa?.diasRestantes || 0} dias restantes
            </Text>
          </View>
        </View>
        
        {empresa?.diasRestantes !== undefined && empresa.diasRestantes <= 3 && (
          <Text style={styles.warningText}>
            {empresa.diasRestantes > 0
              ? '⚠️ Seu período de teste está acabando!'
              : '⚠️ Período de teste encerrado. Atualize sua assinatura.'}
          </Text>
        )}
      </View>
      
      {/* Filtro de data */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Período:</Text>
        <View style={styles.dateFilterRow}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>De: {formatDateDisplay(startDate)}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>Até: {formatDateDisplay(endDate)}</Text>
          </TouchableOpacity>
        </View>
        
        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={handleStartDateChange}
          />
        )}
        
        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={handleEndDateChange}
          />
        )}
      </View>
      
      {/* Botão novo sinistro */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.newButton, { flex: 1 }]}
          onPress={() => router.push('/sinistro/novo')}
        >
          <Text style={styles.newButtonText}>+ Novo Sinistro</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.syncButton, { marginLeft: 12 }]}
          onPress={() => router.push('/sinistros-offline')}
        >
          <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
        </TouchableOpacity>
      </View>
      
      {/* Lista de sinistros */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Sinistros Recentes</Text>
        
        {sinistros.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum sinistro registrado</Text>
            <Text style={styles.emptySubtext}>
              Toque em Novo Sinistro para começar
            </Text>
          </View>
        ) : (
          <FlatList
            data={sinistros}
            keyExtractor={(item) => item.isLocal ? `local_${item.local_id}` : item.id.toString()}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 88 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sinistroCard}
                onPress={() => {
                  if (item.isLocal && item.local_id) {
                    router.push(`/sinistro/novo?local_id=${item.local_id}`);
                  } else {
                    router.push(`/sinistro/novo?edit_id=${item.id}`);
                  }
                }}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardNumber}>#{item.numero_sinistro}</Text>
                  <View style={[
                    styles.cardStatus,
                    { backgroundColor: getStatusColor(item.status) }
                  ]}>
                    <Text style={styles.cardStatusText}>
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.cardClient}>{item.nome_cliente}</Text>
                <Text style={styles.cardPlate}>Veículo: {item.placa_veiculo}</Text>
                <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  warningText: {
    marginTop: 10,
    fontSize: 12,
    color: '#E74C3C',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '500',
  },
  newButton: {
    backgroundColor: '#27AE60',
    margin: 20,
    marginRight: 8,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  syncButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  newButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
  sinistroCard: {
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
    alignItems: 'center',
    marginBottom: 8,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  cardStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardClient: {
    fontSize: 15,
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
});
