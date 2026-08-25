const socketManager = require('../socket/socketManager');
const registerPlayerHandlers = require('../handlers/playerHandler');
const registerRoomHandlers = require('../handlers/roomHandler');
const registerGameHandlers = require('../handlers/gameHandler');
const registerMatchmakingHandlers = require('../handlers/matchmakingHandler');
const { sessionMiddleware, wrap } = require('../config/session');

module.exports = function (server) {
    socketManager.initialize(server);
    const io = socketManager.getIO();
    io.engine.on('initial_headers', (headers, req) => {
        if (req.cookieHolder) {
            headers['set-cookie'] = req.cookieHolder;
            delete req.cookieHolder;
        }
    });
    io.use(wrap(sessionMiddleware));
    io.on('connection', socket => {
        registerPlayerHandlers(socket);
        registerRoomHandlers(socket);
        registerGameHandlers(socket);
        registerMatchmakingHandlers(socket, io);
        if (socket.request.session.roomId) {
            const roomId = socket.request.session.roomId.toString();
            socket.join(roomId);
            socket.emit('player:data', JSON.stringify(socket.request.session));
        }
    });
};
