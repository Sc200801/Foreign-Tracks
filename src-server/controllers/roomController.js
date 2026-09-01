const { RoomPlayer, Player /*, Room, etc. */ } = require('../models');

// 1. Tu función para los turnos
exports.getRoomTurnOrder = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ message: 'Se requiere el ID de la sala.' });
    }

    const roomPlayers = await RoomPlayer.findAll({
      where: { roomId: roomId },
      order: [['createdAt', 'ASC']],
      include: [
        {
          model: Player,
          attributes: ['id', 'username', 'name']
        }
      ]
    });

    if (!roomPlayers || roomPlayers.length === 0) {
      return res.status(404).json({ message: 'No se encontraron jugadores para esta sala.' });
    }

    const turnList = roomPlayers.map((rp, index) => ({
      turnOrder: index + 1,
      playerId: rp.playerId,
      groupRole: rp.groupRole,
      joinedAt: rp.createdAt,
      player: rp.Player
    }));

    return res.json({
      success: true,
      totalPlayers: turnList.length,
      turns: turnList
    });

  } catch (error) {
    console.error('❌ Error al consultar el orden de turnos:', error);
    return res.status(500).json({ error: 'Error interno del servidor al obtener los turnos.' });
  }
};

// 2. Función de buscar sala por código
exports.getRoomByCode = async (req, res) => {
  // Pega aquí el código de esta función
};

// 3. Función de obtener salas por docente
exports.getRoomsByTeacher = async (req, res) => {
  // Pega aquí el código de esta función
};

// 4. Función del podio de la sala
exports.getRoomPodium = async (req, res) => {
  // Pega aquí el código de esta función
};