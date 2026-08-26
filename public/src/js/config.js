// ==========================================
// 1. CONFIGURACIÓN DEL SERVIDOR Y AUTENTICACIÓN (RED LOCAL)
// ==========================================

// Detecta automáticamente la IP o Host actual (localhost, 192.168.X.X, etc.)
const HOST_ACTUAL = window.location.hostname;
const PUERTO = '3000';

const CONFIG = {
    API_URL: `http://${HOST_ACTUAL}:${PUERTO}/api`,
    SOCKET_URL: `http://${HOST_ACTUAL}:${PUERTO}`
};

function obtenerToken() {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
    return usuarioGuardado.token || localStorage.getItem('token') || null;
}

// Exportar globalmente a window
window.API_BASE_URL = CONFIG.API_URL;
window.CONFIG = CONFIG;
window.obtenerToken = obtenerToken;

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
    // Si no hay datos, mostramos la portada principal (pantalla-rol)
    mostrarPantalla('pantalla-rol');

    document.getElementById('btn-ir-registro')?.addEventListener('click', (e) => {
        e.preventDefault();
        mostrarPantalla('pantalla-acceso');
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
        mostrarPantalla('pantalla-rol');
    };
});