import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Empresa from './Empresa';

interface SinistroAttributes {
  id: number;
  empresa_id: number;
  usuario_id?: number;
  numero_sinistro?: string;
  placa_veiculo: string;
  tipo_atendimento: string;
  nome_cliente?: string;
  cpf_cliente?: string;
  telefone_cliente?: string;
  modelo_veiculo?: string;
  cor_veiculo?: string;
  observacoes?: string;
  status: 'rascunho' | 'em_andamento' | 'finalizado' | 'cancelado';
  latitude_inicio?: number;
  longitude_inicio?: number;
  origem_endereco?: string;
  latitude_fim?: number;
  longitude_fim?: number;
  destino_endereco?: string;
  quilometragem?: number;
  assinatura_url?: string;
  assinatura_nome?: string;
  assinatura_timestamp?: Date;
  pdf_url?: string;
  finalizado_em?: Date;
  sincronizado: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SinistroCreationAttributes extends Optional<SinistroAttributes, 'id' | 'status' | 'sincronizado'> {}

class Sinistro extends Model<SinistroAttributes, SinistroCreationAttributes> implements SinistroAttributes {
  public id!: number;
  public empresa_id!: number;
  public usuario_id?: number;
  public numero_sinistro?: string;
  public placa_veiculo!: string;
  public tipo_atendimento!: string;
  public nome_cliente?: string;
  public cpf_cliente?: string;
  public telefone_cliente?: string;
  public modelo_veiculo?: string;
  public cor_veiculo?: string;
  public observacoes?: string;
  public status!: 'rascunho' | 'em_andamento' | 'finalizado' | 'cancelado';
  public latitude_inicio?: number;
  public longitude_inicio?: number;
  public origem_endereco?: string;
  public latitude_fim?: number;
  public longitude_fim?: number;
  public destino_endereco?: string;
  public quilometragem?: number;
  public assinatura_url?: string;
  public assinatura_nome?: string;
  public assinatura_timestamp?: Date;
  public pdf_url?: string;
  public finalizado_em?: Date;
  public sincronizado!: boolean;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Sinistro.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'empresas',
        key: 'id'
      }
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    numero_sinistro: {
      type: DataTypes.STRING(30),
      allowNull: true,
      unique: true
    },
    placa_veiculo: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    tipo_atendimento: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    nome_cliente: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    cpf_cliente: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    telefone_cliente: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    modelo_veiculo: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    cor_veiculo: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('rascunho', 'em_andamento', 'finalizado', 'cancelado'),
      defaultValue: 'rascunho'
    },
    latitude_inicio: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude_inicio: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    origem_endereco: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    latitude_fim: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true
    },
    longitude_fim: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true
    },
    destino_endereco: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    quilometragem: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    assinatura_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    assinatura_nome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    assinatura_timestamp: {
      type: DataTypes.DATE,
      allowNull: true
    },
    pdf_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    finalizado_em: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sincronizado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'sinistros',
    timestamps: true,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['status'] },
      { fields: ['sincronizado'] }
    ]
  }
);

// Relacionamentos
Sinistro.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Empresa.hasMany(Sinistro, { foreignKey: 'empresa_id', as: 'sinistros' });

export default Sinistro;
