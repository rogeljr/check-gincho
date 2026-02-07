import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Empresa from './Empresa';

interface PagamentoAttributes {
  id: number;
  empresa_id: number;
  mercadopago_id?: string;
  valor: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  tipo_pagamento: string; // Aceita qualquer tipo do Mercado Pago
  data_pagamento?: Date;
  data_expiracao?: Date;
  quantidade_licencas_solicitadas?: number; // Número de licenças pedidas neste pagamento
  metadata?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

interface PagamentoCreationAttributes extends Optional<PagamentoAttributes, 'id' | 'status'> {}

class Pagamento extends Model<PagamentoAttributes, PagamentoCreationAttributes> implements PagamentoAttributes {
  public id!: number;
  public empresa_id!: number;
  public mercadopago_id?: string;
  public valor!: number;
  public status!: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  public tipo_pagamento!: string; // Aceita qualquer tipo do Mercado Pago
  public data_pagamento?: Date;
  public data_expiracao?: Date;
  public quantidade_licencas_solicitadas?: number; // Número de licenças pedidas neste pagamento
  public metadata?: any;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Pagamento.init(
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
    mercadopago_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled', 'refunded'),
      defaultValue: 'pending'
    },
    tipo_pagamento: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    data_pagamento: {
      type: DataTypes.DATE,
      allowNull: true
    },
    data_expiracao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    quantidade_licencas_solicitadas: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: 'pagamentos',
    timestamps: true,
    indexes: [
      { fields: ['empresa_id'] },
      { fields: ['mercadopago_id'] },
      { fields: ['status'] }
    ]
  }
);

// Relacionamentos
Pagamento.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Empresa.hasMany(Pagamento, { foreignKey: 'empresa_id', as: 'pagamentos' });

export default Pagamento;
