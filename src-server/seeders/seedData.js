const { Scenario, Ending, DialogueNode } = require('../models');

const dialogueNodesData = [
  {
    stepIndex: 1,
    targetPlayer: 1,
    situationTextEn: "Hey there, guys! Who are you all?",
    correctAnswerPattern: "We are travelers.",
    wrongAnswer: "I am a tourist..",
    feedbackText: JSON.stringify({ "❌ Atención al grupo": "Seleccionaste 'I am', una forma que sirve para hablar solo de ti (singular)." })
  },
  {
    stepIndex: 2,
    targetPlayer: 2,
    situationTextEn: "Do you all have your IDs? What do you guys have?",
    correctAnswerPattern: "Here are our passports.",
    wrongAnswer: "I have a red bag.",
    feedbackText: JSON.stringify({ "❌ Revisa la pregunta": "Te han pedido los documentos de identidad (IDs), pero respondiste sobre una mochila (bag) y de forma individual." })
  },
  {
    stepIndex: 3,
    targetPlayer: 3,
    situationTextEn: "And your luggage? What color are your bags?",
    correctAnswerPattern: "Our suitcases are yellow and blue.",
    wrongAnswer: "My suitcase is blue.",
    feedbackText: JSON.stringify({ "❌ Falta el equipaje del resto": "Usaste 'My' (Mi), lo que responde únicamente por tu maleta." })
  },
  {
    stepIndex: 4,
    targetPlayer: 4,
    situationTextEn: "Got it! How long are you guys staying here?",
    correctAnswerPattern: "We are staying for two nights. Thanks!",
    wrongAnswer: "I am staying one day.",
    feedbackText: JSON.stringify({ "❌ Registro incompleto": "Indicar 'I am staying' registra a una sola persona y dejaría a tus compañeros fuera del hotel." })
  }
];

const seedInitialData = async () => {
  try {
    // 1. Insertar Escenario Hotel si no existe 🏨
    const [hotel, createdScenario] = await Scenario.findOrCreate({
      where: { name: 'Hotel' },
      defaults: {
        name: 'Hotel',
        description: 'Primer escenario: Los 4 jugadores colaboran como un grupo de viajeros para interactuar con la recepcionista, responder preguntas sobre pasaportes, equipaje y tiempo de estadía para lograr hacer el registro correctamente.',
      },
    });

    if (createdScenario) {
      console.log('🌱 Escenario "Hotel" insertado correctamente.');
    } else {
      console.log('ℹ️ Escenario "Hotel" ya existía en la base de datos.');
    }

    // 2. Insertar Registro Inicial de Ending si no existe 🏁
    const [defaultEnding, createdEnding] = await Ending.findOrCreate({
      where: { id: 100 },
      defaults: {
        id: 100,
        title: 'En curso / Sin concluir',
        description: 'El jugador aún no ha finalizado la partida.',
        minEnglishScore: 0,
        minHealth: 0,
      },
    });

    if (createdEnding) {
      console.log('🌱 Registro inicial en Ending (id: 100) insertado correctamente.');
    } else {
      console.log('ℹ️ Registro en Ending (id: 100) ya existía.');
    }

    // 3. Vincular diálogos al ID del Hotel e insertarlos (sin duplicar) 💬
    // Borramos los diálogos previos de este escenario para reinsertarlos limpios
    await DialogueNode.destroy({ where: { scenarioId: hotel.id } });

    const nodesWithScenario = dialogueNodesData.map(node => ({
      ...node,
      scenarioId: hotel.id // Le asignamos automáticamente el ID del Hotel
    }));

    await DialogueNode.bulkCreate(nodesWithScenario);
    console.log('🌱 Nodos de diálogo del Hotel insertados correctamente (sin duplicados).');

  } catch (error) {
    console.error('❌ Error al insertar datos iniciales (seeders):', error);
  }
};

// Exportamos la función principal para que el proyecto o servidor la ejecute
module.exports = seedInitialData;

// Si necesitas ejecutar este archivo directamente desde la terminal con `node`, descomenta la siguiente línea:
seedInitialData();