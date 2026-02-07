import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Sinistro from './Sinistro';

interface FotoAttributes {
  id: number;
  sinistro_id: number;
  url: string;
  cloudinary_id?: string;
  descricao?: string;
  ordem: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FotoCreationAttributes extends Optional<FotoAttributes, 'id' | 'ordem' | 'cloudinary_id'> {}

class Foto extends Model<FotoAttributes, FotoCreationAttributes> implements FotoAttributes {
  public id!: number;
  public sinistro_id!: number;
  public url!: string;
  public cloudinary_id?: string;
  public descricao?: string;
  public ordem!: number;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Foto.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    sinistro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'sinistros',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    url: {
      type: DataTypes.STRING(2000),
      allowNull: false
    },
    cloudinary_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    ordem: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    sequelize,
    tableName: 'fotos',
    timestamps: true,
    indexes: [
      { fields: ['sinistro_id'] }
    ]
  }
);

// Relacionamentos
Foto.belongsTo(Sinistro, { foreignKey: 'sinistro_id', as: 'sinistro' });
Sinistro.hasMany(Foto, { foreignKey: 'sinistro_id', as: 'fotos' });

export default Foto;
