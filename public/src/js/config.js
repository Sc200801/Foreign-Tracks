// URL base del backend Express
export const API_BASE_URL = 'http://localhost:3000/api';

// Clave secreta institucional para docentes
const CLAVE_DOCENTE_SECRET = "ADMIN123";

// Función global para alternar la visibilidad entre las pantallas
function mostrarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(div => div.classList.add('oculto'));
    const pantallaTarget = document.getElementById(idPantalla);
    if (pantallaTarget) {
        pantallaTarget.classList.remove('oculto');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. EVALUAR SI YA EXISTE UN REGISTRO TEMPORAL O DEFINITIVO
    // Si hay datos temporales o registro previa, se evalúa a dónde enviar al usuario
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
        sessionStorage.removeItem('tempUserData');
        mostrarPantalla('pantalla-registro-inicial');
    };

    document.getElementById('btn-logout')?.addEventListener('click', resetSesion);
    document.getElementById('btn-logout-student')?.addEventListener('click', resetSesion);
});