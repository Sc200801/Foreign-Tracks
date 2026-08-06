document.addEventListener('DOMContentLoaded', () => {
    const formClaveDocente = document.getElementById('form-clave-docente');

    if (formClaveDocente) {
        formClaveDocente.addEventListener('submit', (e) => {
            // DETENER RECARGA DE LA PÁGINA OBLIGATORIAMENTE
            e.preventDefault();

            const inputClave = document.getElementById('clave-maestra-input');
            const claveIngresada = inputClave ? inputClave.value.trim() : '';
            const msg = document.getElementById('msg-clave-docente');

            // VALIDACIÓN DE LA CLAVE INSTITUCIONAL
            if (claveIngresada === CLAVE_DOCENTE_SECRET) {
                if (msg) msg.innerText = '';
                if (inputClave) inputClave.value = '';

                // Obtener datos guardados previamente del usuario
                const user = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
                
                // Actualizar pantalla del panel docente
                const bienvenida = document.getElementById('bienvenida-docente');
                if (bienvenida) {
                    bienvenida.innerText = `Profesor(a): ${user.fullname || user.username || ''}`;
                }

                // Cambiar a la pantalla de crear sala
                mostrarPantalla('pantalla-profesor');
            } else {
                if (msg) {
                    msg.style.color = 'red';
                    msg.innerText = 'Clave institucional incorrecta.';
                }
            }
        });
    }
});