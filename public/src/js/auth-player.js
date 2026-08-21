// EVENTO READY (Obligatorio para habilitar Start game)
const btnReady = document.getElementById('btn-ready');
const btnStartGame = document.getElementById('btn-start-game');
const statusP1 = document.getElementById('status-p1');

if (btnReady && btnStartGame) {
  btnReady.addEventListener('click', () => {
    // Alterna estado listo
    const estaListo = btnReady.classList.toggle('is-ready');
    
    if (estaListo) {
      btnReady.textContent = '¡Ready!';
      btnReady.style.backgroundColor = '#82f7a0';
      if (statusP1) {
        statusP1.textContent = 'Ready';
        statusP1.classList.add('ready');
      }
      // Habilita el botón Start game
      btnStartGame.removeAttribute('disabled');
      btnStartGame.style.opacity = '1';
      btnStartGame.style.cursor = 'pointer';
    } else {
      btnReady.textContent = 'Ready?';
      btnReady.style.backgroundColor = '#f7b282';
      if (statusP1) {
        statusP1.textContent = 'Not Ready';
        statusP1.classList.remove('ready');
      }
      // Bloquea nuevamente Start game
      btnStartGame.setAttribute('disabled', 'true');
      btnStartGame.style.opacity = '0.5';
      btnStartGame.style.cursor = 'not-allowed';
    }
  });
}