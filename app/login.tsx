import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [codigo, setCodigo] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!codigo.trim() || !login.trim() || !senha.trim()) {
      Alert.alert('Erro', 'Digite codigo da empresa, login e senha');
      return;
    }

    setLoading(true);

    try {
      await signIn(codigo, login, senha);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Check Guincho</Text>

          <Image
            source={require('../assets/images/checkgincho.jpg')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.subtitle}>Sistema de Gestao de Sinistros</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Codigo da Empresa</Text>
            <TextInput
              style={styles.input}
              value={codigo}
              onChangeText={setCodigo}
              placeholder="Digite o codigo da empresa"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <Text style={styles.label}>Login</Text>
            <TextInput
              style={styles.input}
              value={login}
              onChangeText={setLogin}
              placeholder="CNPJ, CPF ou usuario"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

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
              onPress={() => router.push('/cadastro-empresa')}
            >
              <Text style={styles.linkText}>Cadastrar nova empresa</Text>
            </TouchableOpacity>
          </View>
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
