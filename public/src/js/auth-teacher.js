// js/auth-teacher.js

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
            // DETENER RECARGA Y PROPAGACIÓN
            e.preventDefault();
            e.stopPropagation();

            const inputClave = document.getElementById('clave-maestra-input');
            const claveIngresada = inputClave ? inputClave.value.trim() : '';

            if (!claveIngresada) {
                window.mostrarAlerta('teacher-key-alert-msg', 'Por favor ingresa la clave institucional.');
                return;
            }

            // 1. REVISAR SI YA EXISTE UNA SESIÓN ACTIVA O REGISTRO EN PROCESO
            let usuarioExistente = null;
            try {
                const userObjRaw = localStorage.getItem('usuarioRegistrado') || localStorage.getItem('usuario');
                if (userObjRaw) {
                    usuarioExistente = JSON.parse(userObjRaw);
                }
            } catch (err) {
                console.error('🔒 Error al leer usuarioRegistrado de localStorage:', err);
                localStorage.removeItem('usuarioRegistrado');
            }

            let tempUserDataRaw = null;
            try {
                tempUserDataRaw = sessionStorage.getItem('tempUserData');
            } catch (err) {
                console.error('🔒 Error al acceder a sessionStorage:', err);
                sessionStorage.removeItem('tempUserData');
            }

            try {
                if (!window.apiService) {
                    throw new Error('El servicio apiService no está cargado correctamente en el navegador.');
                }

                let data = {};

                // Determinar el método de verificación en apiService
                const verifyFn = window.apiService.teacherLogin || window.apiService.verifyTeacherKey;

                if (typeof verifyFn !== 'function') {
                    throw new Error('No se encuentra el método para verificar la clave de docente en apiService.');
                }

                // 2. CASO A: EL USUARIO YA TIENE SESIÓN INICIADA
                if (usuarioExistente) {
                    console.log('🔄 Usuario ya registrado detectado. Confirmando clave docente...');
                    data = await verifyFn({ teacherKey: claveIngresada, userId: usuarioExistente.id });
                } 
                // 3. CASO B: REGISTRO NUEVO DESDE TEMPORAL
                else if (tempUserDataRaw) {
                    console.log('🆕 Verificando clave e iniciando registro de nuevo docente...');
                    let tempUserData = {};
                    
                    try {
                        tempUserData = JSON.parse(tempUserDataRaw);
                    } catch (parseErr) {
                        sessionStorage.removeItem('tempUserData');
                        throw new Error('Los datos temporales de registro están corruptos. Intenta registrarte de nuevo.');
                    }

                    // Validar clave institucional
                    const checkKey = await verifyFn({ teacherKey: claveIngresada });
                    if (checkKey && checkKey.success === false) {
                        throw new Error(checkKey.message || 'La clave institucional ingresada es incorrecta.');
                    }

                    const fullUserData = {
                        username: tempUserData.username,
                        fullname: tempUserData.fullname || tempUserData.username,
                        email: tempUserData.email || `${tempUserData.username}@instituto.edu`,
                        password: tempUserData.password,
                        role: 'teacher',
                        teacherKey: claveIngresada
                    };

                    data = await window.apiService.register(fullUserData);
                    sessionStorage.removeItem('tempUserData');
                } 
                // 4. CASO C: INGRESO DIRECTO CON CLAVE DOCENTE (SIN REGISTRO O SESIÓN EN MEMORIA)
                else {
                    console.log('🔑 Validando clave institucional de docente directamente...');
                    data = await verifyFn({ teacherKey: claveIngresada });

                    if (data && data.success === false) {
                        throw new Error(data.message || 'La clave institucional es incorrecta.');
                    }
                }

                if (inputClave) inputClave.value = '';

                // 💾 Guardar o actualizar sesión local y Token JWT
                if (data && data.token) {
                    localStorage.setItem('token', data.token);
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('jwt', data.token);
                }
                
                const userSession = (data && data.user) || usuarioExistente || { username: 'Docente', role: 'teacher' };
                userSession.role = 'teacher';

                localStorage.setItem('usuarioRegistrado', JSON.stringify(userSession));
                sessionStorage.setItem('userData', JSON.stringify(userSession));

                console.log('✅ Acceso como Profesor concedido exitosamente.');

                window.mostrarAlerta('teacher-key-alert-msg', '¡Clave validada correctamente!', false);

                const bienvenida = document.getElementById('bienvenida-docente');
                if (bienvenida) {
                    bienvenida.innerText = `Profesor(a): ${userSession.fullname || userSession.username || 'Docente'}`;
                }

                // RECONECTAR / ACTUALIZAR SOCKET
                const nuevoToken = (data && data.token) || localStorage.getItem('token');
                const socketTargetUrl = window.CONFIG?.SOCKET_URL || window.API_BASE_URL || window.location.origin;

                if (window.socket && nuevoToken) {
                    window.socket.auth = { token: nuevoToken };
                    if (window.socket.connected) {
                        window.socket.disconnect();
                    }
                    window.socket.connect();
                } else if (window.io && nuevoToken) {
                    window.socket = window.io(socketTargetUrl, {
                        auth: { token: nuevoToken },
                        extraHeaders: { Authorization: `Bearer ${nuevoToken}` },
                        transports: ['websocket', 'polling']
                    });
                }

                // MOSTRAR PANTALLA PROFESOR
                setTimeout(() => {
                    if (typeof window.mostrarPantalla === 'function') {
                        window.mostrarPantalla('pantalla-profesor');
                    } else {
                        document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                        document.getElementById('pantalla-profesor')?.classList.remove('oculto');
                    }
                }, 1000);

            } catch (error) {
                console.error('❌ Error al procesar acceso docente:', error);
                
                let errorMsg = error.message || 'Error de conexión con el servidor.';
                if (errorMsg.includes('Failed to fetch')) {
                    errorMsg = 'No se pudo conectar con el servidor backend. Revisa que el servidor esté activo.';
                }

                window.mostrarAlerta('teacher-key-alert-msg', errorMsg);

                if (inputClave) {
                    inputClave.value = '';
                    inputClave.focus();
                }
            }
        });
    }
});

// ===================================================
// 🔑 VERIFICACIÓN AUTOMÁTICA DE SESIÓN DOCENTE CON EL BACKEND
// ===================================================
async function checkTeacherSession() {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');
    const userRaw = localStorage.getItem('usuarioRegistrado');
    let userData = {};

    try {
        userData = userRaw ? JSON.parse(userRaw) : {};
    } catch (e) {
        console.error('Error al parsear usuarioRegistrado:', e);
    }

    if (token && userData.role === 'teacher') {
        console.log('🔍 Evaluando token de docente en el backend...');

        let isTokenValid = false;
        if (window.apiService && typeof window.apiService.verifyToken === 'function') {
            isTokenValid = await window.apiService.verifyToken();
        }

        if (isTokenValid) {
            console.log('✅ Token de docente activo y válido.');
            const bienvenida = document.getElementById('bienvenida-docente');
            if (bienvenida) {
                bienvenida.innerText = `Profesor(a): ${userData.fullname || userData.username || 'Docente'}`;
            }
            return { token, user: userData };
        } else {
            console.warn('⚠️ El token del docente ha expirado o no es válido.');

            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-rol');
            } else {
                document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                document.getElementById('pantalla-rol')?.classList.remove('oculto');
            }

            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.remove('oculto', 'hidden');
            }

            return null;
        }
    }
    return null;
}

document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherSession();
});