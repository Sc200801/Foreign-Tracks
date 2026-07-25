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

// Servir la carpeta pública del cliente (index.html, Phaser, assets)[cite: 1]
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
  // ⚠️ NOTA PARA TU COMPAÑERA:
  // Si necesitan borrar las tablas viejas que ella creó manualmente, 
  // reemplaza { alter: true } por { force: true } una sola vez, enciende el servidor y vuelve a dejar { alter: true }.
  await sequelize.sync({ alter: true });
  console.log('✅ Modelos y relaciones sincronizados con MariaDB.');

  // 3. Encender el servidor HTTP y Socket.io[cite: 1]
  server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();