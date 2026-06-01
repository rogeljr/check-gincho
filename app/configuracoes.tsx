import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Share,
  ScrollView,
  Platform,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/auth.service';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface PrestadorConfig {
  nome?: string;
  empresa?: string;
  telefone?: string;
  logo?: string;
}

export default function ConfiguracoesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { empresa, signOut, updateEmpresa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState(false);
  const [isAdmin, setIsAdmin] = useState(true);
  const [nome, setNome] = useState(empresa?.nome || '');
  const [email, setEmail] = useState(empresa?.email || '');
  
  // Dados do Prestador
  const [editandoPrestador, setEditandoPrestador] = useState(false);
  const [prestadorConfig, setPrestadorConfig] = useState<PrestadorConfig>({});
  const [prestadorNome, setPrestadorNome] = useState('');
  const [prestadorEmpresa, setPrestadorEmpresa] = useState('');
  const [prestadorTelefone, setPrestadorTelefone] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [logoRemovida, setLogoRemovida] = useState(false);
  const [logoAlterada, setLogoAlterada] = useState(false);
  const [loadingPrestador, setLoadingPrestador] = useState(false);

  useEffect(() => {
    carregarConfigPrestador();
  }, [empresa]);

  useEffect(() => {
    const carregarUsuario = async () => {
      const usuarioJson = await AsyncStorage.getItem('@checkguincho:usuario');
      if (!usuarioJson) {
        setIsAdmin(true);
        return;
      }

      const usuario = JSON.parse(usuarioJson);
      setIsAdmin(usuario?.role === 'admin');
    };

    carregarUsuario();
  }, []);

  const carregarConfigPrestador = async () => {
    try {
      const config = await AsyncStorage.getItem('prestador_config');
      const serverConfig: PrestadorConfig = {
        nome: empresa?.prestador_nome || undefined,
        empresa: empresa?.nome || undefined,
        telefone: empresa?.prestador_telefone || undefined,
        logo: empresa?.logo_url || undefined,
      };

      if (config) {
        const parsed: PrestadorConfig = JSON.parse(config);
        const merged = {
          ...parsed,
          ...serverConfig,
          logo: serverConfig.logo || parsed.logo,
        };
        setPrestadorConfig(merged);
        setPrestadorNome(merged.nome || '');
        setPrestadorEmpresa(merged.empresa || empresa?.nome || '');
        setPrestadorTelefone(merged.telefone || '');
        setLogoPreview(merged.logo);
        setLogoAlterada(false);
      } else {
        setPrestadorConfig(serverConfig);
        setPrestadorNome(serverConfig.nome || '');
        setPrestadorEmpresa(serverConfig.empresa || empresa?.nome || '');
        setPrestadorTelefone(serverConfig.telefone || '');
        setLogoPreview(serverConfig.logo);
        setLogoAlterada(false);
      }
    } catch (error) {
      console.warn('Erro ao carregar config do prestador:', error);
    }
  };

  const selecionarLogo = async () => {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert('Permissão necessária', 'Você precisa permitir acesso às fotos');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!resultado.canceled && resultado.assets && resultado.assets[0]) {
        const asset = resultado.assets[0];
        
        // Converter para base64
        if (asset.uri) {
          const encoding = (FileSystem as any)?.EncodingType?.Base64 ?? 'base64';
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding,
          });
          const mimeType = asset.mimeType || 'image/jpeg';
          const dataUri = `data:${mimeType};base64,${base64}`;
          setLogoPreview(dataUri);
          setLogoRemovida(false);
          setLogoAlterada(true);
          
          // Atualizar config
          const novaConfig: PrestadorConfig = {
            ...prestadorConfig,
            logo: dataUri,
          };
          setPrestadorConfig(novaConfig);
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao selecionar logo');
      console.error(error);
    }
  };

  const removerLogo = () => {
    setLogoPreview(undefined);
    setLogoRemovida(true);
    setLogoAlterada(false);
    const novaConfig: PrestadorConfig = {
      ...prestadorConfig,
      logo: undefined,
    };
    setPrestadorConfig(novaConfig);
  };

  const salvarConfigPrestador = async () => {
    if (!prestadorEmpresa.trim()) {
      Alert.alert('Aviso', 'Preencha pelo menos o nome da empresa');
      return;
    }

    setLoadingPrestador(true);
    try {
      const novaConfig: PrestadorConfig = {
        nome: prestadorNome.trim() || undefined,
        empresa: prestadorEmpresa.trim(),
        telefone: prestadorTelefone.trim() || undefined,
        logo: logoPreview,
      };

      const response = await authService.atualizarPrestador({
        prestador_nome: novaConfig.nome,
        prestador_telefone: novaConfig.telefone,
        logo_base64: logoAlterada && logoPreview?.startsWith('data:') ? logoPreview : undefined,
        remover_logo: logoRemovida,
      });

      const configParaSalvar: PrestadorConfig = {
        ...novaConfig,
        empresa: response.empresa?.nome || novaConfig.empresa,
        logo: response.empresa?.logo_url || novaConfig.logo,
      };

      await AsyncStorage.setItem('prestador_config', JSON.stringify(configParaSalvar));
      setPrestadorConfig(configParaSalvar);
      setLogoPreview(configParaSalvar.logo);
      setLogoRemovida(false);
      setLogoAlterada(false);
      await updateEmpresa?.();
      Alert.alert('Sucesso', 'Dados do prestador salvos com sucesso');
      setEditandoPrestador(false);
    } catch (error: any) {
      const mensagem =
        error?.response?.data?.error ||
        error?.message ||
        'Erro ao salvar dados do prestador';
      Alert.alert('Erro', mensagem);
      console.error(error);
    } finally {
      setLoadingPrestador(false);
    }
  };

  const handleCopiarCodigo = async () => {
    if (!empresa?.codigo) return;
    
    if (Platform.OS === 'web') {
      navigator.clipboard.writeText(empresa.codigo);
      Alert.alert('Copiado', 'Código da empresa copiado para a área de transferência');
    } else {
      Alert.alert('Código da Empresa', empresa.codigo, [
        { text: 'Copiar', onPress: () => {} },
        { text: 'OK' }
      ]);
    }
  };

  const handleCompartilharCodigo = async () => {
    if (!empresa?.codigo) return;

    try {
      await Share.share({
        message: `Meu código no Check Guincho é: ${empresa.codigo}`,
        title: 'Código da Empresa',
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível compartilhar o código');
    }
  };

  const handleSalvarAlteracoes = async () => {
    if (!nome || !email) {
      Alert.alert('Aviso', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      console.log('Enviando dados para atualizar empresa:', { nome, email });
      const response = await authService.atualizarEmpresa({ nome, email });
      console.log('Resposta da atualização:', response);
      
      if (response.success) {
        Alert.alert('Sucesso', 'Informações atualizadas com sucesso');
        setEditando(false);
        // Atualizar contexto
        if (updateEmpresa) {
          await updateEmpresa();
        }
      }
    } catch (error: any) {
      console.error('Erro ao atualizar empresa:', error);
      console.error('Erro completo:', JSON.stringify(error, null, 2));
      console.error('Response data:', error.response?.data);
      
      let mensagemErro = 'Erro ao salvar alterações';
      
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        mensagemErro = 'Erro de conexão. Verifique:\n\n1. Se está conectado à internet\n2. Se o servidor está disponível';
      } else if (error.response?.data?.error) {
        mensagemErro = error.response.data.error;
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      Alert.alert('Erro', mensagemErro);
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    Alert.alert(
      'Sair da Conta',
      'Deseja realmente sair da sua conta?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await signOut();
              router.replace('/login');
            } catch {
              Alert.alert('Erro', 'Erro ao sair da conta');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 96, 120) },
        ]}
      >
      <View style={styles.content}>
        <Text style={styles.title}>Configurações</Text>

        {/* Informações da Empresa */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informações da Empresa</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => setEditando(!editando)}>
                <Ionicons name={editando ? 'close' : 'create'} size={20} color="#007bff" />
              </TouchableOpacity>
            )}
          </View>
          
          {editando ? (
            <>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Nome:</Text>
                <TextInput
                  style={styles.input}
                  value={nome}
                  onChangeText={setNome}
                  placeholder="Nome da empresa"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Email:</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email da empresa"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSalvarAlteracoes}
                disabled={loading}
              >
                <Ionicons name="checkmark" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Salvar Alterações</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Nome:</Text>
                <Text style={styles.infoValue}>{empresa?.nome}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{empresa?.email}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Código da Empresa:</Text>
                <View style={styles.codigoContainer}>
                  <Text style={styles.codigoValue}>{empresa?.codigo}</Text>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={handleCopiarCodigo}
                  >
                    <Ionicons name="copy" size={20} color="#4CAF50" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.button}
                onPress={handleCompartilharCodigo}
              >
                <Ionicons name="share-social" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Compartilhar Código</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Status da Assinatura */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Assinatura:</Text>
            <Text style={[styles.statusValue, { color: (empresa?.diasRestantes ?? 0) > 0 ? '#4CAF50' : '#FF6B6B' }]}>
              {(empresa?.diasRestantes ?? 0) > 0 ? 'Ativa' : 'Expirada'}
            </Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Dias Restantes:</Text>
            <Text style={styles.statusValue}>{empresa?.diasRestantes || 0} dias</Text>
          </View>

          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Licenças Ativas:</Text>
            <Text style={styles.statusValue}>{empresa?.quantidade_licencas || 1}</Text>
          </View>

          <TouchableOpacity
            style={styles.licencasButton}
            onPress={() => router.push('/selecionar-licencas')}
          >
            <Ionicons name="layers" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.licencasButtonText}>Selecionar Licenças</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.usuariosButton}
            onPress={() => router.push('/usuarios')}
          >
            <Ionicons name="people" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.usuariosButtonText}>Gerenciar Usuários</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.assinaturaButton}
            onPress={() => router.push('/assinatura')}
          >
            <Ionicons name="card" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.assinaturaButtonText}>Assinatura e Pagamento</Text>
          </TouchableOpacity>
        </View>

        {/* Dados do Prestador para PDF */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dados do Prestador</Text>
            {isAdmin && (
              <TouchableOpacity onPress={() => setEditandoPrestador(!editandoPrestador)}>
                <Ionicons name={editandoPrestador ? 'close' : 'create'} size={20} color="#007bff" />
              </TouchableOpacity>
            )}
          </View>
          
          {editandoPrestador ? (
            <>
              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Nome do Prestador:</Text>
                <TextInput
                  style={styles.input}
                  value={prestadorNome}
                  onChangeText={setPrestadorNome}
                  placeholder="Seu nome ou do responsável"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Nome da Empresa:</Text>
                <TextInput
                  style={styles.input}
                  value={prestadorEmpresa}
                  onChangeText={setPrestadorEmpresa}
                  placeholder="Nome da empresa (obrigatório)"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Telefone:</Text>
                <TextInput
                  style={styles.input}
                  value={prestadorTelefone}
                  onChangeText={setPrestadorTelefone}
                  placeholder="(XX) XXXXX-XXXX"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputBox}>
                <Text style={styles.inputLabel}>Logo da Empresa:</Text>
                {logoPreview ? (
                  <View style={styles.logoPreview}>
                    <Image 
                      source={{ uri: logoPreview }} 
                      style={styles.logoImage}
                    />
                    <TouchableOpacity 
                      style={styles.deleteLogoButton}
                      onPress={removerLogo}
                    >
                      <Ionicons name="trash" size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={selecionarLogo}
                  >
                    <Ionicons name="cloud-upload" size={24} color="#007bff" />
                    <Text style={styles.uploadButtonText}>Selecionar Logo</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity 
                style={styles.saveButton}
                onPress={salvarConfigPrestador}
                disabled={loadingPrestador}
              >
                {loadingPrestador ? (
                  <ActivityIndicator color="#fff" size={18} />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Salvar Dados</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {prestadorConfig.logo ? (
                <View style={styles.logoPreviewDisplay}>
                  <Image 
                    source={{ uri: prestadorConfig.logo }} 
                    style={styles.logoImageDisplay}
                  />
                </View>
              ) : (
                <Text style={styles.noLogoText}>Nenhuma logo configurada</Text>
              )}
              
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Empresa:</Text>
                <Text style={styles.infoValue}>{prestadorConfig.empresa || '-'}</Text>
              </View>

              {prestadorConfig.nome && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Responsável:</Text>
                  <Text style={styles.infoValue}>{prestadorConfig.nome}</Text>
                </View>
              )}

              {prestadorConfig.telefone && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Telefone:</Text>
                  <Text style={styles.infoValue}>{prestadorConfig.telefone}</Text>
                </View>
              )}
              
              <Text style={styles.helpText}>
                Esses dados serão exibidos no topo do relatório PDF gerado ao finalizar os sinistros.
              </Text>
            </>
          )}
        </View>

        {/* Ações */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
          >
            <Ionicons name="log-out" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.logoutButtonText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Check Guincho v1.0.0</Text>
          <Text style={styles.footerText}>© 2026 Todos os direitos reservados</Text>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2C3E50',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
  },
  inputBox: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  infoBox: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  codigoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  codigoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    flex: 1,
  },
  iconButton: {
    padding: 8,
  },
  statusBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  assinaturaButton: {
    flexDirection: 'row',
    backgroundColor: '#27AE60',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  assinaturaButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  licencasButton: {
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  licencasButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  usuariosButton: {
    flexDirection: 'row',
    backgroundColor: '#0F766E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  usuariosButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  uploadButtonText: {
    color: '#007bff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  logoPreview: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
    minHeight: 112,
  },
  logoImage: {
    width: '100%',
    height: 80,
    resizeMode: 'contain',
  },
  logoPreviewDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
    minHeight: 92,
  },
  logoImageDisplay: {
    width: '100%',
    height: 60,
    resizeMode: 'contain',
  },
  deleteLogoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  noLogoText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  helpText: {
    color: '#666',
    fontSize: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    fontStyle: 'italic',
  },});
