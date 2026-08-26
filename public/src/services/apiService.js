// js/apiService.js

// Usa la URL configurada en config.js o toma automáticamente el origen actual (http://localhost:3000/api)
const getApiUrl = () => {
    const baseUrl = window.CONFIG?.API_URL || window.API_BASE_URL;
    if (baseUrl) return baseUrl;

    // Si está en el mismo puerto o no hay URL global definida
    return `${window.location.origin}/api`;
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
     * Acepta tanto un objeto { username, password } como parámetros separados (username, password)
     */
    async login(usernameOrCredentials, password) {
        try {
            const payload = typeof usernameOrCredentials === 'object' 
                ? usernameOrCredentials 
                : { username: usernameOrCredentials, password };

            const response = await fetch(`${getApiUrl()}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
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
     * Valida la disponibilidad del username en la base de datos antes del registro
     * @param {string} username 
     */
    async checkUsername(username) {
        try {
            const response = await fetch(`${getApiUrl()}/auth/check-username?username=${encodeURIComponent(username)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json().catch(() => ({}));
            return data;
        } catch (error) {
            console.error('Error en apiService.checkUsername:', error);
            return { available: false, message: 'Error de conexión con el servidor.' };
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
     * Alias de soporte usando referencia explícita a window.apiService para evitar pérdida de contexto (this)
     */
    async teacherLogin(payload) {
        return window.apiService.verifyTeacherKey(payload);
    },

    /**
     * Obtiene los datos del escenario "Hotel" junto con sus nodos de diálogo
     */
    async getHotelScenario() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            const response = await fetch(`${getApiUrl()}/scenarios/hotel`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            if (response.status === 401) {
                console.warn('⚠️ Sesión expirada al intentar cargar el escenario.');
                window.apiService.handleSessionExpired();
                throw new Error('Sesión expirada.');
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Error al obtener el escenario Hotel.');
            }

            return data;
        } catch (error) {
            console.error('Error en apiService.getHotelScenario:', error);
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
                window.apiService.handleSessionExpired();
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

        const loginModal = document.getElementById('modal-login');
        if (loginModal) {
            loginModal.classList.remove('oculto', 'hidden');
        }
    }
};