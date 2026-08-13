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
    }
};