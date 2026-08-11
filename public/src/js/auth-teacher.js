import { apiService } from './apiService.js';
import { CLAVE_DOCENTE_SECRET } from './config.js'; // Importante importar la constante si usas type="module"

document.addEventListener('DOMContentLoaded', () => {
    const formClaveDocente = document.getElementById('form-clave-docente');

    if (formClaveDocente) {
        formClaveDocente.addEventListener('submit', async (e) => {
            // DETENER RECARGA DE LA PÁGINA OBLIGATORIAMENTE
            e.preventDefault();

            const inputClave = document.getElementById('clave-maestra-input');
            const claveIngresada = inputClave ? inputClave.value.trim() : '';
            const msg = document.getElementById('msg-clave-docente');

            // VALIDACIÓN DE LA CLAVE INSTITUCIONAL
            if (claveIngresada === CLAVE_DOCENTE_SECRET) {
                if (msg) msg.innerText = '';
                if (inputClave) inputClave.value = '';

                // Medida de seguridad para verificar que el Paso 1 se completó ---
                const rawData = sessionStorage.getItem('tempUserData');
                if (!rawData) {
                    if (msg) {
                        msg.style.color = 'red';
                        msg.innerText = 'No hay datos de registro. Por favor completa el Paso 1.';
                    }
                    return;
                }

                // 1. Obtener los datos temporales guardados en la Pantalla 1
                const tempUserData = JSON.parse(rawData);

                // 2. Armar el objeto completo para el backend Express
                const fullUserData = {
                    ...tempUserData,
                    role: 'teacher',
                    teacherKey: claveIngresada
                };

                try {
                    // 3. Consumir la API centralizada
                    const response = await apiService.register(fullUserData);

                    // Guardar registro completado en localStorage si la API responde con éxito
                    localStorage.setItem('usuarioRegistrado', JSON.stringify(response.user || fullUserData));
                    sessionStorage.removeItem('tempUserData'); // Limpiar datos temporales

                    // Actualizar pantalla del panel docente
                    const bienvenida = document.getElementById('bienvenida-docente');
                    if (bienvenida) {
                        bienvenida.innerText = `Profesor(a): ${fullUserData.fullname || fullUserData.username || ''}`;
                    }

                    // Cambiar a la pantalla de crear sala
                    mostrarPantalla('pantalla-profesor');

                } catch (error) {
                    if (msg) {
                        msg.style.color = 'red';
                        msg.innerText = error.message || 'Error al conectar con el servidor.';
                    }
                }
            } else {
                if (msg) {
                    msg.style.color = 'red';
                    msg.innerText = 'Clave institucional incorrecta.';
                }
            }
        });
    }
});