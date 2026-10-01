const PlayerResponse = require('../models/PlayerResponse');

// Guarda de forma asíncrona la respuesta seleccionada por el jugador
const savePlayerResponse = async (req, res) => {
  try {
    const {
      enteredText,
      isCorrect,
      scoreEarned,
      gameSessionId,
      dialogueNodeId
    } = req.body;

    // Validación básica de los campos requeridos
    if (
      enteredText === undefined ||
      isCorrect === undefined ||
      scoreEarned === undefined ||
      !gameSessionId ||
      !dialogueNodeId
    ) {
      return res.status(400).json({
        error: 'Faltan campos requeridos.'
      });
    }

    const newResponse = await PlayerResponse.create({
      enteredText,
      isCorrect,
      scoreEarned,
      gameSessionId,
      dialogueNodeId,
    });

    return res.status(201).json(newResponse);

  } catch (error) {
    console.error(
      'Error al guardar la respuesta del jugador:',
      error
    );

    return res.status(500).json({
      error: 'Error interno al guardar la respuesta.'
    });
  }
};

module.exports = {
  savePlayerResponse
};