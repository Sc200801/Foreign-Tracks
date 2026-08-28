const { RoomPlayer, Player } = require('../models');

// Obtener la lista de jugadores de una sala ordenados por turno de llegada (createdAt ASC)
exports.getRoomTurnOrder = async (req, res) => {
  try {
    const { roomId } = req.params; // ID de la sala (GroupRoom.id)

    if (!roomId) {
      return res.status(400).json({ message: 'Se requiere el ID de la sala.' });
    }

    const roomPlayers = await RoomPlayer.findAll({
      where: { roomId: roomId },
      order: [['createdAt', 'ASC']], // 🟢 Garantiza que el 1er registro en DB sea el Turno 1
      include: [
        {
          model: Player,
          attributes: ['id', 'username', 'fullname'] // Trae solo la información necesaria del jugador
        }
      ]
    });

    if (!roomPlayers || roomPlayers.length === 0) {
      return res.status(404).json({ message: 'No se encontraron jugadores para esta sala.' });
    }

    // Estructuramos la respuesta asignando explícitamente el número de turno
    const turnList = roomPlayers.map((rp, index) => ({
      turnOrder: index + 1, // 1, 2, 3, 4
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