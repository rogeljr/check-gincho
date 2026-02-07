import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface TrialUsageAttributes {
  id: number;
  cpf?: string;
  device_id?: string;
  empresa_id: number;
  data_uso: Date;
  createdAt?: Date;
}

interface TrialUsageCreationAttributes extends Optional<TrialUsageAttributes, 'id' | 'data_uso'> {}

class TrialUsage extends Model<TrialUsageAttributes, TrialUsageCreationAttributes> implements TrialUsageAttributes {
  public id!: number;
  public cpf?: string;
  public device_id?: string;
  public empresa_id!: number;
  public data_uso!: Date;
  
  public readonly createdAt!: Date;
}

TrialUsage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: true
    },
    device_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'empresas',
        key: 'id'
      }
    },
    data_uso: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: 'trial_usage',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['cpf'] },
      { fields: ['device_id'] },
      { fields: ['empresa_id'] }
    ]
  }
);

export default TrialUsage;
