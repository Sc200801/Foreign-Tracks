const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GameSession = sequelize.define('GameSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  badgesEarned: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  survivalHealth: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  accumulatedEnglishScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  timestamps: true, // Maneja automáticamente la última conexión / actualización
});

module.exports = GameSession;