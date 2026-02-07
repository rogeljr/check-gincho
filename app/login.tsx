import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/auth.service';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [empresaExiste, setEmpresaExiste] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [verificando, setVerificando] = useState(false);
  
  const handleVerificarEmpresa = async () => {
    if (!codigo.trim()) {
      Alert.alert('Erro', 'Digite o código da empresa');
      return;
    }
    
    setVerificando(true);
    
    try {
      const response = await authService.verificarEmpresa(codigo.trim());
      
      if (response.exists) {
        if (response.needsPassword) {
          Alert.alert(
            'Aguardando Confirmação',
            'Empresa cadastrada. Verifique seu email para definir a senha.'
          );
        } else if (response.needsValidation) {
          Alert.alert(
            '📧 Confirme seu Email',
            `Seu cadastro foi realizado com sucesso!\n\nEnviamos um link de confirmação para:\n${response.email}\n\nClique no link para ativar sua conta e poder fazer login.`,
            [{ text: 'OK' }]
          );
        } else {
          setEmpresaExiste(true);
          setNomeEmpresa(response.nome || '');
        }
      } else {
        Alert.alert(
          'Empresa não encontrada',
          'Deseja cadastrar uma nova empresa?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Cadastrar',
              onPress: () => router.push('/cadastro-empresa')
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao verificar empresa');
    } finally {
      setVerificando(false);
    }
  };
  
  const handleLogin = async () => {
    if (!senha.trim()) {
      Alert.alert('Erro', 'Digite a senha');
      return;
    }
    
    setLoading(true);
    
    try {
      await signIn(codigo, senha);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };
  
  const handleVoltar = () => {
    setEmpresaExiste(false);
    setSenha('');
    setNomeEmpresa('');
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Check Guincho</Text>
          
          <Image
            source={require('../assets/images/checkgincho.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Text style={styles.subtitle}>Sistema de Gestão de Sinistros</Text>
          
          {!empresaExiste ? (
            <View style={styles.form}>
              <Text style={styles.label}>Código da Empresa</Text>
              <TextInput
                style={styles.input}
                value={codigo}
                onChangeText={setCodigo}
                placeholder="Digite o código da empresa"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!verificando}
              />
              
              <TouchableOpacity
                style={[styles.button, verificando && styles.buttonDisabled]}
                onPress={handleVerificarEmpresa}
                disabled={verificando}
              >
                {verificando ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Continuar</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push('/cadastro-empresa')}
              >
                <Text style={styles.linkText}>Cadastrar nova empresa</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.welcomeText}>Bem-vindo de volta!</Text>
              {nomeEmpresa && (
                <Text style={styles.companyName}>{nomeEmpresa}</Text>
              )}
              
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={senha}
                onChangeText={setSenha}
                placeholder="Digite sua senha"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
              
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Entrar</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleVoltar}
              >
                <Text style={styles.linkText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2C3E50',
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#7F8C8D',
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2C3E50',
  },
  companyName: {
    fontSize: 16,
    color: '#27AE60',
    marginBottom: 20,
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
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#3498DB',
    fontSize: 14,
    fontWeight: '600',
  },
});
