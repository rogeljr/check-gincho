import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import authService, { UsuarioEmpresa } from '../services/auth.service';

type RoleUsuario = 'operador' | 'visualizador';

const roleLabel = {
  admin: 'Administrador',
  operador: 'Operador',
  visualizador: 'Visualizador',
};

export default function UsuariosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [limiteFuncionarios, setLimiteFuncionarios] = useState(0);
  const [funcionariosAtivos, setFuncionariosAtivos] = useState(0);
  const [licencasTotal, setLicencasTotal] = useState(1);
  const [form, setForm] = useState({
    nome: '',
    login: '',
    senha: '',
    role: 'operador' as RoleUsuario,
    ativo: true,
  });

  const carregarUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authService.listarUsuarios();
      setUsuarios(response.usuarios);
      setLimiteFuncionarios(response.limite_funcionarios);
      setFuncionariosAtivos(response.funcionarios_ativos);
      setLicencasTotal(response.licencas_total);
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuarios();
  }, [carregarUsuarios]);

  const limparForm = () => {
    setEditandoId(null);
    setForm({
      nome: '',
      login: '',
      senha: '',
      role: 'operador',
      ativo: true,
    });
  };

  const editarUsuario = (usuario: UsuarioEmpresa) => {
    if (usuario.id === null) return;
    setEditandoId(usuario.id);
    setForm({
      nome: usuario.nome,
      login: usuario.login,
      senha: '',
      role: usuario.role === 'visualizador' ? 'visualizador' : 'operador',
      ativo: usuario.ativo,
    });
  };

  const salvarUsuario = async () => {
    if (!form.nome.trim() || !form.login.trim()) {
      Alert.alert('Aviso', 'Informe nome e login');
      return;
    }

    if (editandoId === null && form.senha.length < 6) {
      Alert.alert('Aviso', 'A senha precisa ter pelo menos 6 caracteres');
      return;
    }

    setSalvando(true);
    try {
      if (editandoId !== null) {
        await authService.atualizarUsuario(editandoId, {
          nome: form.nome.trim(),
          login: form.login.trim().toLowerCase(),
          senha: form.senha || undefined,
          role: form.role,
          ativo: form.ativo,
        });
      } else {
        await authService.criarUsuario({
          nome: form.nome.trim(),
          login: form.login.trim().toLowerCase(),
          senha: form.senha,
          role: form.role,
        });
      }

      limparForm();
      await carregarUsuarios();
      Alert.alert('Sucesso', editandoId !== null ? 'Usuário atualizado' : 'Usuário cadastrado');
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar usuário');
    } finally {
      setSalvando(false);
    }
  };

  const desativarUsuario = (usuario: UsuarioEmpresa) => {
    if (usuario.id === null || usuario.id === 0) return;

    Alert.alert(
      'Desativar usuário',
      `Deseja desativar ${usuario.nome}? O acesso dele será encerrado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.removerUsuario(usuario.id!);
              await carregarUsuarios();
            } catch (error: any) {
              Alert.alert('Erro', error.response?.data?.error || 'Erro ao desativar usuário');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2C3E50" />
        </TouchableOpacity>
        <Text style={styles.title}>Usuários</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Licenças</Text>
        <Text style={styles.licenseText}>
          {funcionariosAtivos}/{limiteFuncionarios} funcionários ativos
        </Text>
        <Text style={styles.helpText}>
          Total contratado: {licencasTotal}. A primeira licença é do administrador da empresa.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{editandoId !== null ? 'Editar usuário' : 'Novo usuário'}</Text>

        <TextInput
          style={styles.input}
          value={form.nome}
          onChangeText={(nome) => setForm((atual) => ({ ...atual, nome }))}
          placeholder="Nome"
        />

        <TextInput
          style={styles.input}
          value={form.login}
          onChangeText={(login) => setForm((atual) => ({ ...atual, login }))}
          placeholder="Login (CPF, nome ou codigo)"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          value={form.senha}
          onChangeText={(senha) => setForm((atual) => ({ ...atual, senha }))}
          placeholder={editandoId !== null ? 'Nova senha opcional' : 'Senha'}
          secureTextEntry
          autoCapitalize="none"
        />

        {editandoId !== 0 && (
          <View style={styles.roleRow}>
            {(['operador', 'visualizador'] as RoleUsuario[]).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleButton, form.role === role && styles.roleButtonActive]}
                onPress={() => setForm((atual) => ({ ...atual, role }))}
              >
                <Text style={[styles.roleButtonText, form.role === role && styles.roleButtonTextActive]}>
                  {roleLabel[role]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {editandoId !== null && editandoId !== 0 && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Usuário ativo</Text>
            <Switch
              value={form.ativo}
              onValueChange={(ativo) => setForm((atual) => ({ ...atual, ativo }))}
            />
          </View>
        )}

        <View style={styles.formActions}>
          {editandoId !== null && (
            <TouchableOpacity style={styles.secondaryButton} onPress={limparForm}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveButton, salvando && styles.buttonDisabled]}
            onPress={salvarUsuario}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{editandoId !== null ? 'Salvar' : 'Cadastrar'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cadastrados</Text>
        {loading ? (
          <ActivityIndicator color="#2563EB" />
        ) : usuarios.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum funcionário cadastrado.</Text>
        ) : (
          usuarios.map((usuario) => (
            <View key={usuario.id} style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{usuario.nome}</Text>
                <Text style={styles.userEmail}>{usuario.login}</Text>
                <Text style={[styles.userStatus, { color: usuario.ativo ? '#16A34A' : '#DC2626' }]}>
                  {roleLabel[usuario.role]} • {usuario.ativo ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
              <View style={styles.userActions}>
                <TouchableOpacity style={styles.iconButton} onPress={() => editarUsuario(usuario)}>
                  <Ionicons name="create" size={20} color="#2563EB" />
                </TouchableOpacity>
                {usuario.ativo && (
                  <TouchableOpacity style={styles.iconButton} onPress={() => desativarUsuario(usuario)}>
                    <Ionicons name="trash" size={20} color="#DC2626" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C3E50',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
  },
  licenseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563EB',
  },
  helpText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 10,
    color: '#111827',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleButtonText: {
    color: '#334155',
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  userStatus: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  userActions: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
});
