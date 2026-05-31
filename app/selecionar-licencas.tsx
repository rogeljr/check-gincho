import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import pagamentoService from '../services/pagamento.service';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SelecionarLicencasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { empresa, updateEmpresa } = useAuth();
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState(1);
  const [loading, setLoading] = useState(false);

  const licencasAtuais = empresa?.quantidade_licencas || 1;
  const diasRestantes = empresa?.diasRestantes || 0;
  const assinaturaAtiva = !!empresa?.assinaturaAtiva && diasRestantes > 0;
  const precoUnitario = 5.00; // R$ 5 por licença
  const valorTotal = precoUnitario * quantidadeSelecionada;
  const isRenovacaoMesmaQuantidade = quantidadeSelecionada === licencasAtuais;
  const acaoPagamento = isRenovacaoMesmaQuantidade ? 'Renovar' : 'Alterar';

  useEffect(() => {
    setQuantidadeSelecionada(licencasAtuais);
  }, [licencasAtuais]);

  const handleSelecionarLicencas = async () => {
    if (!quantidadeSelecionada || quantidadeSelecionada < 1 || quantidadeSelecionada > 10) {
      Alert.alert('Erro', 'Selecione entre 1 e 10 licenças');
      return;
    }

    // Verificar se já tem assinatura ativa
    if (assinaturaAtiva && diasRestantes > 7) {
      Alert.alert(
        'Assinatura Ativa',
        `Você ainda tem ${diasRestantes} dias restantes da sua assinatura atual.\n\nSó é possível alterar ou renovar licenças nos últimos 7 dias antes da renovação, para evitar cobranças duplicadas.`,
        [{ text: 'Entendi' }]
      );
      return;
    }

    setLoading(true);

    try {
      console.log(`🔄 Enviando solicitação de ${quantidadeSelecionada} licenças...`);
      
      const response = await pagamentoService.selecionarLicencas(quantidadeSelecionada);
      
      console.log('✅ Resposta recebida:', response);
      
      const checkoutUrl = response.checkout_url || response.init_point || response.sandbox_init_point;

      if (checkoutUrl) {
        // Abrir URL de pagamento
        await WebBrowser.openBrowserAsync(checkoutUrl);
        
        // Após retornar do pagamento, atualizar dados da empresa
        await updateEmpresa();
        
        Alert.alert(
          'Pagamento Enviado',
          'Sua solicitação foi enviada para processamento. Você será redirecionado.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(tabs)');
              }
            }
          ]
        );
      } else {
        Alert.alert('Erro', 'Não foi possível gerar o link de pagamento');
      }
    } catch (error: any) {
      console.error('❌ Erro:', error);
      const mensagem = error.response?.data?.error || 'Erro ao processar solicitação de licenças';
      Alert.alert('Erro', mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selecionar Licenças</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Informações da Empresa */}
      <View style={styles.empresaCard}>
        <Text style={styles.empresaNome}>{empresa?.nome}</Text>
        <Text style={styles.empresaInfo}>
          Licenças Ativas: <Text style={styles.licencasAtivas}>{licencasAtuais}</Text>
        </Text>
        <Text style={styles.empresaInfo}>
          Dias Restantes: <Text style={styles.licencasAtivas}>{diasRestantes}</Text>
        </Text>
        
        {/* Aviso se não pode alterar licenças ainda */}
        {assinaturaAtiva && diasRestantes > 7 && (
          <View style={styles.avisoCard}>
            <Text style={styles.avisoTexto}>
              Você só poderá alterar ou renovar licenças nos últimos 7 dias antes da renovação (faltam {diasRestantes - 7} dias).
            </Text>
          </View>
        )}
      </View>

      {/* Informações de Preço */}
      <View style={styles.precoCard}>
        <View style={styles.precoRow}>
          <Text style={styles.precoLabel}>Preço por Licença:</Text>
          <Text style={styles.precoValor}>R$ {precoUnitario.toFixed(2)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.precoRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValor}>R$ {valorTotal.toFixed(2)}</Text>
        </View>
      </View>

      {/* Seletor de Quantidade */}
      <View style={styles.seletorCard}>
        <Text style={styles.seletorTitle}>Quantas Licenças Você Precisa?</Text>
        <Text style={styles.seletorSubtitle}>Mínimo 1, Máximo 10 licenças</Text>

        {/* Botões de Quantidade */}
        <View style={styles.botoesContainer}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={`line1_${num}`}
              style={[
                styles.botaoQuantidade,
                quantidadeSelecionada === num && styles.botaoSelecionado,
              ]}
              onPress={() => setQuantidadeSelecionada(num)}
            >
              <Text
                style={[
                  styles.textoBotao,
                  quantidadeSelecionada === num && styles.textoSelecionado,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.botoesContainer}>
          {[6, 7, 8, 9, 10].map((num) => (
            <TouchableOpacity
              key={`line2_${num}`}
              style={[
                styles.botaoQuantidade,
                quantidadeSelecionada === num && styles.botaoSelecionado,
              ]}
              onPress={() => setQuantidadeSelecionada(num)}
            >
              <Text
                style={[
                  styles.textoBotao,
                  quantidadeSelecionada === num && styles.textoSelecionado,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Input customizado para quantidade */}
      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>Ou digite a quantidade:</Text>
        <View style={styles.inputContainer}>
          <TouchableOpacity
            onPress={() => {
              if (quantidadeSelecionada > 1) {
                setQuantidadeSelecionada(quantidadeSelecionada - 1);
              }
            }}
            style={styles.botaoMinusPlus}
          >
            <Text style={styles.textoBotaoMinusPlus}>−</Text>
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputValor}>{quantidadeSelecionada}</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (quantidadeSelecionada < 10) {
                setQuantidadeSelecionada(quantidadeSelecionada + 1);
              }
            }}
            style={styles.botaoMinusPlus}
          >
            <Text style={styles.textoBotaoMinusPlus}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Resumo Final */}
      <View style={styles.resumoCard}>
        <View style={styles.resumoRow}>
          <Text style={styles.resumoLabel}>Licenças Selecionadas:</Text>
          <Text style={styles.resumoValor}>{quantidadeSelecionada}</Text>
        </View>
        <View style={styles.resumoRow}>
          <Text style={styles.resumoLabel}>Ação:</Text>
          <Text style={styles.resumoValor}>{acaoPagamento}</Text>
        </View>
        <View style={styles.resumoRow}>
          <Text style={styles.resumoLabel}>Valor Total:</Text>
          <Text style={styles.resumoValorTotal}>R$ {valorTotal.toFixed(2)}</Text>
        </View>
        <Text style={styles.infoText}>
          ℹ️ Você será redirecionado para o Mercado Pago para confirmar o pagamento
        </Text>
      </View>

      {/* Botão de Prosseguir */}
      <TouchableOpacity
        style={[styles.botaoProsseguir, loading && styles.botaoDesabilitado]}
        onPress={handleSelecionarLicencas}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Ionicons name="card" size={20} color="#FFF" />
            <Text style={styles.textoBotaoProsseguir}>
              {acaoPagamento} no Pagamento
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Botão Cancelar */}
      <TouchableOpacity
        style={styles.botaoCancelar}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text style={styles.textoBotaoCancelar}>Cancelar</Text>
      </TouchableOpacity>

      <View style={{ height: Math.max(insets.bottom, 24) + 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  empresaCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  empresaNome: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  empresaInfo: {
    fontSize: 14,
    color: '#666',
  },
  licencasAtivas: {
    fontWeight: '600',
    color: '#007AFF',
    fontSize: 16,
  },
  avisoCard: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  avisoTexto: {
    fontSize: 13,
    color: '#856404',
    lineHeight: 18,
  },
  precoCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  precoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  precoLabel: {
    fontSize: 14,
    color: '#666',
  },
  precoValor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  seletorCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  seletorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  seletorSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  botaoQuantidade: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  botaoSelecionado: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  textoBotao: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  textoSelecionado: {
    color: '#007AFF',
  },
  inputCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  botaoMinusPlus: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  textoBotaoMinusPlus: {
    fontSize: 24,
    fontWeight: '600',
    color: '#007AFF',
  },
  inputWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  inputValor: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  resumoCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  resumoLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  resumoValor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  resumoValorTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  infoText: {
    fontSize: 12,
    color: '#0056B3',
    marginTop: 12,
    fontStyle: 'italic',
  },
  botaoProsseguir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  textoBotaoProsseguir: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  botaoCancelar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#999',
  },
  textoBotaoCancelar: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});
