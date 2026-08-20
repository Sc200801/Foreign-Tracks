const { Scenario, DialogueNode } = require('../models');

exports.getHotelScenario = async (req, res) => {
  try {
    const scenario = await Scenario.findOne({
      where: { name: 'Hotel' },
      include: [
        {
          model: DialogueNode,
          order: [['stepIndex', 'ASC']]
        }
      ]
    });

    if (!scenario) {
      return res.status(404).json({ message: 'Escenario "Hotel" no encontrado.' });
    }

    return res.json(scenario);
  } catch (error) {
    console.error('❌ Error al consultar escenario Hotel:', error);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};