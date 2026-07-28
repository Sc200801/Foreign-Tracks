const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize, connectDB } = require('./src-server/config/db');
require('dotenv').config();

// Carga de todos los modelos y relaciones antes de sincronizar la BD
require('./src-server/models');

const app = express();
const server = http.createServer(app);

// Inicialización de Socket.io enlazado al servidor HTTP
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Middlewares para procesar datos JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta pública del cliente (index.html, Phaser, assets)
app.use(express.static('public'));

// Eventos base de WebSockets (Socket.io)
io.on('connection', (socket) => {
  console.log(`🔌 Jugador conectado vía WebSocket: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Jugador desconectado: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;

// Función para arrancar todo el backend
async function startServer() {
  // 1. Probar la conexión a MariaDB
  await connectDB();

  // 2. Sincronizar modelos con MariaDB
  await sequelize.sync({ alter: true });
  console.log('✅ Modelos y relaciones sincronizados con MariaDB.');

  // 3. Encender el servidor HTTP y Socket.io
  server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();