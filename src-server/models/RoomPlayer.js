const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const RoomPlayer = sequelize.define('RoomPlayer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  groupRole: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'member',
  },
}, {
  timestamps: true,
});

module.exports = RoomPlayer;