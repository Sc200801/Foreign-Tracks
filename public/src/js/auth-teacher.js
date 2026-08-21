// Clave por defecto en caso de no estar definida globalmente
const CLAVE_DOCENTE_SECRET = typeof window.CLAVE_DOCENTE_SECRET !== 'undefined' ? window.CLAVE_DOCENTE_SECRET : '1234';

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. VALIDACIÓN Y ACCESO DOCENTE
  // ==========================================
  const formClaveDocente = document.getElementById('form-clave-docente');

  if (formClaveDocente) {
    formClaveDocente.addEventListener('submit', (e) => {
      e.preventDefault(); // Detener recarga

      const inputClave = document.getElementById('clave-maestra-input');
      const claveIngresada = inputClave ? inputClave.value.trim() : '';
      const msg = document.getElementById('msg-clave-docente');

      // VALIDACIÓN DE LA CLAVE INSTITUCIONAL
      if (claveIngresada === CLAVE_DOCENTE_SECRET) {
        if (msg) msg.innerText = '';
        if (inputClave) inputClave.value = '';

        // Obtener datos guardados del usuario
        const user = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
        
        // Actualizar mensaje de bienvenida
        const bienvenida = document.getElementById('bienvenida-docente');
        if (bienvenida) {
          bienvenida.innerText = `Profesor(a): ${user.fullname || user.username || 'Docente'}`;
        }

        // Cambiar a la pantalla de crear sala
        if (typeof mostrarPantalla === 'function') {
          mostrarPantalla('pantalla-profesor');
        } else {
          document.querySelectorAll('.pantalla').forEach(p => p.classList.add('oculto'));
          document.getElementById('pantalla-profesor')?.classList.remove('oculto');
        }
      } else {
        if (msg) {
          msg.style.color = '#e87a7a';
          msg.innerText = 'Clave institucional incorrecta.';
        }
      }
    });
  }

  // ==========================================
  // 2. GENERACIÓN AUTOMÁTICA DE CÓDIGO Y CREAR SALA
  // ==========================================
  const btnCrearCodigo = document.getElementById('btn-crear-codigo');
  const roomCodeDisplay = document.getElementById('room-code-display');
  const formCrearSala = document.getElementById('form-crear-sala');

  // Generar Código Automático
  if (btnCrearCodigo && roomCodeDisplay) {
    btnCrearCodigo.addEventListener('click', () => {
      const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let codigoGenerado = '';
      for (let i = 0; i < 6; i++) {
        codigoGenerado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }
      roomCodeDisplay.value = codigoGenerado;
    });
  }

  // Crear Sala
  if (formCrearSala) {
    formCrearSala.addEventListener('submit', (e) => {
      e.preventDefault();
      const nombreSala = document.getElementById('room-name-input')?.value.trim();
      const codigoSala = roomCodeDisplay ? roomCodeDisplay.value.trim() : '';

      if (!codigoSala) {
        alert('Por favor haz clic en "Create room code" para generar la clave.');
        return;
      }

      // Redirige al lobby de la sala creada
      const roomHeaderTitle = document.getElementById('room-header-title');
      if (roomHeaderTitle) {
        roomHeaderTitle.innerText = `${nombreSala || 'Room'} (Code: ${codigoSala})`;
      }

      if (typeof mostrarPantalla === 'function') {
        mostrarPantalla('pantalla-sala-espera');
      }
    });
  }

});