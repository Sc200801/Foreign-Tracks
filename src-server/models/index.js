const Player = require('./Player');
const Teacher = require('./Teacher');
const Scenario = require('./Scenario');
const Ending = require('./Ending');
const DialogueNode = require('./DialogueNode');
const GroupRoom = require('./GroupRoom');
const RoomPlayer = require('./RoomPlayer');
const GameSession = require('./GameSession');
const PlayerResponse = require('./PlayerResponse');

// --- CONFIGURACIÓN DE LLAVES FORÁNEAS Y RELACIONES ---

// 1. Misiones de Diálogo pertenecen a un Escenario
Scenario.hasMany(DialogueNode, { foreignKey: 'scenarioId' });
DialogueNode.belongsTo(Scenario, { foreignKey: 'scenarioId' });

// 2. Salas de Grupo son creadas por un Maestro
Teacher.hasMany(GroupRoom, { foreignKey: 'teacherId' });
GroupRoom.belongsTo(Teacher, { foreignKey: 'teacherId' });

// 3. Relación Muchos-a-Muchos entre Jugadores y Salas (Estudiantes en Sala)
GroupRoom.belongsToMany(Player, { through: RoomPlayer, foreignKey: 'roomId' });
Player.belongsToMany(GroupRoom, { through: RoomPlayer, foreignKey: 'playerId' });

// 4. Partida (GameSession) y sus conexiones
Player.hasMany(GameSession, { foreignKey: 'playerId' });
GameSession.belongsTo(Player, { foreignKey: 'playerId' });

GroupRoom.hasMany(GameSession, { foreignKey: 'roomId' });
GameSession.belongsTo(GroupRoom, { foreignKey: 'roomId' });

Ending.hasMany(GameSession, { foreignKey: 'endingId' });
GameSession.belongsTo(Ending, { foreignKey: 'endingId' });

Scenario.hasMany(GameSession, { foreignKey: 'currentScenarioId' });
GameSession.belongsTo(Scenario, { foreignKey: 'currentScenarioId' });

// 5. Respuestas del Jugador asociadas a Partida y Nodo de Diálogo
GameSession.hasMany(PlayerResponse, { foreignKey: 'gameSessionId' });
PlayerResponse.belongsTo(GameSession, { foreignKey: 'gameSessionId' });

DialogueNode.hasMany(PlayerResponse, { foreignKey: 'dialogueNodeId' });
PlayerResponse.belongsTo(DialogueNode, { foreignKey: 'dialogueNodeId' });

module.exports = {
  Player,
  Teacher,
  Scenario,
  Ending,
  DialogueNode,
  GroupRoom,
  RoomPlayer,
  GameSession,
  PlayerResponse,
};