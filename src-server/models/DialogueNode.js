const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DialogueNode = sequelize.define('DialogueNode', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  situationTextEn: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  correctAnswerPattern: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  timestamps: false,
});

module.exports = DialogueNode;