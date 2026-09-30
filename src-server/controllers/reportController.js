// src-server/controllers/reportController.js
const { GroupRoom, GameSession, PlayerResponse, Player } = require('../models');

exports.getTeacherReport = async (req, res) => {
  try {
    const { teacherId } = req.params;

    if (!teacherId) {
      return res.status(400).json({ error: 'El parámetro teacherId es requerido.' });
    }

    // Consulta relacional sin forzar nombres de columnas en attributes para evitar errores SQL 1054
    const reportData = await GroupRoom.findAll({
      where: { teacherId },
      include: [
        {
          model: GameSession,
          include: [
            {
              model: Player
            },
            {
              model: PlayerResponse
            }
          ]
        }
      ]
    });

    // Procesar y calcular las métricas pedagógicas acumuladas
    const formattedReport = reportData.map(room => {
      const roomData = room.get({ plain: true });

      let roomTotalResponses = 0;
      let roomCorrectResponses = 0;
      let roomTotalScore = 0;

      // Obtener las sesiones de la sala (compatibilidad de aliases de Sequelize)
      const sessionsArray = roomData.GameSessions || roomData.gameSessions || [];

      const sessions = sessionsArray.map(session => {
        const player = session.Player || session.player;
        const responses = session.PlayerResponses || session.playerResponses || [];

        const totalResponses = responses.length;
        const correctResponses = responses.filter(r => r.isCorrect === true || r.isCorrect === 1).length;
        const totalScoreEarned = responses.reduce((sum, r) => sum + (r.scoreEarned || 0), 0);

        const accuracyRate = totalResponses > 0
          ? parseFloat(((correctResponses / totalResponses) * 100).toFixed(2))
          : 0;

        // Acumular totales de la sala
        roomTotalResponses += totalResponses;
        roomCorrectResponses += correctResponses;
        roomTotalScore += totalScoreEarned;

        return {
          sessionId: session.id,
          status: session.status,
          sessionScore: session.score || totalScoreEarned,
          student: player ? {
            id: player.id,
            nickname: player.nickname || player.username || 'Estudiante'
          } : null,
          metrics: {
            totalResponses,
            correctResponses,
            totalScoreEarned,
            accuracyRate
          }
        };
      });

      const overallAccuracyRate = roomTotalResponses > 0
        ? parseFloat(((roomCorrectResponses / roomTotalResponses) * 100).toFixed(2))
        : 0;

      return {
        roomId: roomData.id,
        roomName: roomData.groupName || `Sala ${roomData.id}`,
        roomCode: roomData.accessCode || null,
        summary: {
          totalSessions: sessions.length,
          totalScoreAccumulated: roomTotalScore,
          totalResponses: roomTotalResponses,
          overallAccuracyRate
        },
        gameSessions: sessions
      };
    });

    return res.json(formattedReport);

  } catch (error) {
    console.error('❌ Error al generar reporte del docente:', error);
    return res.status(500).json({ 
      error: 'Error al consultar las estadísticas.',
      details: error.message 
    });
  }
};