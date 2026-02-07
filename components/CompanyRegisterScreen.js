import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

const CompanyRegisterScreen = () => {
  // Router do Expo (usado para navegar entre telas)
  const router = useRouter();

  // Estados do formulário (UI apenas)
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [email, setEmail] = useState('');

  // Ação do botão "Cadastrar"
  const handleRegister = () => {
    /**
     * FUTURO:
     * - Aqui vai salvar no banco
     * - Enviar e-mail para criar senha
     * - Iniciar contagem dos 7 dias
     */

    console.log('Empresa:', companyName);
    console.log('Código:', companyCode);
    console.log('E-mail:', email);

    // Após cadastro → vai direto para tela principal (fake por enquanto)
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro da Empresa</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome da empresa"
        value={companyName}
        onChangeText={(text) => {
          setCompanyName(text);

          /**
           * FUTURO:
           * Aqui pode gerar sugestão automática do código
           * Ex: "Guincho Silva" → "guincho-silva"
           */
        }}
      />

      <TextInput
        style={styles.input}
        placeholder="Código da empresa"
        value={companyCode}
        onChangeText={setCompanyCode}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail do responsável"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Button title="Cadastrar empresa" onPress={handleRegister} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
});

export default CompanyRegisterScreen;
