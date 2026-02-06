import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import apiService from '../../services/api.service';

interface Sinistro {
  id: number;
  numero_sinistro?: string;
  nome_cliente: string;
  telefone_cliente?: string;
  placa_veiculo: string;
  modelo_veiculo?: string;
  cor_veiculo?: string;
  observacoes?: string;
  status: string;
  pdf_url?: string;
  createdAt: string;
  fotos?: Array<{ id: number; url: string }>;
}

export default function SinistroDetalheScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  
  const [sinistro, setSinistro] = useState<Sinistro | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);

  useEffect(() => {
    loadSinistro();
  }, [id]);

  const loadSinistro = async () => {
    try {
      setLoading(true);
      const sinistroId = Array.isArray(id) ? id[0] : id;
      
      console.log('📝 Carregando sinistro com ID:', sinistroId);
      const data = await apiService.get(`sinistros/${sinistroId}`);
      
      console.log('📦 Resposta recebida:', data);
      
      if (data) {
        setSinistro(data as any);
      } else {
        throw new Error('Dados vazios na resposta');
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar sinistro:', error);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      Alert.alert('Erro', 'Não foi possível carregar o sinistro');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const enviarWhatsApp = async () => {
    if (!sinistro?.telefone_cliente) {
      Alert.alert('Aviso', 'Número de telefone do cliente não disponível');
      return;
    }

    try {
      setEnviandoWhatsApp(true);
      
      // Chamar endpoint para gerar link WhatsApp
      const data: any = await apiService.post(`sinistros/${sinistro.id}/enviar-whatsapp`, {
        telefone_cliente: sinistro.telefone_cliente,
      });

      if (data && data.link) {
        // Abrir WhatsApp com link pré-configurado
        await Linking.openURL(data.link);
        Alert.alert('Sucesso', 'Abrindo WhatsApp...');
      }
    } catch (error) {
      console.error('Erro ao enviar WhatsApp:', error);
      Alert.alert('Erro', 'Não foi possível gerar link WhatsApp');
    } finally {
      setEnviandoWhatsApp(false);
    }
  };


  const abrirPDF = async () => {
    if (!sinistro?.pdf_url) {
      Alert.alert('Aviso', 'PDF não disponível para este sinistro');
      return;
    }

    try {
      await Linking.openURL(sinistro.pdf_url);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o PDF');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Carregando sinistro...</Text>
      </View>
    );
  }

  if (!sinistro) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={64} color="#CC0000" />
        <Text style={styles.errorText}>Sinistro não encontrado</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = new Date(sinistro.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Sinistro</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Número do Sinistro */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Número do Sinistro</Text>
          <Text style={styles.cardValue}>
            {sinistro.numero_sinistro || 'Sem número'}
          </Text>
        </View>

        {/* Informações do Cliente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{sinistro.nome_cliente}</Text>
          </View>
          {sinistro.telefone_cliente && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Telefone:</Text>
              <Text style={styles.value}>{sinistro.telefone_cliente}</Text>
            </View>
          )}
        </View>

        {/* Informações do Veículo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veículo</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Placa:</Text>
            <Text style={styles.valueHighlight}>{sinistro.placa_veiculo}</Text>
          </View>
          {sinistro.modelo_veiculo && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Modelo:</Text>
              <Text style={styles.value}>{sinistro.modelo_veiculo}</Text>
            </View>
          )}
          {sinistro.cor_veiculo && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Cor:</Text>
              <Text style={styles.value}>{sinistro.cor_veiculo}</Text>
            </View>
          )}
        </View>

        {/* Status e Data */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <View
              style={[
                styles.statusBadge,
                sinistro.status === 'Finalizado'
                  ? styles.statusFinalizado
                  : styles.statusRascunho,
              ]}
            >
              <Text style={styles.statusText}>{sinistro.status || 'Rascunho'}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Data:</Text>
            <Text style={styles.value}>{formattedDate}</Text>
          </View>
        </View>

        {/* Observações */}
        {sinistro.observacoes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.observacoesText}>{sinistro.observacoes}</Text>
          </View>
        )}

        {/* Fotos */}
        {sinistro.fotos && sinistro.fotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotos ({sinistro.fotos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {sinistro.fotos.map((foto) => (
                <Image
                  key={foto.id}
                  source={{ uri: foto.url }}
                  style={styles.fotoThumbnail}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Ações */}
        <View style={styles.acoes}>
          {sinistro.pdf_url && (
            <TouchableOpacity style={styles.botaoAcao} onPress={abrirPDF}>
              <MaterialIcons name="picture-as-pdf" size={20} color="#FFF" />
              <Text style={styles.botaoTexto}>Abrir PDF</Text>
            </TouchableOpacity>
          )}

          {sinistro.telefone_cliente && sinistro.pdf_url && (
            <TouchableOpacity
              style={[styles.botaoAcao, styles.botaoWhatsApp]}
              onPress={enviarWhatsApp}
              disabled={enviandoWhatsApp}
            >
              <MaterialIcons
                name={enviandoWhatsApp ? 'hourglass-empty' : 'message'}
                size={20}
                color="#FFF"
              />
              <Text style={styles.botaoTexto}>
                {enviandoWhatsApp ? 'Abrindo...' : 'Enviar WhatsApp'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#CC0000',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  valueHighlight: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusRascunho: {
    backgroundColor: '#FFF3CD',
  },
  statusFinalizado: {
    backgroundColor: '#D4EDDA',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  observacoesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  fotoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E0E0E0',
  },
  acoes: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  botaoAcao: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0066CC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoWhatsApp: {
    backgroundColor: '#25D366',
  },
  botaoGerar: {
    backgroundColor: '#27AE60',
  },
  botaoTexto: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#0066CC',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
