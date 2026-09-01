/**
 * podium.js — Podio y Resultados Finales
 * Foreign Tracks
 *
 * Diseño:
 *  - 1er lugar al centro
 *  - 2do lugar a la izquierda
 *  - 3er lugar a la derecha
 *  - 4to lugar en una fila inferior
 *  - Nombre arriba del avatar
 *  - Puntos y respuestas debajo del avatar
 *  - Puesto dentro del bloque dorado del podio
 *
 * Mantiene las funciones públicas:
 * mostrarPodio()
 * cerrarPodio()
 * mostrarAboutUs()
 * cerrarAboutUs()
 * testearPodio()
 */

// ============================================================
// CONFIGURACIÓN DEL PUNTAJE
// ============================================================

const PUNTOS_POR_RESPUESTA = 100;
const BONO_TIEMPO_MAXIMO = 50;


// ============================================================
// CALCULAR RENDIMIENTO
// ============================================================

function calcularRendimiento(jugador) {
    const correctas = Number(jugador.correctAnswers) || 0;
    const tiempoTotal = Number(jugador.totalTimeSeconds) || 0;

    const puntosBase = correctas * PUNTOS_POR_RESPUESTA;

    let bonoVelocidad = 0;
    if (correctas > 0 && tiempoTotal > 0) {
        bonoVelocidad = Math.max(0, Math.round((correctas * BONO_TIEMPO_MAXIMO) - (tiempoTotal * 2)));
    }

    return puntosBase + bonoVelocidad;
}


// ============================================================
// MENSAJE FINAL
// ============================================================

function construirMensajeFinal(jugadoresOrdenados) {
    if (!jugadoresOrdenados || jugadoresOrdenados.length === 0) {
        return '¡Gran esfuerzo de todos!';
    }

    const ganador = jugadoresOrdenados[0];
    const aciertosGanador = Number(ganador.correctAnswers) || 0;

    if (aciertosGanador >= 8) {
        return '¡Impresionante precisión y velocidad! Dominaron el escenario.';
    }

    if (aciertosGanador >= 4) {
        return '¡Buen trabajo! Sigan practicando para mejorar su tiempo y precisión.';
    }

    return '¡Partida completada! La próxima vez tómense un momento extra para analizar cada pregunta.';
}


// ============================================================
// ESCAPAR TEXTO PARA EVITAR PROBLEMAS CON HTML
// ============================================================

function escaparHTML(texto) {

    const div = document.createElement('div');

    div.textContent = texto ?? '';

    return div.innerHTML;
}


// ============================================================
// AVATAR
// ============================================================

function obtenerAvatar(jugador) {

    if (
        jugador.avatar &&
        String(jugador.avatar).trim() !== ''
    ) {
        return jugador.avatar;
    }

    return 'assets/default-avatar.png';
}


// ============================================================
// INSERTAR ESTILOS DEL PODIO
// ============================================================
//
// Esto permite que el nuevo diseño funcione aunque tu CSS anterior
// todavía tenga las clases del podio viejo.
//

function inyectarEstilosPodio() {

    if (document.getElementById('podium-new-styles')) {
        return;
    }

    const style = document.createElement('style');

    style.id = 'podium-new-styles';

    style.textContent = `

        /* =====================================================
           CONTENEDOR GENERAL
           ===================================================== */

        #podium-modal .podium-new-layout {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
            font-family: inherit;
        }


        /* =====================================================
           ENCABEZADO
           ===================================================== */

        #podium-modal .podium-title-main {
            margin: 0 0 8px 0;
            font-size: 28px;
            letter-spacing: 3px;
            font-weight: bold;
            text-transform: uppercase;
        }


        #podium-modal .podium-result-header {
            position: relative;
            display: flex;
            align-items: stretch;
            justify-content: center;
            margin: 0 auto 22px auto;
            width: 88%;
            max-width: 540px;
            height: 48px;
        }


        #podium-modal .podium-header-center {
            flex: 1;
            background: #fff6dc;
            border: 3px solid #69462d;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
        }


        #podium-modal .podium-header-small {
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
            color: #5c4434;
            line-height: 1;
        }


        #podium-modal .podium-header-big {
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 1px;
            color: #4e3c31;
            line-height: 1.1;
        }


        #podium-modal .podium-header-place {
            width: 62px;
            background: #a97845;
            color: #fff1c8;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            border-top: 3px solid #69462d;
            border-bottom: 3px solid #69462d;
            box-sizing: border-box;
        }


        #podium-modal .podium-header-left {
            clip-path: polygon(
                18% 0,
                100% 0,
                100% 100%,
                18% 100%,
                0 50%
            );
            padding-left: 8px;
        }


        #podium-modal .podium-header-right {
            clip-path: polygon(
                0 0,
                82% 0,
                100% 50%,
                82% 100%,
                0 100%
            );
            padding-right: 8px;
        }


        /* =====================================================
           PODIO TOP 3
           ===================================================== */

        #podium-modal .podium-top-three {
            width: 94%;
            max-width: 650px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1.15fr 1fr;
            align-items: end;
            gap: 12px;
        }


        #podium-modal .podium-player {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            min-width: 0;
        }


        /* =====================================================
           NOMBRE
           ===================================================== */

        #podium-modal .podium-player-name {
            min-height: 29px;
            margin-bottom: 6px;
            font-size: 18px;
            font-weight: bold;
            color: #fff4d1;
            text-shadow:
                2px 2px 0 #4b3729;
            word-break: break-word;
            line-height: 1.1;
        }


        /* =====================================================
           AVATAR
           ===================================================== */

        #podium-modal .podium-avatar {
            width: 68px;
            height: 68px;
            object-fit: cover;
            border-radius: 7px;
            border: 3px solid #d4bd82;
            background: #eee4c8;
            box-shadow:
                0 3px 0 #6b5944,
                inset 0 0 0 2px #fff6d9;
            image-rendering: pixelated;
        }


        #podium-modal .podium-rank-1 .podium-avatar {
            width: 78px;
            height: 78px;
            border-color: #dcae37;
        }


        /* =====================================================
           ESTADÍSTICAS
           ===================================================== */

        #podium-modal .podium-stats {
            margin-top: 8px;
            margin-bottom: 8px;
            line-height: 1.25;
        }


        #podium-modal .podium-points {
            font-size: 15px;
            font-weight: bold;
            color: #201b17;
        }


        #podium-modal .podium-resp {
            font-size: 14px;
            color: #29231f;
        }


        /* =====================================================
           BLOQUES DEL PODIO
           ===================================================== */

        #podium-modal .podium-block {
            width: 100%;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid #805a2e;
            background: linear-gradient(
                to bottom,
                #d9b263,
                #b88943
            );
            box-shadow:
                inset 0 0 0 2px rgba(255,255,255,0.2),
                0 4px 0 #69492a;
        }


        #podium-modal .podium-rank-1 .podium-block {
            height: 145px;
        }


        #podium-modal .podium-rank-2 .podium-block {
            height: 110px;
        }


        #podium-modal .podium-rank-3 .podium-block {
            height: 80px;
        }


        #podium-modal .podium-place-text {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            line-height: 1;
            color: #fff6d3;
            text-shadow:
                3px 3px 0 #72522e;
        }


        #podium-modal .podium-place-number {
            font-size: 43px;
            font-weight: bold;
        }


        #podium-modal .podium-place-word {
            margin-top: 8px;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 1px;
        }


        #podium-modal .podium-rank-1 .podium-place-number {
            font-size: 50px;
        }


        #podium-modal .podium-rank-1 .podium-place-word {
            font-size: 23px;
        }


        /* =====================================================
           CUARTO LUGAR
           ===================================================== */

        #podium-modal .podium-fourth-new {
            width: 88%;
            max-width: 650px;
            margin: 24px auto 0 auto;
            min-height: 60px;
            box-sizing: border-box;
            background: #fff6df;
            border: 3px solid #725036;
            display: flex;
            align-items: center;
            padding: 7px 14px;
            gap: 10px;
            color: #29231e;
        }


        #podium-modal .podium-fourth-title {
            font-size: 17px;
            font-weight: bold;
            white-space: nowrap;
        }


        #podium-modal .podium-fourth-avatar {
            width: 42px;
            height: 42px;
            object-fit: cover;
            border: 2px solid #b89a62;
            border-radius: 4px;
            image-rendering: pixelated;
            background: #eee4c8;
        }


        #podium-modal .podium-fourth-name {
            font-size: 16px;
            font-weight: bold;
            flex: 1;
            text-align: left;
        }


        #podium-modal .podium-fourth-points {
            font-size: 15px;
            font-weight: bold;
            white-space: nowrap;
        }


        /* =====================================================
           MENSAJE FINAL
           ===================================================== */

        #podium-modal .podium-footnote-new {
            margin: 16px auto 10px auto;
            width: 90%;
            font-size: 13px;
            color: #e8d7b0;
            text-align: center;
        }


        /* =====================================================
           BOTÓN ABOUT US
           ===================================================== */

        #podium-modal #btn-about-us {
            display: block;
            width: 90%;
            max-width: 600px;
            margin: 12px auto 0 auto;
            min-height: 45px;
        }


        /* =====================================================
           ANIMACIÓN
           ===================================================== */

        #podium-modal .podium-reveal {
            opacity: 0;
            transform: translateY(18px);
            transition:
                opacity 0.35s ease,
                transform 0.35s ease;
        }


        #podium-modal .podium-reveal.is-revealed {
            opacity: 1;
            transform: translateY(0);
        }


        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 700px) {

            #podium-modal .podium-top-three {
                gap: 5px;
                width: 98%;
            }

            #podium-modal .podium-player-name {
                font-size: 14px;
            }

            #podium-modal .podium-avatar {
                width: 55px;
                height: 55px;
            }

            #podium-modal .podium-rank-1 .podium-avatar {
                width: 64px;
                height: 64px;
            }

            #podium-modal .podium-place-number {
                font-size: 32px;
            }

            #podium-modal .podium-place-word {
                font-size: 15px;
            }

            #podium-modal .podium-rank-1 .podium-block {
                height: 120px;
            }

            #podium-modal .podium-rank-2 .podium-block {
                height: 95px;
            }

            #podium-modal .podium-rank-3 .podium-block {
                height: 70px;
            }

            #podium-modal .podium-fourth-new {
                width: 96%;
                padding: 5px;
            }

            #podium-modal .podium-fourth-title {
                font-size: 13px;
            }

            #podium-modal .podium-fourth-name {
                font-size: 13px;
            }

            #podium-modal .podium-fourth-points {
                font-size: 12px;
            }
        }

    `;

    document.head.appendChild(style);
}


// ============================================================
// CREAR TARJETA DE JUGADOR
// ============================================================

function crearJugadorPodio(jugador, puesto) {

    const jugadorDiv = document.createElement('div');

    jugadorDiv.className =
        `podium-player podium-rank-${puesto} podium-reveal`;

    const nombre =
        escaparHTML(jugador.username || 'Anonimo');

    const avatar =
        obtenerAvatar(jugador);

    const puntos =
        calcularRendimiento(jugador);

    const respuestas =
        Number(jugador.correctAnswers) || 0;


    jugadorDiv.innerHTML = `

        <div class="podium-player-name">
            ${nombre}
        </div>

        <img
            class="podium-avatar"
            src="${avatar}"
            alt="${nombre}"
            onerror="this.src='assets/default-avatar.png';"
        >

        <div class="podium-stats">

            <div class="podium-points">
                PUNTOS: ${puntos}
            </div>

            <div class="podium-resp">
                RESP: ${respuestas}
            </div>

        </div>

        <div class="podium-block">

            <div class="podium-place-text">

                <div class="podium-place-number">
                    ${puesto}st
                </div>

                <div class="podium-place-word">
                    PLACE
                </div>

            </div>

        </div>
    `;


    // Corregir 2nd y 3rd
    const numero = jugadorDiv.querySelector('.podium-place-number');

    if (puesto === 1) {
        numero.textContent = '1st';
    }

    if (puesto === 2) {
        numero.textContent = '2nd';
    }

    if (puesto === 3) {
        numero.textContent = '3rd';
    }


    return jugadorDiv;
}


// ============================================================
// CREAR CUARTO LUGAR
// ============================================================

function crearCuartoLugar(jugador) {

    const cuarto = document.createElement('div');

    cuarto.className =
        'podium-fourth-new podium-reveal';

    const nombre =
        escaparHTML(jugador.username || 'Anonimo');

    const avatar =
        obtenerAvatar(jugador);

    const puntos =
        calcularRendimiento(jugador);

    const respuestas =
        Number(jugador.correctAnswers) || 0;

    cuarto.innerHTML = `

        <div class="podium-fourth-title">
            4TH PLACE
        </div>

        <img
            class="podium-fourth-avatar"
            src="${avatar}"
            alt="${nombre}"
            onerror="this.src='assets/default-avatar.png';"
        >

        <div class="podium-fourth-name">
            ${nombre}
        </div>

        <div class="podium-fourth-points">
            PUNTOS: ${puntos} (${respuestas} aciertos)
        </div>

    `;

    return cuarto;
}


// ============================================================
// MOSTRAR PODIO
// ============================================================

function mostrarPodio(jugadores = []) {

    const modalPodio =
        document.getElementById('podium-modal');

    if (!modalPodio) {

        console.error(
            '❌ No se encontró #podium-modal'
        );

        return;
    }


    // Aplicar estilos nuevos
    inyectarEstilosPodio();


    // ========================================================
    // BUSCAR CONTENEDOR PRINCIPAL
    // ========================================================

    let contenedorInterno =
        modalPodio.querySelector('.pixel-card-container');


    if (!contenedorInterno) {

        contenedorInterno = modalPodio;
    }


    // ========================================================
    // ORDENAR JUGADORES
    // ========================================================

    const ordenados = [...jugadores]
        .sort(
            (a, b) =>
                calcularRendimiento(b) -
                calcularRendimiento(a)
        )
        .slice(0, 4);


    // ========================================================
    // ELIMINAR DISEÑO ANTERIOR
    // ========================================================

    const viejo =
        contenedorInterno.querySelector(
            '.podium-new-layout'
        );

    if (viejo) {
        viejo.remove();
    }


    // ========================================================
    // CREAR NUEVO PODIO
    // ========================================================

    const layout =
        document.createElement('div');

    layout.className =
        'podium-new-layout';


    // ========================================================
    // TÍTULO
    // ========================================================

    const titulo =
        document.createElement('div');

    titulo.className =
        'podium-title-main';

    titulo.textContent =
        'FOREIGN TRACKS';

    layout.appendChild(titulo);


    // ========================================================
    // HEADER
    // ========================================================

    const header =
        document.createElement('div');

    header.className =
        'podium-result-header';


    header.innerHTML = `

        <div class="podium-header-place podium-header-left">
            1st
        </div>

        <div class="podium-header-center">

            <div class="podium-header-small">
                ROOM CHAMPIONS
            </div>

            <div class="podium-header-big">
                FINAL RESULTS
            </div>

        </div>

        <div class="podium-header-place podium-header-right">
            3rd
        </div>

    `;

    layout.appendChild(header);


    // ========================================================
    // CONTENEDOR TOP 3
    // ========================================================

    const topThree =
        document.createElement('div');

    topThree.className =
        'podium-top-three';


    // --------------------------------------------------------
    // MUY IMPORTANTE:
    //
    // Orden visual:
    //     2do | 1ro | 3ro
    //
    // --------------------------------------------------------

    const jugador1 = ordenados[0];
    const jugador2 = ordenados[1];
    const jugador3 = ordenados[2];


    if (jugador2) {

        topThree.appendChild(
            crearJugadorPodio(jugador2, 2)
        );
    }


    if (jugador1) {

        topThree.appendChild(
            crearJugadorPodio(jugador1, 1)
        );
    }


    if (jugador3) {

        topThree.appendChild(
            crearJugadorPodio(jugador3, 3)
        );
    }


    layout.appendChild(topThree);


    // ========================================================
    // CUARTO LUGAR
    // ========================================================

    if (ordenados[3]) {

        const cuarto =
            crearCuartoLugar(ordenados[3]);

        layout.appendChild(cuarto);
    }


    // ========================================================
    // MENSAJE FINAL
    // ========================================================

    const footnote =
        document.createElement('div');

    footnote.className =
        'podium-footnote-new podium-reveal';

    footnote.textContent =
        construirMensajeFinal(ordenados);

    layout.appendChild(footnote);


    // ========================================================
    // INSERTAR EN EL MODAL
    // ========================================================

    contenedorInterno.appendChild(layout);


    // ========================================================
    // BOTÓN ABOUT US
    // ========================================================

    let btnAbout =
        document.getElementById('btn-about-us');


    if (!btnAbout) {

        btnAbout =
            document.createElement('button');

        btnAbout.id =
            'btn-about-us';

        btnAbout.className =
            'pixel-btn-yellow';

        btnAbout.innerText =
            'ABOUT US';

        btnAbout.onclick =
            mostrarAboutUs;


        contenedorInterno.appendChild(
            btnAbout
        );
    }


    // ========================================================
    // MOSTRAR MODAL
    // ========================================================

    modalPodio.classList.remove('oculto');


    // ========================================================
    // ANIMACIÓN
    // ========================================================

    revelarPodioConAnimacion(
        topThree,
        layout.querySelector('.podium-fourth-new'),
        footnote
    );
}


// ============================================================
// ANIMACIÓN DEL PODIO
// ============================================================

function revelarPodioConAnimacion(
    contenedorTop3,
    contenedorCuarto,
    footnote
) {

    const jugadores =
        contenedorTop3?.querySelectorAll(
            '.podium-player'
        );


    if (!jugadores) {
        return;
    }


    // Ocultar todos
    jugadores.forEach((jugador) => {

        jugador.classList.remove(
            'is-revealed'
        );

    });


    contenedorCuarto?.classList.remove(
        'is-revealed'
    );

    footnote?.classList.remove(
        'is-revealed'
    );


    // ========================================================
    // REVELAR:
    // 3ro → 2do → 1ro
    // ========================================================

    const orden =
        [3, 2, 1];


    orden.forEach(
        (puesto, indice) => {

            const jugador =
                contenedorTop3?.querySelector(
                    `.podium-rank-${puesto}`
                );


            if (!jugador) {
                return;
            }


            setTimeout(
                () => {

                    jugador.classList.add(
                        'is-revealed'
                    );

                },
                300 + indice * 400
            );
        }
    );


    // ========================================================
    // CUARTO
    // ========================================================

    if (contenedorCuarto) {

        setTimeout(
            () => {

                contenedorCuarto.classList.add(
                    'is-revealed'
                );

            },
            1600
        );
    }


    // ========================================================
    // MENSAJE
    // ========================================================

    if (footnote) {

        setTimeout(
            () => {

                footnote.classList.add(
                    'is-revealed'
                );

            },
            2000
        );
    }
}


// ============================================================
// MOSTRAR ABOUT US
// ============================================================

function mostrarAboutUs() {

    cerrarPodio();


    const modalAbout =
        document.getElementById(
            'about-modal'
        );


    if (modalAbout) {

        modalAbout.classList.remove(
            'oculto'
        );
    }
}


// ============================================================
// CERRAR ABOUT US
// ============================================================

function cerrarAboutUs() {

    const modalAbout =
        document.getElementById(
            'about-modal'
        );


    if (modalAbout) {

        modalAbout.classList.add(
            'oculto'
        );
    }


    // Regresar al menú
    window.location.href =
        'index.html';
}


// ============================================================
// CERRAR PODIO
// ============================================================

function cerrarPodio() {

    const modalPodio =
        document.getElementById(
            'podium-modal'
        );


    if (modalPodio) {

        modalPodio.classList.add(
            'oculto'
        );
    }
}
