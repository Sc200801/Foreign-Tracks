const { Scenario, Ending } = require('../models');

const seedInitialData = async () => {
  try {
    // 1. Insertar Escenario Hotel si no existe
    const [hotel, createdScenario] = await Scenario.findOrCreate({
      where: { nombre_escenario: 'Hotel' },
      defaults: {
        nombre_escenario: 'Hotel',
        descripcion: 'Escenario de interacción e inglés conversacional en la recepción de un hotel.',
      },
    });

    if (createdScenario) {
      console.log('🌱 Escenario "Hotel" insertado correctamente.');
    } else {
      console.log('ℹ️ Escenario "Hotel" ya existía en la base de datos.');
    }

    // 2. Insertar Registro Inicial de Ending si no existe
    const [defaultEnding, createdEnding] = await Ending.findOrCreate({
      where: { id_final: 100 },
      defaults: {
        id_final: 100,
        titulo_final: 'En curso / Sin concluir',
        descripcion: 'El jugador aún no ha finalizado la partida.',
        puntaje_ingles_minimo: 0,
        salud_minima: 0,
      },
    });

    if (createdEnding) {
      console.log('🌱 Registro inicial en Ending (id: 100) insertado correctamente.');
    } else {
      console.log('ℹ️ Registro en Ending (id: 100) ya existía.');
    }

  } catch (error) {
    console.error('❌ Error al insertar datos iniciales (seeders):', error);
  }
};

module.exports = seedInitialData;