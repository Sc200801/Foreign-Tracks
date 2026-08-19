// ==========================================
// 1. CONFIGURACIÓN DEL SERVIDOR Y AUTENTICACIÓN (RED LOCAL)
// ==========================================

const IP_LOCAL = '192.168.1.172';
const PUERTO = '3000';

const CONFIG = {
    API_URL: `http://${IP_LOCAL}:${PUERTO}/api`,
    SOCKET_URL: `http://${IP_LOCAL}:${PUERTO}`
};

function obtenerToken() {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
    return usuarioGuardado.token || localStorage.getItem('token') || null;
}

const CLAVE_DOCENTE_SECRET = "ADMIN123";

// Exportar globalmente a window
window.API_BASE_URL = CONFIG.API_URL;
window.CONFIG = CONFIG;
window.obtenerToken = obtenerToken;
window.CLAVE_DOCENTE_SECRET = CLAVE_DOCENTE_SECRET;

// ==========================================
// 2. CONTROL DE NAVEGACIÓN ENTRE PANTALLAS
// ==========================================

function mostrarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(div => {
        div.classList.add('oculto');
    });

    const pantallaTarget = document.getElementById(idPantalla);
    if (pantallaTarget) {
        pantallaTarget.classList.remove('oculto');
    }
}

window.mostrarPantalla = mostrarPantalla;

document.addEventListener('DOMContentLoaded', () => {
    const usuarioGuardado = localStorage.getItem('usuarioRegistrado');

    if (usuarioGuardado) {
        mostrarPantalla('pantalla-rol');
    } else {
        mostrarPantalla('pantalla-bienvenida-inicial');
    }

    document.getElementById('btn-ir-registro')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantalla('pantalla-registro-inicial');
    });

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