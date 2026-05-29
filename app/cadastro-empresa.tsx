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
} from 'react-native';
import { useRouter } from 'expo-router';
import authService from '../services/auth.service';

export default function CadastroEmpresaScreen() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    cpf_responsavel: '',
    senha: '',
    confirmarSenha: '',
  });
  const [quantidadeLicencas, setQuantidadeLicencas] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mostrarSenhas, setMostrarSenhas] = useState(false);
  
  const precoUnitario = 5.00; // R$ 5 por licença
  const valorMensal = precoUnitario * quantidadeLicencas;
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const formatCNPJ = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };
  
  const formatTelefone = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };
  
  const formatCPF = (text: string) => {
    const numbers = text.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };
  
  const handleCPFChange = (text: string) => {
    const formatted = formatCPF(text);
    handleChange('cpf_responsavel', formatted);
  };
  
  const handleCNPJChange = (text: string) => {
    const formatted = formatCNPJ(text);
    handleChange('cnpj', formatted);
  };
  
  const handleTelefoneChange = (text: string) => {
    const formatted = formatTelefone(text);
    handleChange('telefone', formatted);
  };
  
  const validateForm = () => {
    if (!formData.nome.trim()) {
      Alert.alert('Erro', 'Digite o nome da empresa');
      return false;
    }
    
    if (!formData.cnpj.trim()) {
      Alert.alert('Erro', 'Digite o CNPJ da empresa');
      return false;
    }
    
    const cnpjNumbers = formData.cnpj.replace(/\D/g, '');
    if (cnpjNumbers.length !== 14) {
      Alert.alert('Erro', 'CNPJ deve ter 14 dígitos');
      return false;
    }
    
    if (!formData.cpf_responsavel.trim()) {
      Alert.alert('Erro', 'Digite o CPF do responsável');
      return false;
    }
    
    const cpfNumbers = formData.cpf_responsavel.replace(/\D/g, '');
    if (cpfNumbers.length !== 11) {
      Alert.alert('Erro', 'CPF deve ter 11 dígitos');
      return false;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Erro', 'Digite o email da empresa');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Erro', 'Digite um email válido');
      return false;
    }

    if (!formData.senha.trim()) {
      Alert.alert('Erro', 'Digite uma senha');
      return false;
    }

    if (formData.senha.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres');
      return false;
    }

    if (formData.senha !== formData.confirmarSenha) {
      Alert.alert('Erro', 'As senhas não conferem');
      return false;
    }
    
    return true;
  };
  
  const handleCadastro = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const cnpjNumbers = formData.cnpj.replace(/\D/g, '');
      const telefoneNumbers = formData.telefone.replace(/\D/g, '');
      
      const response = await authService.cadastrarEmpresaComSenha({
        nome: formData.nome.trim(),
        cnpj: cnpjNumbers,
        email: formData.email.trim().toLowerCase(),
        senha: formData.senha,
        cpf_responsavel: formData.cpf_responsavel.replace(/\D/g, ''),
        telefone: telefoneNumbers || undefined,
        endereco: formData.endereco.trim() || undefined,
        quantidade_licencas: quantidadeLicencas,
      });
      
      Alert.alert(
        'Cadastro Realizado!',
        `Empresa cadastrada com sucesso!\n\nCódigo: ${response.codigo}\n\nLicenças: ${quantidadeLicencas}\nValor mensal: R$ ${valorMensal.toFixed(2)}\n\nLogin liberado com a senha cadastrada.`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao cadastrar empresa. Tente novamente.';
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Cadastrar Empresa</Text>
          <Text style={styles.subtitle}>
            Preencha os dados para criar sua conta
          </Text>
          
          <View style={styles.form}>
            <Text style={styles.label}>Nome da Empresa *</Text>
            <TextInput
              style={styles.input}
              value={formData.nome}
              onChangeText={(text) => handleChange('nome', text)}
              placeholder="Ex: Auto Socorro XYZ"
              editable={!loading}
            />
            
            <Text style={styles.label}>CNPJ *</Text>
            <TextInput
              style={styles.input}
              value={formData.cnpj}
              onChangeText={handleCNPJChange}
              placeholder="00.000.000/0000-00"
              keyboardType="numeric"
              maxLength={18}
              editable={!loading}
            />
            
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              placeholder="contato@empresa.com.br"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
            
            <Text style={styles.label}>CPF do Responsável *</Text>
            <TextInput
              style={styles.input}
              value={formData.cpf_responsavel}
              onChangeText={handleCPFChange}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              maxLength={14}
              editable={!loading}
            />
            
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={formData.telefone}
              onChangeText={handleTelefoneChange}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
              maxLength={15}
              editable={!loading}
            />
            
            <Text style={styles.label}>Endereço</Text>
            <TextInput
              style={styles.input}
              value={formData.endereco}
              onChangeText={(text) => handleChange('endereco', text)}
              placeholder="Rua, número, bairro, cidade - UF"
              multiline
              numberOfLines={2}
              editable={!loading}
            />
            
            <Text style={styles.label}>Senha *</Text>
            <View style={styles.senhaContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                value={formData.senha}
                onChangeText={(text) => handleChange('senha', text)}
                placeholder="Digite uma senha segura"
                secureTextEntry={!mostrarSenhas}
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.olhoButton}
                onPress={() => setMostrarSenhas(!mostrarSenhas)}
              >
                <Text style={styles.olhoIcon}>{mostrarSenhas ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Confirmar Senha *</Text>
            <TextInput
              style={styles.input}
              value={formData.confirmarSenha}
              onChangeText={(text) => handleChange('confirmarSenha', text)}
              placeholder="Confirme sua senha"
              secureTextEntry={!mostrarSenhas}
              editable={!loading}
            />
            
            {/* Seleção de Quantidade de Licenças */}
            <View style={styles.licencasContainer}>
              <Text style={styles.licencasTitle}>📱 Quantas Licenças Você Precisa?</Text>
              <Text style={styles.licencasSubtitle}>
                Selecione quantos dispositivos poderão usar o sistema simultaneamente
              </Text>
              
              {/* Seletores de 1-5 */}
              <View style={styles.licencasBotoes}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity
                    key={`lic_${num}`}
                    style={[
                      styles.licencaBotao,
                      quantidadeLicencas === num && styles.licencaBotaoSelecionado,
                    ]}
                    onPress={() => setQuantidadeLicencas(num)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.licencaBotaoTexto,
                        quantidadeLicencas === num && styles.licencaBotaoTextoSelecionado,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Seletores de 6-10 */}
              <View style={styles.licencasBotoes}>
                {[6, 7, 8, 9, 10].map((num) => (
                  <TouchableOpacity
                    key={`lic_${num}`}
                    style={[
                      styles.licencaBotao,
                      quantidadeLicencas === num && styles.licencaBotaoSelecionado,
                    ]}
                    onPress={() => setQuantidadeLicencas(num)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.licencaBotaoTexto,
                        quantidadeLicencas === num && styles.licencaBotaoTextoSelecionado,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Resumo de preço */}
              <View style={styles.precoResumo}>
                <View style={styles.precoLinha}>
                  <Text style={styles.precoLabel}>Licenças selecionadas:</Text>
                  <Text style={styles.precoValor}>{quantidadeLicencas}</Text>
                </View>
                <View style={styles.precoLinha}>
                  <Text style={styles.precoLabel}>Preço por licença:</Text>
                  <Text style={styles.precoValor}>R$ {precoUnitario.toFixed(2)}</Text>
                </View>
                <View style={[styles.precoLinha, styles.precoTotal]}>
                  <Text style={styles.precoTotalLabel}>Valor mensal:</Text>
                  <Text style={styles.precoTotalValor}>R$ {valorMensal.toFixed(2)}</Text>
                </View>
                <Text style={styles.licencasTrialText}>
                  🎁 7 dias de teste grátis! Você só pagará após o período de avaliação.
                </Text>
              </View>
            </View>
            
            <Text style={styles.info}>
              * Campos obrigatórios
            </Text>
            
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCadastro}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Text style={styles.linkText}>Voltar para o login</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.trialInfo}>
            <Text style={styles.trialText}>
              🎉 7 dias grátis para testar!
            </Text>
            <Text style={styles.trialSubtext}>
              Após o período de teste: R$ 35,00/usuário/mês
            </Text>
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
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    color: '#2C3E50',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
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
  senhaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  olhoButton: {
    padding: 12,
    marginRight: -50,
    zIndex: 1,
  },
  olhoIcon: {
    fontSize: 18,
  },
  info: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  licencasContainer: {
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3498DB',
  },
  licencasTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  licencasSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  licencasBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  licencaBotao: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#BDC3C7',
    alignItems: 'center',
    backgroundColor: '#ECF0F1',
  },
  licencaBotaoSelecionado: {
    borderColor: '#3498DB',
    backgroundColor: '#D6EAF8',
  },
  licencaBotaoTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  licencaBotaoTextoSelecionado: {
    color: '#3498DB',
    fontWeight: '700',
  },
  precoResumo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  precoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  precoLabel: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  precoValor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
  },
  precoTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ECF0F1',
    paddingTop: 12,
    marginTop: 4,
  },
  precoTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
  },
  precoTotalValor: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27AE60',
  },
  licencasTrialText: {
    fontSize: 11,
    color: '#27AE60',
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
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
  trialInfo: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#E8F8F5',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  trialText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27AE60',
    textAlign: 'center',
    marginBottom: 5,
  },
  trialSubtext: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
});
