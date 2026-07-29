const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize, connectDB } = require('./src-server/config/db');
require('dotenv').config();

// 1. Importar manejador de salas y middleware de sockets
const registerRoomHandlers = require('./src-server/sockets/roomHandler');
const authSocketMiddleware = require('./src-server/middlewares/authSocketMiddleware');

// 2. Importar rutas REST de la API
const authRoutes = require('./src-server/routes/authRoutes'); // Ajusta la ruta si tus routes están en la raíz

// Carga de todos los modelos y relaciones antes de sincronizar la BD
require('./src-server/models');

const app = express();
const server = http.createServer(app);

// Inicialización de Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Middlewares HTTP para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta pública del cliente (index.html, Phaser, assets)
app.use(express.static('public'));

// 3. Integración de Rutas de la API REST
app.use('/api/auth', authRoutes);

// Registrar middleware de autenticación en Socket.io (se ejecuta antes del 'connection')
io.use(authSocketMiddleware);

// Eventos base de WebSockets
io.on('connection', (socket) => {
  // Extraemos la identidad vinculada por el middleware de socket
  const { id, role, name, playerId, teacherId } = socket.user || {};
  
  const activeId = role === 'teacher' ? `Teacher ID: ${teacherId || id}` : `Player ID: ${playerId || id}`;

  console.log(`🔌 WebSocket conectado:`);
  console.log(`   - Socket ID: ${socket.id}`);
  console.log(`   - Usuario: ${name || 'Sin nombre'}`);
  console.log(`   - Rol: ${role || 'desconocido'}`);
  console.log(`   - Identidad: ${activeId}`);

  // Registrar eventos de las salas
  registerRoomHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log(`❌ Usuario desconectado (Socket: ${socket.id}, User ID: ${id})`);
  });
});

const PORT = process.env.PORT || 3000;

// Función para arrancar la base de datos y el servidor HTTP/Sockets
async function startServer() {
  // 1. Probar la conexión a MariaDB
  await connectDB();

  // 2. Sincronizar modelos con MariaDB
  await sequelize.sync({ alter: true });
  console.log('✅ Modelos y relaciones sincronizados con MariaDB.');

  // 3. Encender el servidor
  server.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`🔐 Rutas de autenticación disponibles en http://localhost:${PORT}/api/auth`);
  });
}

startServer();