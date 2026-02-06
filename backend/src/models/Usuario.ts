import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Empresa from './Empresa';

interface UsuarioAttributes {
  id: number;
  empresa_id: number;
  nome: string;
  email: string;
  senha: string;
  role: 'admin' | 'operador' | 'visualizador';
  ativo: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface UsuarioCreationAttributes extends Optional<UsuarioAttributes, 'id' | 'ativo' | 'role'> {}

class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes> implements UsuarioAttributes {
  public id!: number;
  public empresa_id!: number;
  public nome!: string;
  public email!: string;
  public senha!: string;
  public role!: 'admin' | 'operador' | 'visualizador';
  public ativo!: boolean;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Usuario.init(
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
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    senha: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'operador', 'visualizador'),
      defaultValue: 'operador'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  },
  {
    sequelize,
    tableName: 'usuarios',
    timestamps: true
  }
);

// Relacionamentos
Usuario.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Empresa.hasMany(Usuario, { foreignKey: 'empresa_id', as: 'usuarios' });

export default Usuario;
