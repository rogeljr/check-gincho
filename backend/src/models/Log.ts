import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Empresa from './Empresa';
import Usuario from './Usuario';

interface LogAttributes {
  id: number;
  empresa_id?: number;
  usuario_id?: number;
  acao: string;
  entidade: string;
  entidade_id?: number;
  ip?: string;
  user_agent?: string;
  detalhes?: any;
  createdAt?: Date;
}

interface LogCreationAttributes extends Optional<LogAttributes, 'id'> {}

class Log extends Model<LogAttributes, LogCreationAttributes> implements LogAttributes {
  public id!: number;
  public empresa_id?: number;
  public usuario_id?: number;
  public acao!: string;
  public entidade!: string;
  public entidade_id?: number;
  public ip?: string;
  public user_agent?: string;
  public detalhes?: any;
  
  public readonly createdAt!: Date;
}

Log.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    acao: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entidade: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    entidade_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    detalhes: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['usuario_id'] },
      { fields: ['acao'] },
      { fields: ['entidade'] }
    ]
  }
);

// Relacionamentos
Log.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Log.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

export default Log;
