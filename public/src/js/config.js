// ==========================================
// 1. CONFIGURACIÓN DEL SERVIDOR Y AUTENTICACIÓN (DINÁMICA)
// ==========================================

// Evalúa si se accede por IP local / localhost o por un Túnel Público (Cloudflare)
const esEntornoLocal = window.location.hostname === 'localhost' || window.location.hostname.match(/^\d+\.\d+\.\d+\.\d+$/);

// En red local usa puerto :3000; en el túnel público usa la URL sin puerto adicional
const BASE_URL = esEntornoLocal 
    ? `${window.location.protocol}//${window.location.hostname}:3000` 
    : window.location.origin;

const CONFIG = {
    API_URL: `${BASE_URL}/api`,
    SOCKET_URL: BASE_URL
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