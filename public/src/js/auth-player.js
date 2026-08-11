// FUNCIÓN GLOBAL PARA MANEJAR EL CAMBIO DE VISTAS LIMPIAMENTE
function mostrarPantalla(idPantallaDeseada) {
    const todasLasPantallas = document.querySelectorAll('.pantalla, .pantalla-bienvenida');
    
    todasLasPantallas.forEach(pantalla => {
        pantalla.classList.add('oculto');
    });

    const pantallaTarget = document.getElementById(idPantallaDeseada);
    if (pantallaTarget) {
        pantallaTarget.classList.remove('oculto');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. VERIFICAR SESIÓN EN LOCALSTORAGE
    const usuarioExistente = localStorage.getItem('usuarioRegistrado');

    if (usuarioExistente) {
        // Si ya está registrado -> va directo a CHOOSE YOUR ROL
        mostrarPantalla('pantalla-rol');
    } else {
        // Si no se ha registrado -> muestra la pantalla de portada anaranjada
        mostrarPantalla('pantalla-bienvenida-inicial');
    }

    // 2. BOTÓN "REGÍSTRATE AQUÍ" EN PORTADA
    const btnIrRegistro = document.getElementById('btn-ir-registro');
    if (btnIrRegistro) {
        btnIrRegistro.addEventListener('click', () => {
            mostrarPantalla('pantalla-registro-inicial');
        });
    }

  // 3. REGISTRO DE CUENTA DE USUARIO
    const formRegistro = document.getElementById('form-registro-inicial');
    if (formRegistro) {
        formRegistro.addEventListener('submit', (e) => {
            e.preventDefault();

            // Capturar datos del formulario según tus inputs
            const fullnameInput = document.getElementById('reg-fullname');
            const usernameInput = document.getElementById('reg-username');
            const passwordInput = document.getElementById('reg-password'); // Asegúrate que tu input de contraseña tenga este ID

            const fullname = fullnameInput ? fullnameInput.value.trim() : '';
            const username = usernameInput ? usernameInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            // Validación preliminar
            if (!fullname || !username || !password) {
                alert('Por favor, completa todos los campos.');
                return;
            }

            // Guardado temporal en sessionStorage para el flujo de dos pasos
            const tempUserData = { fullname, username, password };
            sessionStorage.setItem('tempUserData', JSON.stringify(tempUserData));

            // Avanzar suavemente a la Pantalla de Selección de Rol
            mostrarPantalla('pantalla-rol');
        });
    }

    // 4. SELECCIÓN DE ROL Y NAVEGACIÓN
    const btnStudent = document.getElementById('btn-rol-student');
    const btnProfesor = document.getElementById('btn-rol-profesor');
    const btnVolverRol = document.getElementById('btn-volver-rol');
    const btnVolverRolProfesor = document.getElementById('btn-volver-rol-profesor');
    const btnVolverRolAlumno = document.getElementById('btn-volver-rol-alumno');

    if (btnStudent) {
        btnStudent.addEventListener('click', () => {
            mostrarPantalla('pantalla-alumno');
        });
    }

    if (btnProfesor) {
        btnProfesor.addEventListener('click', () => {
            mostrarPantalla('pantalla-clave-docente');
        });
    }

    if (btnVolverRol) {
        btnVolverRol.addEventListener('click', () => {
            mostrarPantalla('pantalla-rol');
        });
    }

    if (btnVolverRolProfesor) {
        btnVolverRolProfesor.addEventListener('click', () => {
            mostrarPantalla('pantalla-rol');
        });
    }

    if (btnVolverRolAlumno) {
        btnVolverRolAlumno.addEventListener('click', () => {
            mostrarPantalla('pantalla-rol');
        });
    }
});