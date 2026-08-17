// js/auth-teacher.js

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
                alert('Por favor ingresa la clave institucional.');
                return;
            }

            // 1. REVISAR SI YA EXISTE UNA SESIÓN ACTIVA (localStorage) O UN REGISTRO EN PROCESO (sessionStorage)
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

            // 🔒 LECTURA SEGURA DE SESSIONSTORAGE
            let tempUserDataRaw = null;
            try {
                tempUserDataRaw = sessionStorage.getItem('tempUserData');
            } catch (err) {
                console.error('🔒 Error al acceder a sessionStorage:', err);
                sessionStorage.removeItem('tempUserData');
            }

            // Si NO hay sesión iniciada NI tampoco datos temporales de un registro nuevo, pedimos autenticarse
            if (!usuarioExistente && !tempUserDataRaw) {
                alert('No se encontraron los datos de la sesión ni del registro previo. Por favor inicia sesión o regístrate.');
                
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
                return;
            }

            try {
                if (!window.apiService) {
                    throw new Error('El servicio apiService no está cargado correctamente en el navegador.');
                }

                let data = {};

                // 2. CASO A: EL USUARIO YA TIENE SESIÓN INICIADA (Cambio o confirmación de rol a Teacher)
                if (usuarioExistente) {
                    console.log('🔄 Usuario ya registrado detectado. Confirmando clave docente...');
                    
                    if (typeof window.apiService.verifyTeacherKey === 'function') {
                        data = await window.apiService.verifyTeacherKey({ teacherKey: claveIngresada, userId: usuarioExistente.id });
                    } else if (typeof window.apiService.register === 'function') {
                        // Fallback: Actualizar el objeto con el rol de profesor
                        data = {
                            token: localStorage.getItem('token') || localStorage.getItem('jwt'),
                            user: { ...usuarioExistente, role: 'teacher' }
                        };
                    }
                } 
                // 3. CASO B: REGISTRO NUEVO DESDE EL PASO 1 (Mandar datos a MariaDB)
                else if (tempUserDataRaw) {
                    console.log('🆕 Completando registro de nuevo docente...');
                    let tempUserData = {};
                    
                    try {
                        tempUserData = JSON.parse(tempUserDataRaw);
                    } catch (parseErr) {
                        sessionStorage.removeItem('tempUserData');
                        throw new Error('Los datos temporales de registro están corruptos. Por favor intenta registrarte de nuevo.');
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

                    // 🔒 MEDIDA DE SEGURIDAD: Limpiar el registro temporal tras guardar en MariaDB
                    sessionStorage.removeItem('tempUserData');
                }

                if (inputClave) inputClave.value = '';

                // 💾 Guardar o actualizar sesión local y Token JWT
                if (data && data.token) {
                    localStorage.setItem('token', data.token);
                    sessionStorage.setItem('token', data.token);
                    localStorage.setItem('jwt', data.token);
                }
                if (data && data.user) {
                    data.user.role = 'teacher';
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(data.user));
                    sessionStorage.setItem('userData', JSON.stringify(data.user));
                } else if (usuarioExistente) {
                    usuarioExistente.role = 'teacher';
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(usuarioExistente));
                    sessionStorage.setItem('userData', JSON.stringify(usuarioExistente));
                }

                console.log('✅ Acceso como Profesor concedido exitosamente.');

                // Actualizar saludo en el dashboard/pantalla del docente
                const bienvenida = document.getElementById('bienvenida-docente');
                if (bienvenida) {
                    const user = (data && data.user) || usuarioExistente;
                    bienvenida.innerText = `Profesor(a): ${user.fullname || user.username || 'Docente'}`;
                }

                // 🔄 RECONECTAR / ACTUALIZAR SOCKET
                const nuevoToken = (data && data.token) || localStorage.getItem('token');
                const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000';

                if (window.socket && nuevoToken) {
                    window.socket.auth = { token: nuevoToken };
                    if (window.socket.connected) {
                        window.socket.disconnect();
                    }
                    window.socket.connect();
                } else if (window.io && nuevoToken) {
                    window.socket = window.io(API_BASE_URL, {
                        auth: { token: nuevoToken },
                        extraHeaders: { Authorization: `Bearer ${nuevoToken}` },
                        transports: ['websocket', 'polling']
                    });
                }

                // 4. MOSTRAR PANTALLA PROFESOR
                if (typeof window.mostrarPantalla === 'function') {
                    window.mostrarPantalla('pantalla-profesor');
                } else {
                    document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                    document.getElementById('pantalla-profesor')?.classList.remove('oculto');
                }

            } catch (error) {
                console.error('❌ Error al procesar acceso docente:', error);
                alert(error.message || 'No se pudo completar el acceso del docente. Verifica la clave institucional o inicia sesión.');

                // 🔄 REDIRECCIÓN CORREGIDA: Enviar a Selección de Rol y mostrar modal de Login
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
            }
        });
    }
});

// ===================================================
// 🔑 VERIFICACIÓN AUTOMÁTICA DE SESIÓN DOCENTE CON EL BACKEND (checkAuth)
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

        // Validar vigencia del token con el backend
        const isTokenValid = await window.apiService.verifyToken();

        if (isTokenValid) {
            console.log('✅ Token de docente activo y válido.');
            const bienvenida = document.getElementById('bienvenida-docente');
            if (bienvenida) {
                bienvenida.innerText = `Profesor(a): ${userData.fullname || userData.username || 'Docente'}`;
            }
            return { token, user: userData };
        } else {
            console.warn('⚠️ El token del docente ha expirado o no es válido.');

            // 1. Mostrar de fondo la pantalla de Selección de Rol
            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-rol');
            } else {
                document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                document.getElementById('pantalla-rol')?.classList.remove('oculto');
            }

            // 2. Abrir el modal de Login por encima
            const loginModal = document.getElementById('login-modal');
            if (loginModal) {
                loginModal.classList.remove('oculto', 'hidden');
            }

            return null;
        }
    }
    return null;
}

// Ejecutar la verificación al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
    await checkTeacherSession();
});