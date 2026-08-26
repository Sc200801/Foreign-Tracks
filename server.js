const express = require('express');
const http = require('http');
const cors = require('cors'); // <-- Habilitar CORS para HTTP
const { Server } = require('socket.io');
const { sequelize, connectDB } = require('./src-server/config/db');
require('dotenv').config();

// 1. Importar las rutas de autenticación y escenarios
const authRoutes = require('./src-server/routes/authRoutes');
const scenarioRoutes = require('./src-server/routes/scenarioRoutes');

// 2. Importar el manejador de salas y middleware de sockets
const registerRoomHandlers = require('./src-server/sockets/roomHandler');
const authSocketMiddleware = require('./src-server/middlewares/authSocketMiddleware');

// 3. Importar el Seeder de datos iniciales (Hotel y Ending)
const seedInitialData = require('./src-server/seeders/seedData');

// Carga de todos los modelos y relaciones antes de sincronizar la BD
require('./src-server/models');

const app = express();
const server = http.createServer(app);

// Habilitar CORS para las peticiones HTTP de la API REST
app.use(cors());

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

// Integración de Rutas de la API REST
app.use('/api/auth', authRoutes);
app.use('/api/scenarios', scenarioRoutes);

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
    // Permite forzar o alterar mediante banderas de entorno, default: sync seguro sin acumular indices
    const isForce = process.env.DB_FORCE === 'true';
    const isAlter = process.env.DB_ALTER === 'true';

    await sequelize.sync({ force: isForce, alter: isAlter });
    console.log(`✅ Base de datos sincronizada (force: ${isForce}, alter: ${isAlter})`);
    
    // 3. Cargar datos iniciales en la BD (Hotel y Ending)
    await seedInitialData();

    // 4. Encender el servidor
    server.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`🔐 Rutas de autenticación disponibles en http://localhost:${PORT}/api/auth`);
      console.log(`🎬 Rutas de escenarios disponibles en http://localhost:${PORT}/api/scenarios`);
    });
  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor:', error);
  }
}

startServer();