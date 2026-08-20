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

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Error al registrar usuario');
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

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Error al iniciar sesión');
            }

            return data;
        } catch (error) {
            console.error('Error en apiService.login:', error);
            throw error;
        }
    },

    /**
     * Valida la clave institucional docente en el servidor
     * @param {Object} payload - { teacherKey }
     */
    async verifyTeacherKey(payload) {
        try {
            const response = await fetch(`${getApiUrl()}/auth/teacher-login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    teacherKey: payload.teacherKey || payload.clave
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Clave de docente incorrecta.');
            }

            return data;
        } catch (error) {
            console.error('Error en apiService.verifyTeacherKey:', error);
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
        localStorage.removeItem('token');
        localStorage.removeItem('usuarioRegistrado');
        sessionStorage.clear();

        alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');

        const loginModal = document.getElementById('login-modal');
        if (loginModal) {
            loginModal.classList.remove('oculto', 'hidden');
        }
    }
};