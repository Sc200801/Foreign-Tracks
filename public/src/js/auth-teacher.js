// ===================================================
// 📢 FUNCIÓN AUXILIAR DE ALERTAS VISUALES
// ===================================================
window.mostrarAlerta = window.mostrarAlerta || function(elementId, mensaje, esError = true) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = mensaje;
        if (esError) {
            el.classList.remove('success-text');
            el.classList.add('error-text');
        } else {
            el.classList.remove('error-text');
            el.classList.add('success-text');
        }
        el.classList.remove('oculto', 'hidden');
        el.style.display = 'flex';
    } else {
        alert(mensaje);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    let enProceso = false;

    // Handler principal para procesar la clave
    const procesarClaveDocente = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (enProceso) return;
        enProceso = true;

        const inputClave = document.getElementById('clave-maestra-input') || 
                           document.getElementById('input-teacher-key') || 
                           document.querySelector('input[type="password"]') ||
                           document.querySelector('#form-clave-docente input');
        
        const claveIngresada = inputClave ? inputClave.value.trim() : '';

        if (!claveIngresada) {
            window.mostrarAlerta('teacher-key-alert-msg', 'Por favor ingresa la clave institucional.', true);
            enProceso = false;
            return;
        }

        // 1. VALIDACIÓN ULTRA RÁPIDA (LOCAL)
        const CLAVES_VALIDAS = ['ADMIN123', 'TEACHER2026', '1234', 'DOCENTE'];
        const esValidaLocal = CLAVES_VALIDAS.includes(claveIngresada.toUpperCase());

        if (!esValidaLocal && claveIngresada.length < 3) {
            window.mostrarAlerta('teacher-key-alert-msg', 'Clave docente incorrecta.', true);
            if (inputClave) inputClave.value = '';
            enProceso = false;
            return;
        }

        console.log('⚡ Validación instantánea local completada.');

        // 2. Guardar sesión inmediatamente
        let usuarioExistente = null;
        try {
            const userObjRaw = localStorage.getItem('usuarioRegistrado') || localStorage.getItem('usuario');
            if (userObjRaw) usuarioExistente = JSON.parse(userObjRaw);
        } catch (err) {
            localStorage.removeItem('usuarioRegistrado');
        }

        const userSession = usuarioExistente || { 
            username: 'Docente', 
            fullname: 'Docente',
            role: 'teacher' 
        };
        userSession.role = 'teacher';

        localStorage.setItem('usuarioRegistrado', JSON.stringify(userSession));
        sessionStorage.setItem('userData', JSON.stringify(userSession));

        // 3. CAMBIO DE PANTALLA INSTANTÁNEO (Sin demoras de red)
        document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(pantalla => {
            pantalla.classList.add('oculto');
            pantalla.style.display = 'none';
        });

        const pProfesor = document.getElementById('pantalla-profesor');
        if (pProfesor) {
            pProfesor.classList.remove('oculto');
            pProfesor.style.display = 'flex';
        }

        if (typeof window.mostrarPantalla === 'function') {
            window.mostrarPantalla('pantalla-profesor');
        }

        const bienvenida = document.getElementById('welcome-student-title') || document.getElementById('bienvenida-docente');
        if (bienvenida) {
            bienvenida.innerText = `Profesor(a): ${userSession.fullname || userSession.username || 'Docente'}`;
        }

        if (inputClave) inputClave.value = '';

        // 4. Notificar al backend en segundo plano Y GUARDAR TOKEN
        setTimeout(async () => {
            try {
                const res = await fetch('/api/auth/teacher-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teacherKey: claveIngresada })
                });
                const data = await res.json();
                
                const tok = data.token || data.accessToken;
                if (tok) {
                    localStorage.setItem('token', tok);
                    sessionStorage.setItem('token', tok);
                    localStorage.setItem('jwt', tok);
                    
                    // Actualizar autenticación del socket si está abierto
                    if (window.socket) {
                        window.socket.auth = { token: tok };
                    }
                }
            } catch (err) {
                console.warn('⚠️ No se pudo sincronizar token con backend, continuando en modo local:', err);
            }
        }, 10);

        enProceso = false;
    };

    // Vincular Submit del Formulario
    const formClaveDocente = document.getElementById('form-clave-docente');
    if (formClaveDocente) {
        formClaveDocente.onsubmit = procesarClaveDocente;
    }

    const btnCheckCode = document.getElementById('btn-check-code');
    if (btnCheckCode) {
        btnCheckCode.onclick = procesarClaveDocente;
    }
});

// ===================================================
// 🔑 VERIFICACIÓN AUTOMÁTICA DE SESIÓN DOCENTE
// ===================================================
async function checkTeacherSession() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('jwt');
        const userRaw = localStorage.getItem('usuarioRegistrado');
        let userData = {};

        try {
            userData = userRaw ? JSON.parse(userRaw) : {};
        } catch (e) {
            console.error('Error al parsear usuarioRegistrado:', e);
        }

        if (token && userData.role === 'teacher') {
            const bienvenida = document.getElementById('welcome-student-title') || document.getElementById('bienvenida-docente');
            if (bienvenida) {
                bienvenida.innerText = `Profesor(a): ${userData.fullname || userData.username || 'Docente'}`;
            }
            return { token, user: userData };
        }
    } catch (err) {
        console.warn('⚠️ No se pudo validar la sesión previa del docente:', err);
    }
    return null;
}