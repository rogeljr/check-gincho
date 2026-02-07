// ================================
// IMPORTAÇÕES
// ================================


// Hooks do React
import { useState } from 'react';

// Componentes do React Native
import { Button, Image, StyleSheet, TextInput, View } from 'react-native';

// Navegação (Expo Router)
import { useRouter } from 'expo-router';


// ================================
// COMPONENTE PRINCIPAL
// ================================
const LoginScreen = () => {

  // -------------------------------
  // NAVEGAÇÃO
  // Aqui usamos para ir para outras telas
  // -------------------------------
  const router = useRouter();


  // -------------------------------
  // ESTADOS
  // -------------------------------

  // Código da empresa digitado
  const [companyCode, setCompanyCode] = useState('');

  // Senha (só aparece depois do código válido)
  const [password, setPassword] = useState('');

  // Controla se o código da empresa foi "validado"
  // (por enquanto é só visual)
  const [companyValidated, setCompanyValidated] = useState(false);


  // -------------------------------
  // FUNÇÕES
  // -------------------------------

  // SIMULA validação do código da empresa
  // FUTURO: aqui vai buscar no banco de dados
  const handleValidateCompany = () => {
    if (companyCode === '000') {
      setCompanyValidated(true);
    } else {
      alert('Empresa não encontrada');
    }
  };

  // Login (ainda sem backend)
  const handleLogin = () => {
    console.log('Empresa:', companyCode);
    console.log('Senha:', password);
  };

  // Navegar para cadastro da empresa
  // FUTURO: tela de cadastro + banco
  const handleRegisterCompany = () => {
    // usar rota relativa sem barra para compatibilidade com expo-router
    router.push('cadastro-empresa');
  };


  // ================================
  // RENDERIZAÇÃO
  // ================================
  return (
    <View style={styles.container}>

      {/* LOGO */}
      <Image
        source={require('../assets/images/logo.png')}
        style={styles.logo}
      />

      {/* CÓDIGO DA EMPRESA */}
      <TextInput
        style={styles.input}
        placeholder="Código da empresa"
        value={companyCode}
        onChangeText={setCompanyCode}
      />

      {/* BOTÃO VALIDAR EMPRESA */}
      {!companyValidated && (
        <Button
          title="Confirmar empresa"
          onPress={handleValidateCompany}
        />
      )}

      {/* SE A EMPRESA EXISTIR, MOSTRA SENHA E LOGIN */}
      {companyValidated && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title="Entrar"
            onPress={handleLogin}
          />
        </>
      )}

      {/* OPÇÃO PARA CADASTRAR EMPRESA */}
      {!companyValidated && (
        <View style={{ marginTop: 20 }}>
          <Button
            title="Cadastrar empresa"
            onPress={handleRegisterCompany}
          />
        </View>
      )}

    </View>
  );
};


// ================================
// ESTILOS
// ================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
});


// ================================
// EXPORT
// ================================
export default LoginScreen;
