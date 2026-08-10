// ==========================================
// 1. CONFIGURACIÓN DEL SERVIDOR Y AUTENTICACIÓN
// ==========================================

// Dirección IP/Puerto del servidor Backend (Ajusta si tu backend corre en otro puerto)
export const API_BASE_URL = 'http://localhost:3000';

// Configuración global accesible
export const CONFIG = {
    API_URL: API_BASE_URL,
    SOCKET_URL: API_BASE_URL
};

/**
 * Función auxiliar para obtener el token JWT almacenado en el navegador
 */
export function obtenerToken() {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
    return usuarioGuardado.token || localStorage.getItem('token') || null;
}

// Clave secreta institucional para docentes
const CLAVE_DOCENTE_SECRET = "ADMIN123";

// ==========================================
// 2. CONTROL DE NAVEGACIÓN ENTRE PANTALLAS
// ==========================================

// Función global para alternar la visibilidad entre las pantallas
function mostrarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(div => div.classList.add('oculto'));
    const pantallaTarget = document.getElementById(idPantalla);
    if (pantallaTarget) {
        pantallaTarget.classList.remove('oculto');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. EVALUAR SI YA EXISTE UN REGISTRO EN LOCALSTORAGE
    const usuarioGuardado = localStorage.getItem('usuarioRegistrado');

    if (usuarioGuardado) {
        // Si ya se registró antes, pasa directo a Selección de Rol
        mostrarPantalla('pantalla-rol');
    } else {
        // Si es primera vez, muestra la pantalla de Registro Inicial
        mostrarPantalla('pantalla-registro-inicial');
    }

    // 2. NAVEGACIÓN EN LA SELECCIÓN DE ROL
    document.getElementById('btn-rol-profesor')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantalla('pantalla-clave-docente');
    });

    document.getElementById('btn-rol-student')?.addEventListener('click', (e) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
        const bienvenida = document.getElementById('bienvenida-alumno');
        if (bienvenida) bienvenida.innerText = `Hola, ${user.fullname || 'Alumno'}`;
        mostrarPantalla('pantalla-alumno');
    });

    document.getElementById('btn-volver-rol')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantalla('pantalla-rol');
    });

    // 3. CERRAR SESIÓN (REINICIAR CUENTA LOCAL)
    const resetSesion = (e) => {
        if (e) e.preventDefault();
        localStorage.removeItem('usuarioRegistrado');
        localStorage.removeItem('token'); // Limpiamos también el token si existiera
        mostrarPantalla('pantalla-registro-inicial');
    };

    document.getElementById('btn-logout')?.addEventListener('click', resetSesion);
    document.getElementById('btn-logout-student')?.addEventListener('click', resetSesion);
});