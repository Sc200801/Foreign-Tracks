const { Sequelize } = require('sequelize');
require('dotenv').config();

// Inicialización de Sequelize con MariaDB
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mariadb',
    logging: false, // Cambia a console.log si quieres ver las consultas SQL en la terminal
  }
);

// Función para verificar la conexión
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MariaDB establecida exitosamente.');
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error);
  }
};

module.exports = { sequelize, connectDB };