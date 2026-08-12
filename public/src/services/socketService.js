// js/socketService.js
import { API_BASE_URL, obtenerToken } from './config.js';

// Variable global interna para mantener la instancia de la conexión
let socket = null;

/**
 * Conecta el cliente a Socket.io enviando el token JWT en el handshake auth
 */
export const conectarSocket = () => {
    const token = obtenerToken();

    if (!token) {
        console.error('No se encontró el token de autenticación.');
        alert('Debes iniciar sesión para realizar esta acción.');
        return null;
    }

    // Si no existe conexión activa, la creamos
    if (!socket || !socket.connected) {
        // io() proviene de la librería cliente de Socket.io
        socket = io(API_BASE_URL, {
            auth: {
                token: token // Este token es validado por authSocketMiddleware.js
            }
        });

        socket.on('connect', () => {
            console.log('🔌 Conectado exitosamente al WebSocket:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Error de autenticación o conexión en Socket.io:', error.message);
        });
    }

    return socket;
};

/**
 * Solicita la creación de una sala al servidor y escucha el código generado
 * @param {Function} alRecibirCodigo - Función callback que recibe el código de 6 dígitos
 */
export const pedirCreacionDeSala = (alRecibirCodigo) => {
    const activeSocket = conectarSocket();

    if (!activeSocket) return;

    // Evitamos duplicar escuchadores del evento 'sala-creada'
    activeSocket.off('sala-creada');

    // Escuchamos la respuesta enviada por el backend (roomHandler.js)
    activeSocket.on('sala-creada', (data) => {
        console.log('📩 Respuesta recibida del backend:', data);
        
        // Esperamos un objeto del backend con la forma { roomCode: '123456' }
        if (data && data.roomCode) {
            alRecibirCodigo(data.roomCode);
        }
    });

    // Emitimos el evento 'crear-sala' hacia el servidor
    activeSocket.emit('crear-sala');
};