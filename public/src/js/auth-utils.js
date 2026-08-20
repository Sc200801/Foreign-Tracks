/**
 * Muestra u oculta mensajes de alerta dinámicos dentro de un elemento <p>.
 * @param {string} elementId - ID del contenedor <p> de alerta.
 * @param {string} message - Mensaje a mostrar.
 * @param {boolean} isError - Define si es un mensaje de error (true) o de éxito (false).
 */
window.mostrarAlerta = function (elementId, message, isError = true) {
    const alertEl = document.getElementById(elementId);
    if (!alertEl) return;

    alertEl.textContent = message;
    alertEl.classList.remove('oculto', 'hidden', 'error-text', 'success-text');
    alertEl.classList.add(isError ? 'error-text' : 'success-text');

    // Ocultar la alerta automáticamente tras 4 segundos
    setTimeout(() => {
        alertEl.textContent = '';
        alertEl.classList.add('oculto');
    }, 4000);
};