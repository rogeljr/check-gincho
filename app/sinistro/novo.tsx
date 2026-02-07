import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sharing from 'expo-sharing';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import SignatureCanvas from 'react-native-signature-canvas';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { databaseService, SinistroLocal } from '../../services/database.service';
import apiService from '../../services/api.service';
import { API_CONFIG, ENDPOINTS } from '../../config/api';

export default function NovoSinistroScreen() {
  const router = useRouter();
  const { edit_id, local_id } = useLocalSearchParams();
  const editId = Array.isArray(edit_id) ? edit_id[0] : edit_id;
  const localIdParam = Array.isArray(local_id) ? local_id[0] : local_id;
  const localIdFromParams = localIdParam ? Number(localIdParam) : null;
  
  const [formData, setFormData] = useState({
    nome_cliente: '',
    cpf_cliente: '',
    telefone_cliente: '',
    placa_veiculo: '',
    modelo_veiculo: '',
    cor_veiculo: '',
    origem_endereco: '',
    destino_endereco: '',
    observacoes: '',
  });
  
  const [origemCoords, setOrigemCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinoCoords, setDestinoCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [quilometragem, setQuilometragem] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [servidorId, setServidorId] = useState<number | null>(null);
  const [localId, setLocalId] = useState<number | null>(null);
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);
  const [pdfLocalUrl, setPdfLocalUrl] = useState<string | null>(null);
  const [assinaturaModalVisible, setAssinaturaModalVisible] = useState(false);
  const [assinaturaBase64, setAssinaturaBase64] = useState<string>('');
  const [numeroSinistro, setNumeroSinistro] = useState<string>('');
  const signatureRef = useRef<any>(null);
  const [origemCapturada, setOrigemCapturada] = useState(false);
  
  useEffect(() => {
    initDatabase();
    checkConnectivity();
    requestLocationPermission();
    if (localIdFromParams) {
      carregarSinistroLocal(localIdFromParams);
    } else if (editId) {
      carregarSinistroParaEdicao(editId);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarFotosPreview();
      carregarPdfLocal();
    }, [localId])
  );

  const carregarSinistroParaEdicao = async (id: string) => {
    try {
      setLoading(true);
      const data: any = await apiService.get(`sinistros/${id}`);

      if (data) {
        // Verificar se está finalizado e tem assinatura
        if (data.status === 'finalizado' && data.assinatura_url) {
          Alert.alert(
            '⚠️ Sinistro Finalizado',
            'Este sinistro está finalizado com assinatura do cliente. Se você editar qualquer informação, a assinatura será apagada e o status voltará para rascunho. Você assume a responsabilidade por esta alteração.\n\nDeseja continuar?',
            [
              {
                text: 'Cancelar',
                style: 'cancel',
                onPress: () => router.back()
              },
              {
                text: 'Sim, Editar',
                style: 'destructive',
                onPress: async () => {
                  // Apagar assinatura do servidor
                  try {
                    await apiService.delete(`sinistros/${id}/assinatura`);
                  } catch (error) {
                    console.warn('Erro ao apagar assinatura:', error);
                  }
                  // Continuar carregamento
                  await continuarCarregamento(id, data);
                }
              }
            ],
            { cancelable: false }
          );
          return;
        }
        
        await continuarCarregamento(id, data);
      }
    } catch (error) {
      console.error('Erro ao carregar sinistro para edição:', error);
      Alert.alert('Erro', 'Não foi possível carregar o sinistro para edição');
    } finally {
      setLoading(false);
    }
  };

  const continuarCarregamento = async (id: string, data: any) => {
    try {
        setServidorId(Number(id));
        const local = await databaseService.buscarSinistroPorServidorId(Number(id));
        if (local?.id) {
          setLocalId(local.id);
          setPdfLocalUrl(local.pdf_local_url || null);
          setNumeroSinistro(local.numero_sinistro || data.numero_sinistro || '');
          setAssinaturaBase64(local.assinatura_base64 || '');
        } else {
          setNumeroSinistro(data.numero_sinistro || '');
        }
        setFormData({
          nome_cliente: data.nome_cliente || '',
          cpf_cliente: data.cpf_cliente || '',
          telefone_cliente: data.telefone_cliente || '',
          placa_veiculo: data.placa_veiculo || '',
          modelo_veiculo: data.modelo_veiculo || '',
          cor_veiculo: data.cor_veiculo || '',
          origem_endereco: data.origem_endereco || '',
          destino_endereco: data.destino_endereco || '',
          observacoes: data.observacoes || '',
        });

        if (data.origem_latitude && data.origem_longitude) {
          setOrigemCoords({
            latitude: Number(data.origem_latitude),
            longitude: Number(data.origem_longitude),
          });
        }

        if (data.destino_latitude && data.destino_longitude) {
          setDestinoCoords({
            latitude: Number(data.destino_latitude),
            longitude: Number(data.destino_longitude),
          });
        }

        if (data.quilometragem) {
          setQuilometragem(Number(data.quilometragem));
        }
    } catch (error) {
      console.error('Erro ao continuar carregamento:', error);
      throw error;
    }
  };

  const carregarSinistroLocal = async (id: number) => {
    try {
      setLoading(true);
      await databaseService.initDatabase();
      const local = await databaseService.buscarSinistro(id);
      if (!local) {
        Alert.alert('Erro', 'Sinistro local não encontrado');
        return;
      }

      setLocalId(local.id || null);
      setServidorId(local.servidor_id || null);
      setPdfLocalUrl(local.pdf_local_url || null);
      setAssinaturaBase64(local.assinatura_base64 || '');
      setNumeroSinistro(local.numero_sinistro || '');

      setFormData({
        nome_cliente: local.nome_cliente || '',
        cpf_cliente: local.cpf_cliente || '',
        telefone_cliente: local.telefone_cliente || '',
        placa_veiculo: local.placa_veiculo || '',
        modelo_veiculo: local.modelo_veiculo || '',
        cor_veiculo: local.cor_veiculo || '',
        origem_endereco: local.origem_endereco || '',
        destino_endereco: local.destino_endereco || '',
        observacoes: local.observacoes || '',
      });

      if (local.origem_latitude && local.origem_longitude) {
        setOrigemCoords({
          latitude: Number(local.origem_latitude),
          longitude: Number(local.origem_longitude),
        });
      }

      if (local.destino_latitude && local.destino_longitude) {
        setDestinoCoords({
          latitude: Number(local.destino_latitude),
          longitude: Number(local.destino_longitude),
        });
      }

      if (local.quilometragem) {
        setQuilometragem(Number(local.quilometragem));
      }
    } catch (error) {
      console.error('Erro ao carregar sinistro local:', error);
      Alert.alert('Erro', 'Não foi possível carregar o sinistro local');
    } finally {
      setLoading(false);
    }
  };
  
  const initDatabase = async () => {
    try {
      await databaseService.initDatabase();
    } catch (error) {
      console.error('Erro ao inicializar database:', error);
      Alert.alert('Erro', 'Erro ao inicializar armazenamento local');
    }
  };

  const carregarFotosPreview = async () => {
    try {
      if (!localId) {
        setFotosPreview([]);
        return;
      }

      const fotosLocais = await databaseService.listarFotosSinistro(localId);
      const uris = fotosLocais.map(f => f.uri);
      setFotosPreview(uris);
    } catch (error) {
      console.error('Erro ao carregar fotos para preview:', error);
    }
  };

  const carregarPdfLocal = async () => {
    try {
      if (!localId) {
        setPdfLocalUrl(null);
        return;
      }

      const local = await databaseService.buscarSinistro(localId);
      setPdfLocalUrl(local?.pdf_local_url || null);
    } catch (error) {
      console.error('Erro ao carregar PDF local:', error);
    }
  };
  
  const checkConnectivity = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    
    return unsubscribe;
  };
  
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Negada',
          'A permissão de localização é necessária para registrar origem e destino'
        );
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão de localização:', error);
    }
  };
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const formatCPF = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };
  
  const formatTelefone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };
  
  const formatPlaca = (text: string) => {
    const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (upper.length <= 3) return upper;
    if (upper.length <= 4) return `${upper.slice(0, 3)}${upper.slice(3)}`;
    return `${upper.slice(0, 3)}${upper.slice(3, 4)}${upper.slice(4, 6)}${upper.slice(6, 7)}`;
  };
  
  const capturarLocalizacao = async (tipo: 'origem' | 'destino') => {
    setGpsLoading(true);
    
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      const addresses = await Location.reverseGeocodeAsync(coords);
      const address = addresses[0];
      
      const enderecoFormatado = address
        ? `${address.street || ''}, ${address.streetNumber || ''} - ${address.district || ''}, ${address.city || ''} - ${address.region || ''}`
        : `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
      
      if (tipo === 'origem') {
        setOrigemCoords(coords);
        handleChange('origem_endereco', enderecoFormatado);
        setOrigemCapturada(true);
      } else {
        setDestinoCoords(coords);
        handleChange('destino_endereco', enderecoFormatado);
      }
      
      if (tipo === 'destino' && origemCoords) {
        const km = calcularDistancia(origemCoords, coords);
        setQuilometragem(km);
      } else if (tipo === 'origem' && destinoCoords) {
        const km = calcularDistancia(coords, destinoCoords);
        setQuilometragem(km);
      }
      
      // Se capturou destino, abre modal de assinatura
      if (tipo === 'destino') {
        Alert.alert(
          'Localização Capturada',
          'Agora, por favor, peça a assinatura do cliente.',
          [
            {
              text: 'OK',
              onPress: () => setAssinaturaModalVisible(true),
            },
          ]
        );
      } else {
        Alert.alert('Sucesso', 'Localização de origem capturada!');
      }
    } catch (error) {
      console.error('Erro ao capturar localização:', error);
      Alert.alert('Erro', 'Não foi possível capturar a localização. Verifique se o GPS está ativado.');
    } finally {
      setGpsLoading(false);
    }
  };
  
  const calcularDistancia = (
    origem: { latitude: number; longitude: number },
    destino: { latitude: number; longitude: number }
  ): number => {
    const R = 6371;
    const dLat = toRad(destino.latitude - origem.latitude);
    const dLon = toRad(destino.longitude - origem.longitude);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(origem.latitude)) *
        Math.cos(toRad(destino.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100;
  };
  
  const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
  };
  
  const handleAssinatura = (signature: string) => {
    setAssinaturaBase64(signature);
    setAssinaturaModalVisible(false);
    Alert.alert('Sucesso', 'Assinatura capturada com sucesso!');

    const assinaturaTimestamp = new Date().toISOString();

    if (localId) {
      databaseService.atualizarSinistro(localId, {
        assinatura_base64: signature,
        assinatura_timestamp: assinaturaTimestamp,
      }).catch((error) => {
        console.warn('Erro ao salvar assinatura local:', error);
      });

      gerarPdfLocal({
        numero_sinistro: numeroSinistro || gerarNumeroSinistro(),
        nome_cliente: formData.nome_cliente.trim(),
        cpf_cliente: formData.cpf_cliente.replace(/\D/g, '') || undefined,
        telefone_cliente: formData.telefone_cliente.replace(/\D/g, '') || undefined,
        placa_veiculo: formData.placa_veiculo.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        tipo_atendimento: 'Guincho',
        modelo_veiculo: formData.modelo_veiculo.trim() || undefined,
        cor_veiculo: formData.cor_veiculo.trim() || undefined,
        origem_latitude: origemCoords?.latitude,
        origem_longitude: origemCoords?.longitude,
        origem_endereco: formData.origem_endereco.trim() || undefined,
        destino_latitude: destinoCoords?.latitude,
        destino_longitude: destinoCoords?.longitude,
        destino_endereco: formData.destino_endereco.trim() || undefined,
        quilometragem: quilometragem || undefined,
        observacoes: formData.observacoes.trim() || undefined,
        pdf_local_url: undefined,
        assinatura_timestamp: assinaturaTimestamp,
        status: 'rascunho',
        sincronizado: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, localId, signature).then(async (uri) => {
        setPdfLocalUrl(uri);
        await databaseService.atualizarSinistro(localId, { 
          pdf_local_url: uri,
          assinatura_timestamp: assinaturaTimestamp
        });
      }).catch((error) => {
        console.warn('Erro ao gerar PDF local após assinatura:', error);
      });
    }
  };
  
  const handleAssinaturaEmpty = () => {
    Alert.alert('Atenção', 'Por favor, faça a assinatura antes de confirmar.');
  };
  
  const limparAssinatura = () => {
    signatureRef.current?.clearSignature();
  };
  
  const fecharModalAssinatura = () => {
    setAssinaturaModalVisible(false);
  };

  const abrirPdfLocal = async () => {
    if (!pdfLocalUrl) {
      Alert.alert('Aviso', 'PDF local não disponível');
      return;
    }

    try {
      // Use expo-sharing to open the PDF file securely on both iOS and Android
      await Sharing.shareAsync(pdfLocalUrl, {
        mimeType: 'application/pdf',
      });
    } catch (error) {
      console.error('Erro ao abrir PDF:', error);
      Alert.alert('Erro', 'Não foi possível abrir o PDF local');
    }
  };
  
  const validateForm = (): boolean => {
    if (!formData.nome_cliente.trim()) {
      Alert.alert('Erro', 'Digite o nome do cliente');
      return false;
    }
    
    if (!formData.placa_veiculo.trim()) {
      Alert.alert('Erro', 'Digite a placa do veículo');
      return false;
    }
    
    return true;
  };
  
  const gerarNumeroSinistro = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const sec = String(now.getSeconds()).padStart(2, '0');
    
    return `SIN${year}${month}${day}${hour}${min}${sec}`;
  };

  const ensureDataUri = (base64: string, mime: string) => {
    if (!base64) return '';
    return base64.startsWith('data:') ? base64 : `data:${mime};base64,${base64}`;
  };

  const gerarHtmlPdf = (
    sinistro: Omit<SinistroLocal, 'id'>,
    fotosBase64: string[],
    assinaturaDataUri?: string,
    prestadorInfo?: { nome?: string; empresa?: string; telefone?: string; logo?: string }
  ) => {
    // Organizar fotos em grid
    const fotosHtml = fotosBase64
      .map((foto) => `
        <div style="display: inline-block; width: 30%; margin: 1%; vertical-align: top; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
          <img src="${foto}" style="width: 100%; height: auto; display: block; max-height: 150px; object-fit: cover;" />
        </div>
      `)
      .join('');

    const logoHtml = prestadorInfo?.logo
      ? `<img src="${prestadorInfo.logo}" style="max-height: 60px; max-width: 150px; margin-right: 20px;" />`
      : '';

    const prestadorHtml = prestadorInfo?.nome || prestadorInfo?.empresa
      ? `
        <div style="display: flex; align-items: center; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; margin-bottom: 20px;">
          ${logoHtml}
          <div>
            ${prestadorInfo?.empresa ? `<div style="font-size: 16px; font-weight: bold; color: #1a1a1a;">${prestadorInfo.empresa}</div>` : ''}
            ${prestadorInfo?.nome ? `<div style="font-size: 14px; color: #555;">${prestadorInfo.nome}</div>` : ''}
            ${prestadorInfo?.telefone ? `<div style="font-size: 12px; color: #888;">${prestadorInfo.telefone}</div>` : ''}
          </div>
        </div>
      `
      : '';

    const dataAtualFormatada = new Date(sinistro.createdAt).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const assinaturaHtml = assinaturaDataUri
      ? `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <h3 style="margin-bottom: 15px; font-size: 14px; font-weight: bold;">ASSINATURA DO CLIENTE</h3>
          <img src="${assinaturaDataUri}" style="max-width: 200px; max-height: 100px; border: 1px solid #999; border-radius: 4px; padding: 8px; background: #fafafa;" />
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px dotted #ccc;">
            <div style="font-size: 12px; color: #666;">
              <div>Data: ${dataAtualFormatada}</div>
              <div style="margin-top: 4px;">Assinado digitalmente via Check Guincho</div>
            </div>
          </div>
        </div>
      `
      : '<p style="color: #999; font-style: italic;">Sem assinatura</p>';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #333;
              line-height: 1.6;
              background: white;
              padding: 40px 30px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              ${prestadorHtml ? 'display: flex; align-items: center; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; margin-bottom: 30px;' : ''}
            }
            .logo {
              max-height: 60px;
              max-width: 150px;
              margin-right: 20px;
            }
            .company-info {
              flex: 1;
            }
            .company-name {
              font-size: 18px;
              font-weight: bold;
              color: #1a1a1a;
            }
            .company-details {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 24px;
              color: #1a1a1a;
              border-bottom: 3px solid #007AFF;
              padding-bottom: 12px;
            }
            h2 {
              font-size: 16px;
              margin-top: 24px;
              margin-bottom: 12px;
              color: #1a1a1a;
              border-left: 4px solid #007AFF;
              padding-left: 12px;
            }
            h3 {
              font-size: 14px;
              margin-top: 20px;
              margin-bottom: 10px;
              color: #333;
              font-weight: 600;
            }
            .info-section {
              background: #f8f9fa;
              padding: 16px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #007AFF;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .info-row:last-child {
              margin-bottom: 0;
            }
            .label {
              font-weight: 600;
              color: #1a1a1a;
              min-width: 120px;
              flex-shrink: 0;
            }
            .value {
              color: #555;
              flex: 1;
              word-break: break-word;
            }
            .photos-grid {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
              margin: 16px 0;
            }
            .photo-item {
              flex: 0 1 calc(50% - 6px);
              border: 1px solid #ddd;
              border-radius: 6px;
              overflow: hidden;
              background: #f5f5f5;
            }
            .photo-item img {
              width: 100%;
              height: auto;
              display: block;
            }
            .signature-section {
              margin-top: 40px;
              padding-top: 30px;
              border-top: 2px solid #ddd;
            }
            .signature-label {
              font-size: 13px;
              font-weight: 600;
              color: #1a1a1a;
              margin-bottom: 16px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .signature-image {
              border: 1px solid #999;
              border-radius: 6px;
              padding: 4px 6px;
              background: #fff;
              max-width: 100%;
              height: 70px;
              overflow: hidden;
            }
            .signature-image img {
              width: 100%;
              height: 70px;
              object-fit: contain;
              object-position: left center;
            }
            .signature-info {
              margin-top: 20px;
              padding-top: 16px;
              border-top: 1px dotted #ccc;
              font-size: 12px;
              color: #666;
            }
            .signature-info div {
              margin-bottom: 4px;
            }
            .no-content {
              color: #999;
              font-style: italic;
              padding: 12px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 11px;
              color: #999;
            }
          </style>
        </head>
        <body>
          ${prestadorHtml}
          
          <h1>Relatório de Sinistro #${sinistro.numero_sinistro}</h1>

          <h2>Informações do Cliente</h2>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Nome:</span>
              <span class="value">${sinistro.nome_cliente || '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">CPF:</span>
              <span class="value">${sinistro.cpf_cliente || '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">Telefone:</span>
              <span class="value">${sinistro.telefone_cliente || '-'}</span>
            </div>
          </div>

          <h2>Informações do Veículo</h2>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Placa:</span>
              <span class="value">${sinistro.placa_veiculo || '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">Modelo:</span>
              <span class="value">${sinistro.modelo_veiculo || '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">Cor:</span>
              <span class="value">${sinistro.cor_veiculo || '-'}</span>
            </div>
          </div>

          <h2>Detalhes do Atendimento</h2>
          <div class="info-section">
            <div class="info-row">
              <span class="label">Origem:</span>
              <span class="value">${sinistro.origem_endereco || '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">Destino:</span>
              <span class="value">${sinistro.destino_endereco || '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">Quilometragem:</span>
              <span class="value">${sinistro.quilometragem ? sinistro.quilometragem + ' km' : '-'}</span>
            </div>
            <div class="info-row">
              <span class="label">Observações:</span>
              <span class="value">${sinistro.observacoes || '-'}</span>
            </div>
          </div>

          <h2>Fotos do Atendimento</h2>
          ${fotosBase64.length > 0
            ? `<div class="photos-grid">${fotosHtml}</div>`
            : '<div class="no-content">Nenhuma foto registrada</div>'
          }

          <div class="signature-section">
            <div class="signature-label">Assinatura do Cliente</div>
            ${assinaturaDataUri
              ? `<div class="signature-image"><img src="${assinaturaDataUri}" /></div>`
              : '<div class="no-content">Sem assinatura</div>'
            }
            ${assinaturaDataUri ? `<div class="signature-info">
              <div><strong>Data:</strong> ${dataAtualFormatada}</div>
              <div>Assinado digitalmente via Check Guincho</div>
            </div>` : ''}
          </div>

          <div class="footer">
            <p>Relatório gerado em ${dataAtualFormatada}</p>
            <p>Check Guincho - Sistema de Atendimento</p>
          </div>
        </body>
      </html>
    `;
  };

  const gerarPdfLocal = async (sinistro: Omit<SinistroLocal, 'id'>, sinistroLocalId?: number, assinaturaOverride?: string) => {
    const fotos: string[] = [];

    const assinaturaParaPdf = assinaturaOverride || assinaturaBase64;
    console.log('📄 Gerando PDF com numero_sinistro:', sinistro.numero_sinistro);
    console.log('📄 Assinatura disponível:', !!assinaturaParaPdf);

    if (sinistroLocalId) {
      const fotosLocal = await databaseService.listarFotosSinistro(sinistroLocalId);

      for (const foto of fotosLocal) {
        if (foto.base64) {
          fotos.push(ensureDataUri(foto.base64, 'image/jpeg'));
        } else if (foto.uri) {
          try {
            const base64 = await FileSystem.readAsStringAsync(foto.uri, {
              encoding: 'base64',
            } as any);
            fotos.push(ensureDataUri(base64, 'image/jpeg'));
          } catch (error) {
            console.warn('Não foi possível ler foto para PDF:', error);
          }
        }
      }
    }

    const assinaturaDataUri = assinaturaParaPdf
      ? ensureDataUri(assinaturaParaPdf, 'image/png')
      : undefined;

    console.log('📝 Assinatura para PDF - Base64 existe:', !!assinaturaParaPdf);
    console.log('📝 Assinatura para PDF - DataUri:', assinaturaDataUri ? 'Sim' : 'Não');

    // Carregar dados do prestador do AsyncStorage
    let prestadorInfo: { nome?: string; empresa?: string; telefone?: string; logo?: string } = {};
    try {
      const prestadorJson = await AsyncStorage.getItem('prestador_config');
      if (prestadorJson) {
        prestadorInfo = JSON.parse(prestadorJson);
      }
    } catch (error) {
      console.warn('Erro ao carregar dados do prestador:', error);
    }

    const html = gerarHtmlPdf(sinistro, fotos, assinaturaDataUri, prestadorInfo);

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  };
  
  const salvarSinistro = async () => {
    if (!validateForm()) return;

    // Validar se pode editar: apenas avisar se passou 1 hora após assinatura
    if (servidorId && pdfLocalUrl) {
      try {
        const sinistroServidor = await apiService.get<any>(`sinistros/${servidorId}`);
        if (sinistroServidor?.assinatura_timestamp) {
          const agora = new Date();
          const timestampAssinatura = new Date(sinistroServidor.assinatura_timestamp);
          const minutoDecorridos = Math.floor((agora.getTime() - timestampAssinatura.getTime()) / (1000 * 60));
          
          if (minutoDecorridos > 60) {
            Alert.alert(
              'Período de Edição Expirado',
              'Este sinistro foi finalizado há mais de 1 hora. Entre em contato com o suporte para fazer alterações.'
            );
            return;
          }
        }
      } catch (error) {
        console.warn('Erro ao verificar tempo de assinatura:', error);
        // Continua mesmo se der erro
      }
    }
    
    setLoading(true);
    
    try {
      const cpfNumbers = formData.cpf_cliente.replace(/\D/g, '');
      const telefoneNumbers = formData.telefone_cliente.replace(/\D/g, '');
      const placaFormatted = formData.placa_veiculo.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Usar número existente ou gerar novo apenas se não tiver
      const numeroFinal = numeroSinistro || gerarNumeroSinistro();
      if (!numeroSinistro) {
        setNumeroSinistro(numeroFinal);
      }

      let sinistroData: Omit<SinistroLocal, 'id'> = {
        numero_sinistro: numeroFinal,
        nome_cliente: formData.nome_cliente.trim(),
        cpf_cliente: cpfNumbers || undefined,
        telefone_cliente: telefoneNumbers || undefined,
        placa_veiculo: placaFormatted,
        tipo_atendimento: 'Guincho',
        modelo_veiculo: formData.modelo_veiculo.trim() || undefined,
        cor_veiculo: formData.cor_veiculo.trim() || undefined,
        origem_latitude: origemCoords?.latitude,
        origem_longitude: origemCoords?.longitude,
        origem_endereco: formData.origem_endereco.trim() || undefined,
        destino_latitude: destinoCoords?.latitude,
        destino_longitude: destinoCoords?.longitude,
        destino_endereco: formData.destino_endereco.trim() || undefined,
        quilometragem: quilometragem || undefined,
        observacoes: formData.observacoes.trim() || undefined,
        pdf_local_url: pdfLocalUrl || undefined,
        status: 'rascunho',
        sincronizado: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // ✅ PDF já foi gerado quando assinatura foi confirmada, não gerar novamente
      if (assinaturaBase64 && !pdfLocalUrl) {
        console.warn('⚠️ Assinatura existe mas PDF não foi gerado - gerando agora');
        try {
          const pdfLocalUri = await gerarPdfLocal(sinistroData, localId || undefined);
          sinistroData = { ...sinistroData, pdf_local_url: pdfLocalUri };

          if (localId) {
            await databaseService.atualizarSinistro(localId, { pdf_local_url: pdfLocalUri });
            setPdfLocalUrl(pdfLocalUri);
          }
        } catch (error) {
          console.warn('Erro ao gerar PDF local:', error);
        }
      } else if (pdfLocalUrl) {
        sinistroData = { ...sinistroData, pdf_local_url: pdfLocalUrl };
      }

      // 🔒 MODO OFFLINE-FIRST: SEMPRE salva localmente primeiro
      if (localId) {
        // É edição
        await databaseService.atualizarSinistro(localId, sinistroData);
      } else {
        // É criação
        const newLocalId = await databaseService.criarSinistro(sinistroData);
        setLocalId(newLocalId);
      }

      // ✅ Sucesso: Salvo offline localmente
      Alert.alert(
        'Salvo Localmente',
        'Sinistro salvo no dispositivo.\n\nVocê pode continuar preenchendo, adicionar fotos e assinar.\n\nDepois, clique em "Sincronizar" para enviar ao servidor.',
        [
          {
            text: 'Continuar Preenchendo',
            onPress: () => {
              // Mantém na tela para continuar editando
              setLoading(false);
            },
            style: 'cancel',
          },
          {
            text: 'Voltar',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao salvar sinistro:', error);
      Alert.alert('Erro', 'Erro ao salvar sinistro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarFotos = () => {
    // ✅ Agora permite adicionar fotos SEM salvar antes
    // Se ainda não existe no banco local, cria um rascunho
    const goToFotos = async () => {
      try {
        let idParaUsar = localId;
        
        if (!idParaUsar) {
          // 📝 Criar um rascunho vazio se ainda não existe
          const rascunho: Omit<SinistroLocal, 'id'> = {
            numero_sinistro: gerarNumeroSinistro(),
            nome_cliente: formData.nome_cliente.trim() || 'Rascunho',
            cpf_cliente: undefined,
            telefone_cliente: undefined,
            placa_veiculo: formData.placa_veiculo.trim() || 'Não informada',
            tipo_atendimento: 'Guincho',
            status: 'rascunho',
            sincronizado: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          idParaUsar = await databaseService.criarSinistro(rascunho);
          setLocalId(idParaUsar);
        }

        // 🚀 Navega para fotos sem exigir salvamento
        router.push(`/sinistro/fotos?local_id=${idParaUsar}`);
      } catch (error) {
        console.error('Erro ao preparar fotos:', error);
        Alert.alert('Erro', 'Não foi possível acessar fotos');
      }
    };

    goToFotos();
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Novo Sinistro</Text>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? '#27AE60' : '#E74C3C' }]}>
          <Text style={styles.statusText}>{isOnline ? '● Online' : '● Offline'}</Text>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Cliente</Text>
          
          <Text style={styles.label}>Nome Completo *</Text>
          <TextInput
            style={styles.input}
            value={formData.nome_cliente}
            onChangeText={(text) => handleChange('nome_cliente', text)}
            placeholder="Nome do cliente"
            editable={!loading}
          />
          
          <Text style={styles.label}>CPF</Text>
          <TextInput
            style={styles.input}
            value={formData.cpf_cliente}
            onChangeText={(text) => handleChange('cpf_cliente', formatCPF(text))}
            placeholder="000.000.000-00"
            keyboardType="numeric"
            maxLength={14}
            editable={!loading}
          />
          
          <Text style={styles.label}>Telefone</Text>
          <TextInput
            style={styles.input}
            value={formData.telefone_cliente}
            onChangeText={(text) => handleChange('telefone_cliente', formatTelefone(text))}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
            maxLength={15}
            editable={!loading}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Veículo</Text>
          
          <Text style={styles.label}>Placa *</Text>
          <TextInput
            style={styles.input}
            value={formData.placa_veiculo}
            onChangeText={(text) => handleChange('placa_veiculo', formatPlaca(text))}
            placeholder="ABC1234 ou ABC1D23"
            autoCapitalize="characters"
            maxLength={7}
            editable={!loading}
          />
          
          <Text style={styles.label}>Modelo</Text>
          <TextInput
            style={styles.input}
            value={formData.modelo_veiculo}
            onChangeText={(text) => handleChange('modelo_veiculo', text)}
            placeholder="Ex: Fiat Uno 2020"
            editable={!loading}
          />
          
          <Text style={styles.label}>Cor</Text>
          <TextInput
            style={styles.input}
            value={formData.cor_veiculo}
            onChangeText={(text) => handleChange('cor_veiculo', text)}
            placeholder="Ex: Branco"
            editable={!loading}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localização</Text>
          
          <View style={styles.gpsRow}>
            <Text style={styles.label}>Origem</Text>
            <TouchableOpacity
              style={[styles.gpsButton, (gpsLoading || origemCapturada) && styles.buttonDisabled]}
              onPress={() => capturarLocalizacao('origem')}
              disabled={gpsLoading || loading || origemCapturada}
            >
              <Text style={styles.gpsButtonText}>
                {gpsLoading ? '...' : '📍 Capturar'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={formData.origem_endereco}
            onChangeText={(text) => handleChange('origem_endereco', text)}
            placeholder="Endereço de origem ou use o GPS"
            multiline
            editable={!loading && !origemCapturada}
          />
          {origemCoords && (
            <Text style={styles.coordsText}>
              Lat: {origemCoords.latitude.toFixed(6)}, Lng: {origemCoords.longitude.toFixed(6)}
            </Text>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.observacoes}
            onChangeText={(text) => handleChange('observacoes', text)}
            placeholder="Informações adicionais sobre o sinistro..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos</Text>
          <Text style={styles.fotosHint}>
            Adicione fotos do veículo e do local.
          </Text>
          {fotosPreview.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fotosPreviewRow}>
              {fotosPreview.map((uri, index) => (
                <Image key={`${uri}_${index}`} source={{ uri }} style={styles.fotoPreview} />
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={[styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={handleAdicionarFotos}
            disabled={loading}
          >
            <Text style={styles.buttonSecondaryText}>📷 Adicionar Fotos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destino e Assinatura</Text>
          <View style={styles.gpsRow}>
            <Text style={styles.label}>Destino</Text>
            <TouchableOpacity
              style={[styles.gpsButton, gpsLoading && styles.buttonDisabled]}
              onPress={() => capturarLocalizacao('destino')}
              disabled={gpsLoading || loading}
            >
              <Text style={styles.gpsButtonText}>
                {gpsLoading ? '...' : '📍 Capturar'}
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={formData.destino_endereco}
            onChangeText={(text) => handleChange('destino_endereco', text)}
            placeholder="Endereço de destino ou use o GPS"
            multiline
            editable={!loading}
          />
          {destinoCoords && (
            <Text style={styles.coordsText}>
              Lat: {destinoCoords.latitude.toFixed(6)}, Lng: {destinoCoords.longitude.toFixed(6)}
            </Text>
          )}

          {quilometragem > 0 && (
            <View style={styles.kmBox}>
              <Text style={styles.kmText}>📏 Quilometragem: {quilometragem} km</Text>
            </View>
          )}

          {destinoCoords && (
            <View style={styles.assinaturaStatusBox}>
              {assinaturaBase64 ? (
                <View style={styles.assinaturaCapturada}>
                  <Text style={styles.assinaturaCapturadaText}>✓ Assinatura Capturada</Text>
                  <TouchableOpacity
                    onPress={() => setAssinaturaModalVisible(true)}
                    style={styles.recapturarBtn}
                  >
                    <Text style={styles.recapturarBtnText}>Recapturar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.capturarAssinaturaBtn}
                  onPress={() => setAssinaturaModalVisible(true)}
                >
                  <Text style={styles.capturarAssinaturaBtnText}>✍️ Capturar Assinatura</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.pdfLocalBtn,
              !pdfLocalUrl && styles.pdfLocalBtnDisabled
            ]}
            onPress={abrirPdfLocal}
            disabled={!pdfLocalUrl}
          >
            <Text style={[
              styles.pdfLocalBtnText,
              !pdfLocalUrl && styles.pdfLocalBtnTextDisabled
            ]}>
              {pdfLocalUrl ? '📄 Abrir PDF Local' : '📄 PDF Local (Gere assinatura primeiro)'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={salvarSinistro}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Salvar e Continuar</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
      
      <Modal
        visible={assinaturaModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={fecharModalAssinatura}
      >
        <View style={styles.assinaturaContainer}>
          <View style={styles.assinaturaHeader}>
            <Text style={styles.assinaturaTitle}>Assinatura do Cliente</Text>
            <Text style={styles.assinaturaSubtitle}>Por favor, peça ao cliente para assinar abaixo</Text>
          </View>
          
          <View style={styles.canvasContainer}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleAssinatura}
              onEmpty={handleAssinaturaEmpty}
              descriptionText="Assine aqui"
              clearText="Limpar"
              confirmText="Confirmar"
              webStyle={`.m-signature-pad {box-shadow: none; border: 2px solid #ddd;} .m-signature-pad--body {border: none;} .m-signature-pad--footer {display: none;}`}
            />
          </View>
          
          <View style={styles.assinaturaButtons}>
            <TouchableOpacity
              style={styles.assinaturaBtnLimpar}
              onPress={limparAssinatura}
            >
              <Text style={styles.assinaturaBtnText}>🗑️ Limpar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.assinaturaBtnCancelar}
              onPress={fecharModalAssinatura}
            >
              <Text style={styles.assinaturaBtnText}>✖️ Fechar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.assinaturaBtnConfirmar}
              onPress={() => signatureRef.current?.readSignature()}
            >
              <Text style={styles.assinaturaBtnTextWhite}>✓ Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2C3E50',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
  },
  fotosHint: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  fotosPreviewRow: {
    marginBottom: 12,
  },
  fotoPreview: {
    width: 88,
    height: 88,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#eee',
  },
  buttonSecondary: {
    backgroundColor: '#3498DB',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  gpsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coordsText: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: -12,
    marginBottom: 16,
  },
  kmBox: {
    backgroundColor: '#E8F8F5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
    marginTop: 10,
  },
  kmText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27AE60',
  },
  assinaturaStatusBox: {
    marginTop: 15,
  },
  assinaturaCapturada: {
    backgroundColor: '#D4EDDA',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28A745',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assinaturaCapturadaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#155724',
  },
  recapturarBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#28A745',
  },
  recapturarBtnText: {
    color: '#28A745',
    fontSize: 12,
    fontWeight: 'bold',
  },
  capturarAssinaturaBtn: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    alignItems: 'center',
  },
  capturarAssinaturaBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
  },
  pdfLocalBtn: {
    marginTop: 12,
    backgroundColor: '#34495E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pdfLocalBtnDisabled: {
    backgroundColor: '#BDC3C7',
    opacity: 0.6,
  },
  pdfLocalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pdfLocalBtnTextDisabled: {
    color: '#95A5A6',
  },
  button: {
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#95A5A6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#7F8C8D',
    fontSize: 16,
    fontWeight: '600',
  },
  assinaturaContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  assinaturaHeader: {
    backgroundColor: '#2C3E50',
    padding: 20,
    paddingTop: 60,
  },
  assinaturaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  assinaturaSubtitle: {
    fontSize: 14,
    color: '#ECF0F1',
  },
  canvasContainer: {
    height: 120,
    margin: 20,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#3498DB',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  assinaturaButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  assinaturaBtnLimpar: {
    flex: 1,
    backgroundColor: '#95A5A6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  assinaturaBtnCancelar: {
    flex: 1,
    backgroundColor: '#E74C3C',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  assinaturaBtnConfirmar: {
    flex: 1,
    backgroundColor: '#27AE60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  assinaturaBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  assinaturaBtnTextWhite: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
