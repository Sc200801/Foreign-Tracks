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

            // 1. Recuperar datos del Paso 1 guardados previamente en sessionStorage
            const tempUserDataRaw = sessionStorage.getItem('tempUserData');
            if (!tempUserDataRaw) {
                alert('No se encontraron los datos del registro previo. Por favor regresa al Paso 1.');
                if (typeof window.mostrarPantalla === 'function') {
                    window.mostrarPantalla('pantalla-registro-inicial');
                }
                return;
            }

            const tempUserData = JSON.parse(tempUserDataRaw);

            // 2. Construir el objeto completo de usuario incluyendo el ROL y la CLAVE
            const fullUserData = {
                username: tempUserData.username,
                email: tempUserData.email || `${tempUserData.username}@instituto.edu`, // Fallback si no hay email separado
                password: tempUserData.password,
                role: 'teacher', // Rol asignado
                teacherKey: claveIngresada
            };

            try {
                // 3. Enviar registro completo al backend utilizando window.apiService
                if (!window.apiService) {
                    throw new Error('El servicio apiService no está cargado correctamente en el navegador.');
                }

                const data = await window.apiService.register(fullUserData);

                if (inputClave) inputClave.value = '';

                // 💾 Guardar sesión local devuelta por la API
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('jwt', data.token);
                }
                if (data.user) {
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(data.user));
                }

                // Limpiar almacenamiento temporal una vez completado el registro
                sessionStorage.removeItem('tempUserData');

                console.log('✅ Profesor registrado exitosamente en la base de datos MariaDB');

                // Actualizar saludo en el dashboard del docente
                const bienvenida = document.getElementById('bienvenida-docente');
                if (bienvenida) {
                    const user = data.user || fullUserData;
                    bienvenida.innerText = `Profesor(a): ${user.fullname || user.username || 'Docente'}`;
                }

                // 🔄 RECONECTAR / ACTUALIZAR SOCKET
                const nuevoToken = data.token;
                const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api';

                if (window.socket) {
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
                console.error('❌ Error al registrar docente:', error);
                alert(error.message || 'No se pudo completar el registro del docente. Verifica la clave o la conexión.');
            }
        });
    }
});