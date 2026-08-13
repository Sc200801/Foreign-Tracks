// ==========================================
// 1. CONFIGURACIÓN DEL SERVIDOR Y AUTENTICACIÓN
// ==========================================

const API_BASE_URL = 'http://localhost:3000/api';

const CONFIG = {
    API_URL: API_BASE_URL,
    SOCKET_URL: 'http://localhost:3000'
};

function obtenerToken() {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
    return usuarioGuardado.token || localStorage.getItem('token') || null;
}

const CLAVE_DOCENTE_SECRET = "ADMIN123";

// Hacer disponibles globalmente en window
window.API_BASE_URL = API_BASE_URL;
window.CONFIG = CONFIG;
window.obtenerToken = obtenerToken;
window.CLAVE_DOCENTE_SECRET = CLAVE_DOCENTE_SECRET;

// ==========================================
// 2. CONTROL DE NAVEGACIÓN ENTRE PANTALLAS
// ==========================================

function mostrarPantalla(idPantalla) {
    // Ocultar todas las pantallas y pantallas de bienvenida
    document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(div => {
        div.classList.add('oculto');
    });

    // Mostrar la pantalla objetivo
    const pantallaTarget = document.getElementById(idPantalla);
    if (pantallaTarget) {
        pantallaTarget.classList.remove('oculto');
    }
}

// Hacer global la función para que auth-teacher.js y room.js la usen directamente
window.mostrarPantalla = mostrarPantalla;

document.addEventListener('DOMContentLoaded', () => {
    // 1. EVALUAR REGISTRO PREVIO
    const usuarioGuardado = localStorage.getItem('usuarioRegistrado');

    if (usuarioGuardado) {
        mostrarPantalla('pantalla-rol');
    } else {
        mostrarPantalla('pantalla-bienvenida-inicial');
    }

    // 2. BOTÓN BIENVENIDA -> REGISTRO
    document.getElementById('btn-ir-registro')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantalla('pantalla-registro-inicial');
    });

    // 3. NAVEGACIÓN EN LA SELECCIÓN DE ROL
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

    // 4. CERRAR SESIÓN
    const resetSesion = (e) => {
        if (e) e.preventDefault();
        localStorage.removeItem('usuarioRegistrado');
        localStorage.removeItem('token');
        sessionStorage.removeItem('tempUserData');
        mostrarPantalla('pantalla-registro-inicial');
    };

    document.getElementById('btn-logout')?.addEventListener('click', resetSesion);
    document.getElementById('btn-logout-student')?.addEventListener('click', resetSesion);
});