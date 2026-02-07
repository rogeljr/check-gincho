# 📱 Implementação Frontend - Sistema Multi-Licenças

## 🎯 O que Precisa ser Feito no Frontend

---

## 1️⃣ Capturar Device ID

### Instalação
```bash
npm install expo-device
```

### Implementação
```typescript
// lib/deviceId.ts
import * as Device from 'expo-device';

export const getDeviceId = (): string => {
  const manufacturer = Device.manufacturer || 'Unknown';
  const modelName = Device.modelName || 'Unknown';
  const osVersion = Device.osVersion || 'Unknown';
  
  // Formato: Apple-iPhone15Pro-18.2
  return `${manufacturer}-${modelName}-${osVersion}`;
};

// Ou mais simples com UUID
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getOrCreateDeviceId = async (): Promise<string> => {
  let deviceId = await AsyncStorage.getItem('deviceId');
  
  if (!deviceId) {
    deviceId = uuidv4();
    await AsyncStorage.setItem('deviceId', deviceId);
  }
  
  return deviceId;
};
```

---

## 2️⃣ Atualizar Serviço de Autenticação

### auth.service.ts
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateDeviceId } from '../lib/deviceId';
import api from './api.service';

export interface LoginRequest {
  codigo: string;
  senha: string;
  device_id?: string; // ← NOVO
}

export interface RegisterRequest {
  nome: string;
  cnpj: string;
  email: string;
  senha: string;
  cpf_responsavel: string; // ← NOVO
  device_id?: string; // ← NOVO
  codigo?: string;
}

export const authService = {
  async register(data: RegisterRequest) {
    // Obter ou criar Device ID
    if (!data.device_id) {
      data.device_id = await getOrCreateDeviceId();
    }

    const response = await api.post('/auth/cadastrar', data);
    
    // Salvar dados para trial check
    if (response.data.tem_direito_trial) {
      await AsyncStorage.setItem('temDireitoTrial', 'true');
    } else {
      await AsyncStorage.setItem('temDireitoTrial', 'false');
    }

    return response.data;
  },

  async login(codigo: string, senha: string) {
    // Obter Device ID
    const device_id = await getOrCreateDeviceId();

    const response = await api.post('/auth/login', {
      codigo,
      senha,
      device_id, // ← ENVIANDO
    });

    // Salvar token
    if (response.data.token) {
      await AsyncStorage.setItem('token', response.data.token);
      await AsyncStorage.setItem('empresa_id', response.data.empresa.id.toString());
    }

    return response.data;
  },

  async logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('empresa_id');
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem('token');
  },
};
```

---

## 3️⃣ Criar Modal de Seleção de Licenças

### components/LicenseSelectionModal.tsx
```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../services/api.service';

interface LicenseSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (preferenceId: string, initPoint: string) => void;
}

export const LicenseSelectionModal: React.FC<LicenseSelectionModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [selectedLicenses, setSelectedLicenses] = useState(1);
  const [loading, setLoading] = useState(false);

  const precoPorLicenca = 5.0;
  const valorTotal = selectedLicenses * precoPorLicenca;

  const handleSelectLicenses = async () => {
    try {
      setLoading(true);

      const response = await api.post('/pagamentos/selecionar-licencas', {
        quantidade_licencas: selectedLicenses,
      });

      console.log('Preferência criada:', response.data);

      // Chamar callback se fornecido
      if (onSuccess) {
        onSuccess(response.data.preference_id, response.data.init_point);
      }

      // Redirecionar para Mercado Pago
      if (response.data.init_point) {
        await Linking.openURL(response.data.init_point);
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao selecionar licenças:', error);
      Alert.alert(
        'Erro',
        error.response?.data?.error || 'Erro ao processar licenças'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Selecione o Número de Licenças</Text>
          <Text style={styles.subtitle}>
            Cada licença = 1 dispositivo simultâneo
          </Text>

          {/* Picker para selecionar quantidade */}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedLicenses}
              onValueChange={setSelectedLicenses}
              style={styles.picker}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <Picker.Item
                  key={num}
                  label={`${num} ${num === 1 ? 'Licença' : 'Licenças'}`}
                  value={num}
                />
              ))}
            </Picker>
          </View>

          {/* Breakdown de preço */}
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Preço por licença:</Text>
              <Text style={styles.priceValue}>R$ {precoPorLicenca.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Quantidade:</Text>
              <Text style={styles.priceValue}>{selectedLicenses}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total/Mês:</Text>
              <Text style={styles.totalValue}>R$ {valorTotal.toFixed(2)}</Text>
            </View>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📌 Você poderá fazer login em até {selectedLicenses} dispositivos simultâneos.
            </Text>
            <Text style={styles.infoText}>
              💳 Pagamento recorrente: será renovado automaticamente a cada 30 dias.
            </Text>
          </View>

          {/* Botões */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.buttonCancel}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonConfirm, loading && styles.buttonDisabled]}
              onPress={handleSelectLicenses}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonTextConfirm}>
                  Ir para Pagamento
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    height: 120,
  },
  priceBreakdown: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#1565c0',
    marginBottom: 6,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  buttonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  buttonTextConfirm: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
```

---

## 4️⃣ Integrar Modal em Screen de Pagamento

### screens/pagamento.tsx
```typescript
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LicenseSelectionModal } from '../components/LicenseSelectionModal';

export const PagamentoScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleLicenseSuccess = (preferenceId: string, initPoint: string) => {
    console.log('Pagamento iniciado:', preferenceId);
    // App será redirecionado automaticamente pelo Linking.openURL
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plano de Assinatura</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Comprar Licenças</Text>
      </TouchableOpacity>

      <LicenseSelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleLicenseSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

---

## 5️⃣ Tratar Erro SESSION_REPLACED

### Interceptar errors no api.service.ts
```typescript
import axios, { AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

export const setupApiInterceptors = (authContext: any) => {
  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const data = error.response?.data as any;

      // ❌ Verificar se é erro de sessão/dispositivo
      if (data?.code === 'SESSION_REPLACED') {
        console.log('⚠️ Sessão encerrada em outro dispositivo');

        // Remover token
        await AsyncStorage.removeItem('token');

        // Mostrar alert
        Alert.alert(
          'Sessão Encerrada',
          'Você foi desconectado porque fez login em outro dispositivo.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navegar para login
                authContext.logout();
              },
            },
          ]
        );

        return Promise.reject(error);
      }

      return Promise.reject(error);
    }
  );
};
```

### Usar no app.tsx
```typescript
import { useAuth } from './contexts/AuthContext';
import { setupApiInterceptors } from './services/api.service';

export default function App() {
  const authContext = useAuth();

  useEffect(() => {
    setupApiInterceptors(authContext);
  }, [authContext]);

  return (
    <NavigationContainer>
      {/* ... */}
    </NavigationContainer>
  );
}
```

---

## 6️⃣ Deep Link Handling (Callback de Pagamento)

### Configurar Deep Links

#### app.json
```json
{
  "expo": {
    "scheme": "checkguincho",
    "plugins": [
      [
        "expo-deep-linking",
        {
          "schemes": ["checkguincho"]
        }
      ]
    ]
  }
}
```

#### screens/LinkingConfiguration.ts
```typescript
import * as Linking from 'expo-linking';
import { useNavigation } from '@react-navigation/native';

const prefix = Linking.createURL('/');

export const linking = {
  prefixes: [prefix, 'checkguincho://'],
  config: {
    screens: {
      'pagamento/sucesso': 'pagamento/sucesso',
      'pagamento/falha': 'pagamento/falha',
      'pagamento/pendente': 'pagamento/pendente',
    },
  },
};
```

#### screens/PagamentoCallbackScreen.tsx
```typescript
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export const PagamentoSucessoScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    // Simular validação com backend
    const validarPagamento = async () => {
      try {
        // Backend já atualizou as licensas via webhook
        // Apenas deixamos o usuario saber que foi bem sucedido
        await new Promise(resolve => setTimeout(resolve, 2000));
        setLoading(false);
      } catch (error) {
        Alert.alert('Erro', 'Falha ao validar pagamento');
        navigation.goBack();
      }
    };

    validarPagamento();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.text}>Processando pagamento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✅ Pagamento Confirmado!</Text>
      <Text style={styles.subtitle}>
        Suas licenças foram ativadas com sucesso.
      </Text>
      <Text style={styles.message}>
        Você agora pode fazer login em múltiplos dispositivos.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          navigation.navigate('Home');
        }}
      >
        <Text style={styles.buttonText}>Voltar ao Início</Text>
      </TouchableOpacity>
    </View>
  );
};

export const PagamentoFalhaScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>❌ Pagamento Não Confirmado</Text>
      <Text style={styles.subtitle}>
        Seu pagamento não pôde ser processado.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Tentar Novamente</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});
```

---

## 📋 Checklist Frontend

- [ ] Device ID capture implementado
- [ ] Device ID enviado em `/auth/cadastrar`
- [ ] Device ID enviado em `/auth/login`
- [ ] LicenseSelectionModal criado
- [ ] Preço dinâmico funcionando (R$5 × quantidade)
- [ ] Mercado Pago redirect funcionando
- [ ] Deep links configurados
- [ ] SESSION_REPLACED error tratado
- [ ] Pagamento sucesso screen implementada
- [ ] Pagamento falha screen implementada
- [ ] Testes end-to-end passando

---

## 🧪 Testar Integração Completa

1. **Instalar app em device real ou emulador**
2. **Registrar nova conta** -> enviando device_id
3. **Fazer login** -> verificando device_id
4. **Clicar "Comprar Licenças"** -> modal aparece
5. **Selecionar 3 licenças** -> valor = R$15
6. **Clicar "Ir para Pagamento"** -> redireciona Mercado Pago
7. **Fazer pagamento** (PIX) -> app volta
8. **Verificar novo disponibilidade de 3 dispositivos**

---

**Status**: 📱 Pronto para implementação  
**Data**: 2025-02-05
