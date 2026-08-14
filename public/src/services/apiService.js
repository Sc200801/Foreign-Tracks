// js/apiService.js
// Usamos la variable global window.API_BASE_URL en lugar de import
const getApiUrl = () => window.API_BASE_URL || 'http://localhost:3000/api';

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
    }
};