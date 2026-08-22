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

// 3. Importar el Seeder de datos iniciales
const seedInitialData = require('./src-server/seeders/seedData');

// Carga de todos los modelos y relaciones
require('./src-server/models');

const app = express();
const server = http.createServer(app);

// Inicialización de Socket.io con mayor tolerancia a latencia
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 30000,  // 30 seg
  pingInterval: 10000, // 10 seg
  connectTimeout: 45000 // Aumenta el tiempo máximo para completar el handshake
});

// Middlewares HTTP
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos
app.use(express.static('public'));

// API REST
app.use('/api/auth', authRoutes);

// Middleware de autenticación de WebSockets
io.use(authSocketMiddleware);

// Eventos base de WebSockets
io.on('connection', (socket) => {
  const { id, role, name, username, playerId, teacherId } = socket.user || {};
  
  const displayName = name || username || 'Sin nombre';
  const activeId = role === 'teacher' || role === 'docente' 
    ? `Teacher ID: ${teacherId || id || 'N/A'}` 
    : `Player ID: ${playerId || id || 'N/A'}`;
 
  console.log(`\n🔌 WebSocket conectado:`);
  console.log(`   - Socket ID: ${socket.id}`);
  console.log(`   - Usuario: ${displayName}`);
  console.log(`   - Rol: ${role || 'desconocido'}`);
  console.log(`   - Identidad: ${activeId}`);

  // Registrar los eventos de las salas para este socket
  registerRoomHandlers(io, socket);

  // Manejo de errores en el socket
  socket.on('error', (err) => {
    console.error(`⚠️ Error reportado en Socket ${socket.id}:`, err);
  });

  // Manejo de desconexión
  socket.on('disconnect', (reason) => {
    console.log(`❌ Usuario desconectado (Socket: ${socket.id}, User: ${displayName}) - Razón: ${reason}`);
  });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    console.log('✅ Modelos y relaciones sincronizados con MariaDB.');
    
    await seedInitialData();

    server.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`🔐 Rutas de autenticación disponibles en http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor:', error);
  }
}

startServer();