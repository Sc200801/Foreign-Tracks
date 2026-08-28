/**
 * Muestra el podio con los datos de la partida en el modal de resultados.
 * @param {Array} jugadores - Array de objetos: [{ username, score, correctAnswers, avatar }]
 */
function mostrarPodio(jugadores = []) {
    const contenedorTarjetas = document.getElementById('podium-cards');
    const modalPodio = document.getElementById('podium-modal');

    if (!contenedorTarjetas || !modalPodio) {
        console.error('❌ No se encontraron los elementos HTML del podio.');
        return;
    }

    // Limpiar contenido previo
    contenedorTarjetas.innerHTML = '';

    // Ordenar de mayor a menor puntuación
    const ordenados = [...jugadores].sort((a, b) => (b.score || 0) - (a.score || 0));

    // Etiquetas para los puestos
    const badges = ['1ST PLACE', '2ND PLACE', '3RD PLACE', '4TH PLACE'];

    // Construir tarjetas para cada jugador (máximo 4)
    ordenados.slice(0, 4).forEach((jugador, index) => {
        const rank = index + 1;
        const tarjeta = document.createElement('div');
        tarjeta.className = `podium-card podium-rank-${rank}`;

        tarjeta.innerHTML = `
            <div class="rank-tag">${badges[index] || `#${rank}`}</div>
            <img src="${jugador.avatar || 'assets/default-avatar.png'}" alt="${jugador.username || 'Jugador'}">
            <div class="player-name">${jugador.username || 'Anonimo'}</div>
            <div class="stat-text"><strong>PUNTOS:</strong> ${jugador.score || 0}</div>
            <div class="stat-text"><strong>RESP:</strong> ${jugador.correctAnswers || 0}</div>
        `;

        contenedorTarjetas.appendChild(tarjeta);
    });

    // Agregar botón "¿Quiénes Somos?" si no existe en el modal
    let btnAbout = document.getElementById('btn-about-us');
    if (!btnAbout) {
        btnAbout = document.createElement('button');
        btnAbout.id = 'btn-about-us';
        btnAbout.className = 'pixel-btn-yellow';
        btnAbout.innerText = '¿QUIÉNES SOMOS?';
        btnAbout.onclick = mostrarAboutUs;
        modalPodio.appendChild(btnAbout);
    }

    // Desocultar el modal
    modalPodio.classList.remove('oculto');
}

/**
 * Cierra el podio y abre la tarjeta emergente de ¿Quiénes Somos?
 */
function mostrarAboutUs() {
    cerrarPodio();
    const modalAbout = document.getElementById('about-modal');
    if (modalAbout) {
        modalAbout.classList.remove('oculto');
    }
}

/**
 * Cierra la ventana emergente de ¿Quiénes Somos? y redirige al menú.
 */
function cerrarAboutUs() {
    const modalAbout = document.getElementById('about-modal');
    if (modalAbout) {
        modalAbout.classList.add('oculto');
    }
    // Redirección o retorno al menú principal
    window.location.href = 'index.html'; // Cambia esto si la ruta de tu menú principal es diferente
}

/**
 * Cierra el modal del podio.
 */
function cerrarPodio() {
    const modalPodio = document.getElementById('podium-modal');
    if (modalPodio) {
        modalPodio.classList.add('oculto');
    }
}

/**
 * Función de prueba rápida para verificar el podio en la consola del navegador.
 */
function testearPodio() {
    const jugadoresPrueba = [
        { username: "Nancy", score: 850, correctAnswers: 8, avatar: "" },
        { username: "Compañera", score: 720, correctAnswers: 7, avatar: "" },
        { username: "Jugador 3", score: 540, correctAnswers: 5, avatar: "" },
        { username: "Jugador 4", score: 300, correctAnswers: 3, avatar: "" }
    ];
    mostrarPodio(jugadoresPrueba);
}