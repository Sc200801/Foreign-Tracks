// js/apiService.js
// Lee dinámicamente la propiedad API_URL definida en config.js
const getApiUrl = () => {
    return window.CONFIG?.API_URL || window.API_BASE_URL;
};

window.apiService = {
    /**
     * Envía los datos completos de registro al backend Express
     * @param {Object} fullUserData - { username, email, password, role, teacherKey }
     */
    async register(fullUserData) {
        try {
            const response = await fetch(`${getApiUrl()}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fullUserData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al registrar usuario');
            }

            return data;
        } catch (error) {
            console.error('Error en apiService.register:', error);
            throw error;
        }
    },

    /**
     * Envía las credenciales al backend Express para iniciar sesión
     * @param {Object} credentials - { username, password }
     */
    async login(credentials) {
        try {
            const response = await fetch(`${getApiUrl()}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            return data;
        } catch (error) {
            console.error('Error en apiService.login:', error);
            throw error;
        }
    },

    /**
     * Verifica si el Token JWT almacenado sigue activo en el servidor
     */
    async verifyToken() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (!token) return false;

        try {
            const response = await fetch(`${getApiUrl()}/auth/verify`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // Si responde 401 (token expirado o inválido)
            if (response.status === 401) {
                console.warn('⚠️ Token expirado o inválido.');
                this.handleSessionExpired();
                return false;
            }

            return response.ok;
        } catch (error) {
            console.error('Error al verificar token:', error);
            return false;
        }
    },

    /**
     * Manejador centralizado cuando expira la sesión
     */
    handleSessionExpired() {
        // 1. Limpiar tokens y datos almacenados
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioRegistrado');
        sessionStorage.clear();

        // 2. Notificar al usuario
        alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');

        // 3. Abrir la ventana emergente Modal de Login
        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('oculto', 'hidden');
        }
    }
};