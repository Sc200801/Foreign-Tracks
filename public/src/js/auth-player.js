// ===================================================
// 🎓 REGISTRO Y AUTENTICACIÓN ESPECÍFICA DE ALUMNO (PLAYER)
// ===================================================

async function ejecutarRegistroEstudiante() {
    // 1. Obtener datos temporales
    let pendingData = window.pendingRegistrationData;
    
    if (!pendingData || !pendingData.username) {
        try {
            const tempRaw = sessionStorage.getItem('tempUserData');
            if (tempRaw) pendingData = JSON.parse(tempRaw);
        } catch (e) {
            console.error('Error al recuperar tempUserData:', e);
        }
    }

    // 2. Si hay sesión previa y no hay datos nuevos en el formulario, directo al Main Menu
    const existingToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const usuarioRegistrado = localStorage.getItem('usuarioRegistrado');

    if (!pendingData || !pendingData.username || !pendingData.password) {
        if (existingToken && usuarioRegistrado) {
            console.log('✅ Sesión previa detectada. Redirigiendo a MAIN MENU...');
            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-menu-juego');
            }
            return;
        }

        alert('Debes ingresar tu nombre, usuario y contraseña primero.');
        if (typeof window.mostrarPantalla === 'function') {
            window.mostrarPantalla('pantalla-acceso');
        }
        return;
    }

    // Normalizar claves
    const fullName = pendingData.fullName || pendingData.fullname || pendingData.username;
    const username = pendingData.username.trim();
    const password = pendingData.password;

    try {
        if (!window.apiService || typeof window.apiService.register !== 'function') {
            throw new Error('Servicio de API no disponible.');
        }

        // 3. Intenta Registrar en la BD (backend Express / MariaDB)
        const responseData = await window.apiService.register({
            fullname: fullName,
            username: username,
            password: password,
            role: 'player'
        });

        // 4. Procesar respuesta y guardar sesión únicamente si fue exitoso
        if (responseData && (responseData.token || responseData.success)) {
            const token = responseData.token;

            if (token) {
                localStorage.setItem('token', token);
                sessionStorage.setItem('token', token);
                localStorage.setItem('jwt', token);
            }

            const userObj = responseData.user || {
                fullname: fullName,
                username: username,
                role: 'player'
            };

            userObj.role = 'player';

            localStorage.setItem('usuarioRegistrado', JSON.stringify(userObj));
            sessionStorage.setItem('userData', JSON.stringify(userObj));
            localStorage.setItem('username', username);

            // Actualización de Websockets opcional
            if (window.socket && token) {
                window.socket.auth = { token };
                if (window.socket.connected) window.socket.disconnect();
                window.socket.connect();
            }

            // Limpieza de temporales
            window.pendingRegistrationData = null;
            sessionStorage.removeItem('tempUserData');

            console.log('🎉 Estudiante registrado e iniciado con éxito en MariaDB.');

            // REDIRECCIÓN DIRECTA A "MAIN MENU"
            if (typeof window.mostrarPantalla === 'function') {
                window.mostrarPantalla('pantalla-menu-juego');
            } else {
                document.querySelectorAll('.pantalla').forEach(p => p.classList.add('oculto'));
                document.getElementById('pantalla-menu-juego')?.classList.remove('oculto');
            }
        } else {
            throw new Error(responseData?.message || 'No se pudo completar el registro del estudiante.');
        }

    } catch (error) {
        console.error('❌ Error en el proceso de estudiante:', error);
        
        // ⛔ Limpiar los datos temporales para cancelar el flujo de registro falso
        window.pendingRegistrationData = null;
        sessionStorage.removeItem('tempUserData');

        // Mostrar alerta clara al usuario
        alert(error.message || 'El nombre de usuario ya está en uso o el servidor no responde.');

        // Devolver al usuario a la pantalla de acceso/registro inicial
        if (typeof window.mostrarPantalla === 'function') {
            window.mostrarPantalla('pantalla-acceso');
        }
    }
}

// Escuchar el evento que dispara index.html cuando el usuario hace clic en STUDENT
document.addEventListener('register-student-triggered', () => {
    ejecutarRegistroEstudiante();
});