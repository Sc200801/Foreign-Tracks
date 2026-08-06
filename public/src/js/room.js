function generarCodigoSala() {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = '';
    for (let i = 0; i < 6; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return codigo;
}

let isPlayerReady = false;
// Control de niveles desbloqueados por defecto (Nivel 1 abierto)
let maxUnlockedLevel = 1; 

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DOCENTE ---
    const btnGenerarCodigo = document.getElementById('btn-crear-sala');
    const inputCodigo = document.getElementById('room-code-display');
    const formCrearSala = document.getElementById('form-crear-sala');

    if (btnGenerarCodigo && inputCodigo) {
        btnGenerarCodigo.addEventListener('click', (e) => {
            e.preventDefault();
            inputCodigo.value = generarCodigoSala();
        });
    }

    if (formCrearSala) {
        formCrearSala.addEventListener('submit', (e) => {
            e.preventDefault();
            const roomName = document.getElementById('room-name-input').value.trim();
            const roomCode = inputCodigo.value.trim();

            if (!roomCode) {
                alert('Por favor haz clic en "Create room code" primero.');
                return;
            }

            alert(`¡Sala "${roomName}" creada con éxito! Código: ${roomCode}`);
        });
    }

    // --- LÓGICA ALUMNO ---
    const formUnirseSala = document.getElementById('form-unirse-sala');

    if (formUnirseSala) {
        formUnirseSala.addEventListener('submit', (e) => {
            e.preventDefault();
            const codigoIngresado = document.getElementById('codigo-sala-input').value.trim();

            if (codigoIngresado.length > 0) {
                localStorage.setItem('activeRoomCode', codigoIngresado);
                mostrarPantalla('pantalla-menu-juego');
            } else {
                alert('Ingresa un código de sala válido.');
            }
        });
    }

    // --- MENÚ PRINCIPAL DEL JUEGO ---
    const btnPlay = document.getElementById('btn-game-play');
    const btnTutorial = document.getElementById('btn-game-tutorial');
    const btnExit = document.getElementById('btn-game-exit');
    const btnVolverMenu = document.getElementById('btn-volver-menu');

    if (btnPlay) {
        btnPlay.addEventListener('click', (e) => {
            e.preventDefault();

            const user = JSON.parse(localStorage.getItem('usuarioRegistrado') || '{}');
            const roomCode = localStorage.getItem('activeRoomCode') || '123';
            const playerName = user.fullname || user.username || 'Player 1';

            document.getElementById('room-header-title').innerText = `Room A (Code: ${roomCode})`;
            document.getElementById('label-player1-name').innerText = playerName;
            document.getElementById('active-player-display').value = playerName;

            isPlayerReady = false;
            const btnReady = document.getElementById('btn-ready');
            if (btnReady) {
                btnReady.innerText = 'Ready?';
                btnReady.classList.remove('btn-ready-active');
            }
            document.getElementById('status-player1')?.classList.add('oculto');

            mostrarPantalla('pantalla-sala-espera');
        });
    }

    if (btnTutorial) {
        btnTutorial.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPantalla('pantalla-tutorial');
        });
    }

    if (btnExit) {
        btnExit.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('codigo-sala-input').value = '';
            mostrarPantalla('pantalla-alumno');
        });
    }

    if (btnVolverMenu) {
        btnVolverMenu.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPantalla('pantalla-menu-juego');
        });
    }

    // --- LÓGICA DE SALA DE ESPERA ---
    const btnReady = document.getElementById('btn-ready');
    const btnStartGame = document.getElementById('btn-start-game');

    if (btnReady) {
        btnReady.addEventListener('click', (e) => {
            e.preventDefault();
            isPlayerReady = !isPlayerReady;

            const statusLabel = document.getElementById('status-player1');

            if (isPlayerReady) {
                btnReady.innerText = 'Ready!';
                btnReady.classList.add('btn-ready-active');
                if (statusLabel) statusLabel.classList.remove('oculto');
            } else {
                btnReady.innerText = 'Ready?';
                btnReady.classList.remove('btn-ready-active');
                if (statusLabel) statusLabel.classList.add('oculto');
            }
        });
    }

    if (btnStartGame) {
        btnStartGame.addEventListener('click', (e) => {
            e.preventDefault();

            if (!isPlayerReady) {
                alert('Debes presionar "Ready?" obligatoriamente antes de continuar.');
                return;
            }

            // Transición a Selección de Escenas
            actualizarEstadoNiveles();
            mostrarPantalla('pantalla-seleccion-escena');
        });
    }

    // --- LÓGICA DE NIVELES Y DESBLOQUEO ---
    const btnPlayScene1 = document.getElementById('btn-play-scene1');
    const btnPlayScene2 = document.getElementById('btn-play-scene2');
    const btnPlayScene3 = document.getElementById('btn-play-scene3');
    const btnVolverLobby = document.getElementById('btn-volver-lobby');

    function actualizarEstadoNiveles() {
        // Nivel 2
        const btn2 = document.getElementById('btn-play-scene2');
        const lock2 = document.getElementById('lock-scene2');
        if (maxUnlockedLevel >= 2) {
            btn2.disabled = false;
            lock2.classList.add('oculto');
        } else {
            btn2.disabled = true;
            lock2.classList.remove('oculto');
        }

        // Nivel 3
        const btn3 = document.getElementById('btn-play-scene3');
        const lock3 = document.getElementById('lock-scene3');
        if (maxUnlockedLevel >= 3) {
            btn3.disabled = false;
            lock3.classList.add('oculto');
        } else {
            btn3.disabled = true;
            lock3.classList.remove('oculto');
        }
    }

    if (btnPlayScene1) {
        btnPlayScene1.addEventListener('click', () => {
            alert('¡Entrando a la Escena 1: Hotel!');
            
            // Simulación: Al superar la Scene 1, desbloqueamos la Scene 2
            if (maxUnlockedLevel < 2) {
                maxUnlockedLevel = 2;
                alert('¡Felicidades! Has superado el nivel Hotel. La Scene 2 (Hospital) ha sido desbloqueada.');
                actualizarEstadoNiveles();
            }
        });
    }

    if (btnPlayScene2) {
        btnPlayScene2.addEventListener('click', () => {
            alert('¡Entrando a la Escena 2: Hospital!');
            
            // Simulación: Al superar la Scene 2, desbloqueamos la Scene 3
            if (maxUnlockedLevel < 3) {
                maxUnlockedLevel = 3;
                alert('¡Felicidades! Has superado el nivel Hospital. La Scene 3 (Restaurant) ha sido desbloqueada.');
                actualizarEstadoNiveles();
            }
        });
    }

    if (btnPlayScene3) {
        btnPlayScene3.addEventListener('click', () => {
            alert('¡Entrando a la Escena 3: Restaurant! ¡Último nivel!');
        });
    }

    if (btnVolverLobby) {
        btnVolverLobby.addEventListener('click', () => {
            mostrarPantalla('pantalla-sala-espera');
        });
    }
});