const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const GroupRoom = sequelize.define('GroupRoom', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  groupName: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  accessCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
}, {
  timestamps: true,
});

module.exports = GroupRoom;