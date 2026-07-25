const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ending = sequelize.define('Ending', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  minEnglishScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  minHealth: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: false,
});

module.exports = Ending;