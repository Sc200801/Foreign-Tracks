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
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Teachers', // Nombre exacto de la tabla de profesores en MariaDB
      key: 'id'
    }
  }
}, {
  tableName: 'GroupRooms', // Apunta exactamente a la tabla GroupRooms en MariaDB
  timestamps: true,
});

module.exports = GroupRoom;