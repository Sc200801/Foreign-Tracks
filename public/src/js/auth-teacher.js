document.addEventListener('DOMContentLoaded', () => {
    const formClaveDocente = document.getElementById('form-clave-docente');

    if (formClaveDocente) {
        formClaveDocente.addEventListener('submit', async (e) => {
            // DETENER RECARGA Y PROPAGACIÓN
            e.preventDefault();
            e.stopPropagation();

            const API_BASE_URL = (window.CONFIG && window.CONFIG.API_URL) ? window.CONFIG.API_URL : 'http://localhost:3000';
            const inputClave = document.getElementById('clave-maestra-input');
            const claveIngresada = inputClave ? inputClave.value.trim() : '';

            if (!claveIngresada) {
                alert('Por favor ingresa la clave institucional.');
                return;
            }

            // Cargar datos actuales del usuario guardado en localStorage
            let user = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');

            try {
                // Petición al backend para validar clave y registrar/promover al Profesor en la BD
                const response = await fetch(`${API_BASE_URL}/api/auth/teacher-login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                    },
                    body: JSON.stringify({
                        clave: claveIngresada,
                        username: user.username || null,
                        fullname: user.fullname || user.nombre || null
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    if (inputClave) inputClave.value = '';

                    // 💾 Actualizar el token y los datos devueltos por el backend
                    const nuevoToken = data.token || data.jwt;
                    if (nuevoToken) {
                        localStorage.setItem('token', nuevoToken);
                        localStorage.setItem('jwt', nuevoToken); // Compatibilidad
                    }
                    if (data.user) {
                        localStorage.setItem('usuarioRegistrado', JSON.stringify(data.user));
                        user = data.user;
                    }

                    console.log('✅ Profesor autenticado e insertado en la base de datos');

                    // Actualizar saludo en el dashboard del docente
                    const bienvenida = document.getElementById('bienvenida-docente');
                    if (bienvenida) {
                        bienvenida.innerText = `Profesor(a): ${user.fullname || user.name || user.username || 'Docente'}`;
                    }

                    // 🔄 RECONECTAR / ACTUALIZAR SOCKET CON EL NUEVO TOKEN DE DOCENTE
                    if (window.socket) {
                        // Si el socket ya existía, actualizamos sus credenciales y reconectamos
                        window.socket.auth = { token: nuevoToken };
                        if (window.socket.connected) {
                            window.socket.disconnect();
                        }
                        window.socket.connect();
                    } else if (window.io) {
                        // Si no existía la instancia, la creamos de cero
                        window.socket = window.io(API_BASE_URL, {
                            auth: { token: nuevoToken },
                            extraHeaders: { Authorization: `Bearer ${nuevoToken}` },
                            transports: ['websocket', 'polling']
                        });
                    }

                    // MOSTRAR PANTALLA PROFESOR
                    if (typeof window.mostrarPantalla === 'function') {
                        window.mostrarPantalla('pantalla-profesor');
                    } else {
                        document.querySelectorAll('.pantalla, .pantalla-bienvenida').forEach(d => d.classList.add('oculto'));
                        document.getElementById('pantalla-profesor')?.classList.remove('oculto');
                    }
                } else {
                    const mensajeError = data.error || data.message || 'Clave institucional incorrecta.';
                    alert(mensajeError);
                }
            } catch (error) {
                console.error('❌ Error de red al autenticar docente:', error);
                alert('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
            }
        });
    }
});