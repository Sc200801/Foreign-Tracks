// ===================================================
// 📢 FUNCIÓN AUXILIAR DE ALERTAS VISUALES
// ===================================================
window.mostrarAlerta = window.mostrarAlerta || function(elementId, mensaje, esError = true) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = mensaje;
        el.style.color = esError ? '#ff4d4d' : '#2ecc71';
        el.classList.remove('oculto', 'hidden');
    } else {
        alert(mensaje);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const formClaveDocente = document.getElementById('form-clave-docente');

    if (formClaveDocente) {
        formClaveDocente.addEventListener('submit', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const inputClave = document.getElementById('teacher-key') || document.getElementById('clave-maestra-input');
            const alertMsgId = 'teacher-key-alert-msg';
            const claveIngresada = inputClave ? inputClave.value.trim() : '';

            if (!claveIngresada) {
                window.mostrarAlerta(alertMsgId, 'Por favor ingresa la clave institucional.');
                return;
            }

            // Ocultar alerta previa
            const elAlert = document.getElementById(alertMsgId);
            if (elAlert) elAlert.classList.add('oculto');

            // 1. RECUPERAR DATOS TEMPORALES
            let pendingData = window.pendingRegistrationData;
            if (!pendingData || !pendingData.username) {
                try {
                    const tempRaw = sessionStorage.getItem('tempUserData');
                    if (tempRaw) pendingData = JSON.parse(tempRaw);
                } catch (e) {}
            }

            try {
                if (!window.apiService) {
                    throw new Error('El servicio apiService no está disponible.');
                }

                const verifyFn = window.apiService.verifyTeacherKey || window.apiService.teacherLogin;

                // 2. PASO 1: VERIFICAR PRIMERO LA CLAVE INSTITUCIONAL (GUARDRAIL DE SEGURIDAD)
                if (typeof verifyFn === 'function') {
                    const checkKeyRes = await verifyFn({ teacherKey: claveIngresada, key: claveIngresada });
                    if (checkKeyRes && checkKeyRes.success === false) {
                        throw new Error(checkKeyRes.message || 'La clave institucional es incorrecta.');
                    }
                }

                let data = {};

                // 3. PASO 2: SI LA CLAVE FUE VÁLIDA, PROCEDER AL REGISTRO O VERIFICACIÓN
                if (pendingData && pendingData.username && pendingData.password) {
                    // Intenta Registrar en la BD (backend Express / MariaDB)
                    data = await window.apiService.register({
                        username: pendingData.username,
                        fullname: pendingData.fullName || pendingData.fullname || pendingData.username,
                        password: pendingData.password,
                        role: 'teacher',
                        teacherKey: claveIngresada,
                        key: claveIngresada
                    });

                    // Limpieza total de datos temporales tras registro exitoso
                    window.pendingRegistrationData = null;
                    sessionStorage.removeItem('tempUserData');

                } else {
                    // Si el usuario ya tenía sesión activa
                    data = await verifyFn({ teacherKey: claveIngresada, key: claveIngresada });
                }

                if (data && data.success === false) {
                    throw new Error(data.message || 'La clave institucional es incorrecta.');
                }

                if (inputClave) inputClave.value = '';

                // 4. PERSISTENCIA DE SESIÓN
                const tokenRecibido = data?.token || data?.jwt || data?.user?.token;
                if (tokenRecibido) {
                    localStorage.setItem('token', tokenRecibido);
                    sessionStorage.setItem('token', tokenRecibido);
                    localStorage.setItem('jwt', tokenRecibido);
                }

                const userSession = (data && data.user) || {
                    fullname: pendingData?.fullName || 'Docente',
                    username: pendingData?.username || 'Docente',
                    role: 'teacher'
                };
                userSession.role = 'teacher';

                localStorage.setItem('usuarioRegistrado', JSON.stringify(userSession));
                sessionStorage.setItem('userData', JSON.stringify(userSession));

                const bienvenida = document.getElementById('bienvenida-docente');
                if (bienvenida) {
                    bienvenida.innerText = `Profesor(a): ${userSession.fullname || userSession.username || 'Docente'}`;
                }

                // 5. RECONEXIÓN DE SOCKETS
                const nuevoToken = tokenRecibido || localStorage.getItem('token');
                if (window.socket && nuevoToken) {
                    window.socket.auth = { token: nuevoToken };
                    if (window.socket.connected) window.socket.disconnect();
                    window.socket.connect();
                }

                // 6. REDIRECCIÓN A SALA DE PROFESOR
                localStorage.setItem('pantallaActiva', 'pantalla-profesor');

                if (typeof window.mostrarPantalla === 'function') {
                    window.mostrarPantalla('pantalla-profesor');
                } else {
                    document.querySelectorAll('.pantalla').forEach(d => d.classList.add('oculto'));
                    const pProfesor = document.getElementById('pantalla-profesor');
                    if (pProfesor) {
                        pProfesor.classList.remove('oculto');
                        pProfesor.style.display = '';
                    }
                }

            } catch (error) {
                console.error('❌ Error de acceso docente:', error);
                
                let errorMsg = error.message || 'Error de conexión con el servidor.';
                if (errorMsg.includes('Failed to fetch')) {
                    errorMsg = 'No se pudo conectar con el servidor backend.';
                }

                // Si fue error de backend/servidor y no de clave incorrecta, se limpian temporales por seguridad
                if (errorMsg.includes('backend') || errorMsg.includes('conexion')) {
                    window.pendingRegistrationData = null;
                    sessionStorage.removeItem('tempUserData');
                }

                window.mostrarAlerta(alertMsgId, errorMsg);
                if (inputClave) {
                    inputClave.value = '';
                    inputClave.focus();
                }
            }
        });
    }
});

// ===================================================
// 🔑 VERIFICACIÓN AUTOMÁTICA DE SESIÓN
// ===================================================
async function checkTeacherSession() {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');
    const userRaw = localStorage.getItem('usuarioRegistrado');
    let userData = {};

    try {
        userData = userRaw ? JSON.parse(userRaw) : {};
    } catch (e) {}

    if (token && (userData.role === 'teacher' || userData.role === 'docente')) {
        let isTokenValid = false;
        if (window.apiService && typeof window.apiService.verifyToken === 'function') {
            isTokenValid = await window.apiService.verifyToken();
        } else {
            isTokenValid = true;
        }

        if (isTokenValid) {
            const bienvenida = document.getElementById('bienvenida-docente');
            if (bienvenida) {
                bienvenida.innerText = `Profesor(a): ${userData.fullname || userData.username || 'Docente'}`;
            }
            return { token, user: userData };
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherSession();
});