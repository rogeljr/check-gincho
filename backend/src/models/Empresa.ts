import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface EmpresaAttributes {
  id: number;
  nome: string;
  cnpj: string;
  codigo: string;
  email: string;
  senha?: string;
  ativo: boolean;
  prestador_nome?: string;
  prestador_telefone?: string;
  logo_url?: string;
  logo_cloudinary_id?: string;
  login_responsavel?: string;
  cpf_responsavel?: string;
  device_id?: string;
  active_token?: string;
  active_tokens?: string[]; // Array de tokens ativos para múltiplas licenças
  active_sessions?: Array<{
    token: string;
    device_id: string;
    usuario_id?: number;
    role?: string;
    ultimo_login: string;
  }>;
  ultimo_login?: Date;
  quantidade_licencas: number; // Número de dispositivos simultâneos permitidos
  data_inicio_trial?: Date;
  data_expiracao?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface EmpresaCreationAttributes extends Optional<EmpresaAttributes, 'id' | 'ativo' | 'senha'> {}

class Empresa extends Model<EmpresaAttributes, EmpresaCreationAttributes> implements EmpresaAttributes {
  public id!: number;
  public nome!: string;
  public cnpj!: string;
  public codigo!: string;
  public email!: string;
  public senha?: string;
  public ativo!: boolean;
  public prestador_nome?: string;
  public prestador_telefone?: string;
  public logo_url?: string;
  public logo_cloudinary_id?: string;
  public login_responsavel?: string;
  public cpf_responsavel?: string;
  public device_id?: string;
  public active_token?: string;
  public active_tokens?: string[];
  public active_sessions?: Array<{
    token: string;
    device_id: string;
    usuario_id?: number;
    role?: string;
    ultimo_login: string;
  }>;
  public ultimo_login?: Date;
  public quantidade_licencas!: number;
  public data_inicio_trial?: Date;
  public data_expiracao?: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Método para verificar se está em trial e ativo
  public isTrialAtivo(): boolean {
    if (!this.data_inicio_trial) return false;
    const agora = new Date();
    const inicio = new Date(this.data_inicio_trial);
    const diffMs = agora.getTime() - inicio.getTime();
    const diasPassados = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diasPassados < 7;
  }
  
  // Método para verificar se a assinatura está ativa
  public isAssinaturaAtiva(): boolean {
    if (!this.data_expiracao) {
      return this.isTrialAtivo();
    }
    const agora = new Date();
    return agora < this.data_expiracao;
  }
  
  // Dias restantes (trial ou assinatura)
  public diasRestantes(): number {
    if (!this.data_inicio_trial && !this.data_expiracao) return 0;
    
    const agora = new Date();
    
    // Se está em trial
    if (!this.data_expiracao) {
      const diasPassados = Math.floor((agora.getTime() - this.data_inicio_trial!.getTime()) / (1000 * 60 * 60 * 24));
      return Math.max(0, 7 - diasPassados);
    }
    
    // Se tem assinatura paga
    const diasRestantes = Math.ceil((this.data_expiracao.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diasRestantes);
  }
}

Empresa.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    cnpj: {
      type: DataTypes.STRING(18),
      allowNull: false,
      unique: true
    },
    codigo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: true // Null até confirmar email
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    prestador_nome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    prestador_telefone: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    logo_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    logo_cloudinary_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    login_responsavel: {
      type: DataTypes.STRING(80),
      allowNull: true
    },
    cpf_responsavel: {
      type: DataTypes.STRING(14),
      allowNull: true
    },
    device_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    active_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    active_tokens: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false
    },
    active_sessions: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false
    },
    ultimo_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    quantidade_licencas: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    data_inicio_trial: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_expiracao: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'empresas',
    timestamps: true
  }
);

export default Empresa;
