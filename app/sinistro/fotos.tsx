import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Image, Alert, ActivityIndicator, Modal, Dimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../../services/api.service';
import { databaseService } from '../../services/database.service';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';

/**
 * TELA: FOTOS DO SINISTRO
 * FUNÇÃO:
 * - Capturar fotos com câmera
 * - Selecionar da galeria
 * - Salvar URIs das imagens para envio ao servidor
 */
interface Foto {
  id: string;
  uri: string;
  nome: string;
  base64?: string;
}

const FotosSinistro = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { servidor_id, local_id } = useLocalSearchParams();
  const servidorIdParam = Array.isArray(servidor_id) ? servidor_id[0] : servidor_id;
  const localIdParam = Array.isArray(local_id) ? local_id[0] : local_id;
  const sinistroId = servidorIdParam ? String(servidorIdParam) : null;
  const localSinistroId = localIdParam ? Number(localIdParam) : null;

  // ======================
  // LISTA DE FOTOS
  // ======================
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(false);
  const [fotoSelecionada, setFotoSelecionada] = useState<Foto | null>(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const MAX_FOTOS = 10;

  // Recarregar fotos sempre que a tela for focada
  useFocusEffect(
    React.useCallback(() => {
      carregarFotosLocais();
    }, [localSinistroId])
  );

  const carregarFotosLocais = async () => {
    try {
      if (!localSinistroId) return;
      await databaseService.initDatabase();
      const fotosLocais = await databaseService.listarFotosSinistro(localSinistroId);
      console.log(`📷 [FOTOS] Carregadas ${fotosLocais.length} fotos do sinistro ${localSinistroId}`);
      if (fotosLocais.length > 0) {
        setFotos(
          fotosLocais.map((f) => ({
            id: `local_${f.id}`,
            uri: f.uri,
            nome: f.descricao || 'Foto',
            base64: f.base64 || undefined,
          }))
        );
      } else {
        setFotos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar fotos locais:', error);
    }
  };

  // ======================
  // ABRIR CÂMERA
  // ======================
  const handleAbrirCamera = async () => {
    try {
      if (fotos.length >= MAX_FOTOS) {
        Alert.alert('Limite atingido', `Você pode adicionar no máximo ${MAX_FOTOS} fotos por sinistro.`);
        return;
      }
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert('Permissão negada', 'É necessário permitir acesso à câmera');
        return;
      }

      setLoading(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        const novaFoto: Foto = {
          id: `foto_${Date.now()}`,
          uri: result.assets[0].uri,
          nome: `Foto ${fotos.length + 1}`,
        };
        setFotos([...fotos, novaFoto]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao tirar foto');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // SELECIONAR DA GALERIA
  // ======================
  const handleSelecionarGaleria = async () => {
    try {
      if (fotos.length >= MAX_FOTOS) {
        Alert.alert('Limite atingido', `Você pode adicionar no máximo ${MAX_FOTOS} fotos por sinistro.`);
        return;
      }
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert('Permissão negada', 'É necessário permitir acesso à galeria');
        return;
      }

      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets) {
        const vagas = MAX_FOTOS - fotos.length;
        const selecionadas = result.assets.slice(0, vagas);
        const novasFotos: Foto[] = selecionadas.map((asset, index) => ({
          id: `foto_${Date.now()}_${index}`,
          uri: asset.uri,
          nome: `Foto ${fotos.length + index + 1}`,
        }));
        setFotos([...fotos, ...novasFotos]);

        if (result.assets.length > vagas) {
          Alert.alert('Limite atingido', `Apenas ${vagas} foto(s) foram adicionadas. Limite de ${MAX_FOTOS} fotos por sinistro.`);
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao selecionar fotos');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // REMOVER FOTO
  // ======================
  const handleRemoverFoto = async (id: string) => {
    try {
      // Extrair ID local (formato: local_123)
      const fotoIdLocal = id.startsWith('local_') ? parseInt(id.replace('local_', '')) : null;
      
      if (fotoIdLocal && localSinistroId) {
        // Remover do banco de dados local
        await databaseService.deletarFoto(fotoIdLocal);
        console.log(`🗑️ [FOTOS] Foto ${fotoIdLocal} removida do banco local`);
      }
      
      // Remover da lista
      setFotos(fotos.filter(f => f.id !== id));
      
      Alert.alert('Sucesso', 'Foto removida');
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      Alert.alert('Erro', 'Não foi possível remover a foto');
    }
  };

  // ======================
  // VISUALIZAR FOTO
  // ======================
  const handleVisualizarFoto = (foto: Foto) => {
    setFotoSelecionada(foto);
    setModalVisivel(true);
  };

  // ======================
  // CONTINUAR FLUXO
  // ======================
  const handleContinuar = async () => {
    if (fotos.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos uma foto antes de continuar');
      return;
    }

    setLoading(true);

    try {
      // 🔒 MODO OFFLINE: Sempre salva localmente. Sincronização é feita depois.
      for (let i = 0; i < fotos.length; i++) {
        // Se já está marcado como local_ no ID, pula (já foi salvo)
        if (fotos[i].id.startsWith('local_')) {
          continue;
        }

        try {
          // Converter URI para base64
          const base64 = fotos[i].base64 || await FileSystem.readAsStringAsync(fotos[i].uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // 💾 Salvar APENAS localmente no banco de dados
          if (localSinistroId) {
            await databaseService.adicionarFoto({
              sinistro_local_id: localSinistroId,
              uri: fotos[i].uri,
              base64,
              tipo: 'imagem',
              descricao: fotos[i].nome,
              sincronizado: false,  // ⚠️ Marcar como NÃO sincronizado
              servidor_id: undefined,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error(`Erro ao salvar foto ${i + 1} localmente:`, error);
          Alert.alert('Erro', `Erro ao salvar foto ${i + 1}. Tente novamente.`);
          return;
        }
      }

      // ✅ Sucesso: Fotos salvas offline
      Alert.alert(
        'Fotos Salvas',
        `${fotos.length} foto(s) salvas no dispositivo.\n\nVocê poderá sincronizar com o servidor depois.`,
        [
          {
            text: 'Continuar Preenchendo',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Erro no processo de salvar fotos:', error);
      Alert.alert('Erro', 'Erro ao processar fotos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[
      styles.container,
      {
        paddingTop: Math.max(insets.top, 16) + 16,
        paddingBottom: Math.max(insets.bottom, 24) + 16,
      }
    ]}>
      <Text style={styles.title}>Fotos do Sinistro</Text>
      <Text style={styles.subtitle}>Total: {fotos.length} foto(s)</Text>

      {/* BOTÕES DE AÇÃO */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.cameraButton]} 
          onPress={handleAbrirCamera}
          disabled={loading}
        >
          <Ionicons name="camera" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Câmera</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.galleryButton]} 
          onPress={handleSelecionarGaleria}
          disabled={loading}
        >
          <Ionicons name="images" size={24} color="#fff" />
          <Text style={styles.actionButtonText}>Galeria</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Processando...</Text>
        </View>
      )}

      {/* LISTA DE FOTOS */}
      <FlatList
        data={fotos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.photoItem}>
            <TouchableOpacity onPress={() => handleVisualizarFoto(item)}>
              <Image source={{ uri: item.uri }} style={styles.photoImage} />
            </TouchableOpacity>
            <View style={styles.photoInfo}>
              <Text style={styles.photoName}>{item.nome}</Text>
              <Text style={styles.photoHint}>Toque na foto para visualizar</Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                Alert.alert(
                  'Remover Foto',
                  'Tem certeza que deseja remover esta foto?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { 
                      text: 'Remover', 
                      style: 'destructive',
                      onPress: () => handleRemoverFoto(item.id)
                    }
                  ]
                );
              }}
            >
              <Ionicons name="trash" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma foto adicionada ainda</Text>
        }
        style={styles.photoList}
        contentContainerStyle={[styles.photoListContent, { paddingBottom: Math.max(insets.bottom, 24) + 96 }]}
      />

      {/* CONTINUAR */}
      <TouchableOpacity 
        style={[styles.continueButton, loading && styles.buttonDisabled]} 
        onPress={handleContinuar}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueButtonText}>Enviar Fotos</Text>
        )}
      </TouchableOpacity>

      {/* MODAL DE VISUALIZAÇÃO DE FOTO */}
      <Modal
        visible={modalVisivel}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisivel(false)}
          >
            <View style={styles.modalContent}>
              {fotoSelecionada && (
                <>
                  <Image 
                    source={{ uri: fotoSelecionada.uri }} 
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => setModalVisivel(false)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FFF" />
                      <Text style={styles.modalButtonText}>Fechar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonDelete]}
                      onPress={() => {
                        setModalVisivel(false);
                        setTimeout(() => {
                          Alert.alert(
                            'Remover Foto',
                            'Tem certeza que deseja remover esta foto?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              { 
                                text: 'Remover', 
                                style: 'destructive',
                                onPress: () => handleRemoverFoto(fotoSelecionada.id)
                              }
                            ]
                          );
                        }, 300);
                      }}
                    >
                      <Ionicons name="trash" size={24} color="#FFF" />
                      <Text style={styles.modalButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

export default FotosSinistro;

// ======================
// ESTILOS
// ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2C3E50',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#FF6B6B',
  },
  galleryButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
  },
  photoList: {
    flex: 1,
  },
  photoListContent: {
    paddingBottom: 16,
  },
  photoItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 12,
  },
  photoInfo: {
    flex: 1,
  },
  photoName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C3E50',
  },
  photoHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  modalButtonDelete: {
    backgroundColor: '#FF3B30',
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
