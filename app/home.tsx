import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * TELA PRINCIPAL (HOME)
 * USO:
 * - Central do aplicativo
 * - Acesso aos sinistros
 * FUTURO:
 * - Listar sinistros do banco
 * - Controle por empresa
 */
const Home = () => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Painel da Empresa</Text>

      {/* BOTÃO: NOVO SINISTRO */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          // 🔜 levar para a tela de criação do sinistro
          router.push('/sinistro/novo');
        }}
      >
        <Text style={styles.buttonText}>+ Novo Sinistro</Text>
      </TouchableOpacity>

      {/* ÁREA: SINISTROS EM ANDAMENTO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sinistros em andamento</Text>

        {/* FUTURO:
            - Aqui entra FlatList com dados do banco
            - Clique abre o sinistro
        */}
        <Text style={styles.placeholder}>Nenhum sinistro em andamento</Text>
      </View>

      {/* ÁREA: SINISTROS FINALIZADOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sinistros finalizados</Text>

        {/* FUTURO:
            - Lista com PDFs gerados
            - Opção de compartilhar
        */}
        <Text style={styles.placeholder}>Nenhum sinistro finalizado</Text>
      </View>
    </View>
  );
};

export default Home;

// ======================
// ESTILOS
// ======================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 25,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  placeholder: {
    color: '#999',
    fontStyle: 'italic',
  },
});
