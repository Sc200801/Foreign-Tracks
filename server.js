const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { sequelize, connectDB } = require('./src-server/config/db');
require('dotenv').config();

// 1. Importar las rutas de autenticación
const authRoutes = require('./src-server/routes/authRoutes');

// 2. Importar el manejador de salas y middleware de sockets
const registerRoomHandlers = require('./src-server/sockets/roomHandler');
const authSocketMiddleware = require('./src-server/middlewares/authSocketMiddleware');

// Carga de todos los modelos y relaciones antes de sincronizar la BD
require('./src-server/models');

const app = express();
const server = http.createServer(app);

// Inicialización de Socket.io con mayor tolerancia a latencia (Ngrok / Red Escolar)
const io = new Server(server, {
  cors: {
    origin: '*',
  },
  pingTimeout: 30000,  // Tiempo de espera antes de declarar desconexión (30 seg)
  pingInterval: 10000, // Intervalo entre pings de control (10 seg)
});

// Middlewares HTTP para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta pública del cliente (index.html, Phaser, assets)
app.use(express.static('public'));

// === CONEXIÓN DE RUTAS API (LOGIN Y REGISTRO) ===
app.use('/api/auth', authRoutes);

// Middleware de autenticación de WebSockets (Valida JWT en handshake)
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

  // Registrar los eventos de las salas para este socket
  registerRoomHandlers(io, socket);

  // Manejo de desconexión
  socket.on('disconnect', (reason) => {
    console.log(`❌ Usuario desconectado (Socket: ${socket.id}, User ID: ${id || 'Anon'}) - Razón: ${reason}`);
  });
});

const PORT = process.env.PORT || 3000;

// Función para arrancar la base de datos y el servidor HTTP/Sockets
async function startServer() {
  try {
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
  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor:', error);
  }
}

startServer();