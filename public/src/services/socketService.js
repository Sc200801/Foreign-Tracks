import { API_BASE_URL, obtenerToken } from './config.js'; // O la ruta donde guardes este archivo

export const conectarSocket = () => {
    const token = obtenerToken();

    if (!token) {
        console.error('No se encontró el token de autenticación.');
        return null;
    }

    if (!socket || !socket.connected) {
        socket = io(API_BASE_URL, {
            auth: {
                token: token
            }
        });
    }

    return socket;
};