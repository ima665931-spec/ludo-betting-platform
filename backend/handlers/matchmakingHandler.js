const MatchmakingService = require('../services/matchmakingService');
const WalletService = require('../services/walletService');
const Room = require('../models/room');
const { STAKE_LEVELS } = require('../models/room');
const { sendToOnePlayerData } = require('../socket/emits');
const User = require('../models/User');

module.exports = (socket, io) => {
    const handleJoinQueue = async (data) => {
        const { stakeLevel, userId, username } = data;
        const stakeConfig = STAKE_LEVELS[stakeLevel];
        if (!stakeConfig) return socket.emit('match:error', { message: 'Invalid stake level' });

        // Check user has enough coins
        const user = await User.findById(userId);
        if (!user) return socket.emit('match:error', { message: 'User not found' });
        if (user.coins < stakeConfig.entryFee) {
            return socket.emit('match:error', { message: `Need ${stakeConfig.entryFee} coins, you have ${user.coins}` });
        }

        // Deduct entry fee
        const deductResult = await WalletService.deductEntryFee(userId, stakeConfig.entryFee, null);
        if (!deductResult.success) {
            return socket.emit('match:error', { message: deductResult.message });
        }

        // Join queue
        const result = MatchmakingService.joinQueue(stakeLevel, socket.id, userId, username);

        if (!result.success) {
            // Refund if already in queue
            await WalletService.refundEntryFee(userId, stakeConfig.entryFee, null);
            return socket.emit('match:error', { message: result.message });
        }

        if (result.matched) {
            // Two players matched — create room
            const player1 = result.opponent;
            const player2 = result.player;

            const room = new Room({
                name: `${player1.username} vs ${player2.username}`,
                stakeLevel: stakeLevel,
                entryFee: stakeConfig.entryFee,
                prizePool: stakeConfig.entryFee * 2,
                status: 'playing',
                playerUserIds: [player1.userId, player2.userId],
                private: false,
            });

            room.addPlayer(player1.username);
            room.addPlayer(player2.username);
            room.collectEntryFee();
            room.startGame();
            await room.save();

            const roomId = room._id.toString();

            // Notify both players
            io.to(player1.socketId).emit('match:found', {
                roomId,
                opponent: player2.username,
                color: 'red',
                stakeLevel,
                entryFee: stakeConfig.entryFee,
                prizePool: stakeConfig.entryFee * 2,
            });
            io.to(player2.socketId).emit('match:found', {
                roomId,
                opponent: player1.username,
                color: 'blue',
                stakeLevel,
                entryFee: stakeConfig.entryFee,
                prizePool: stakeConfig.entryFee * 2,
            });

            // Join socket rooms
            io.sockets.sockets.get(player1.socketId)?.join(roomId);
            io.sockets.sockets.get(player2.socketId)?.join(roomId);

            // Send initial game data
            const savedRoom = await Room.findById(roomId);
            io.to(player1.socketId).emit('player:data', JSON.stringify({
                roomId,
                playerId: savedRoom.players[0]._id.toString(),
                color: 'red',
                name: player1.username,
            }));
            io.to(player2.socketId).emit('player:data', JSON.stringify({
                roomId,
                playerId: savedRoom.players[1]._id.toString(),
                color: 'blue',
                name: player2.username,
            }));

        } else {
            // Still searching
            socket.emit('match:searching', {
                stakeLevel,
                queueSize: MatchmakingService.getQueueSize(stakeLevel),
                entryFee: stakeConfig.entryFee,
            });
        }
    };

    const handleLeaveQueue = async (data) => {
        const { stakeLevel, userId } = data;
        const stakeConfig = STAKE_LEVELS[stakeLevel];
        
        MatchmakingService.leaveQueue(socket.id);
        
        // Refund entry fee
        if (stakeConfig && userId) {
            await WalletService.refundEntryFee(userId, stakeConfig.entryFee, null);
        }

        socket.emit('match:cancelled', { message: 'Search cancelled, coins refunded' });
    };

    const handleGetQueueSizes = () => {
        socket.emit('match:queueSizes', MatchmakingService.getQueueSizes());
    };

    socket.on('match:join', handleJoinQueue);
    socket.on('match:leave', handleLeaveQueue);
    socket.on('match:queueSizes', handleGetQueueSizes);

    // Clean up on disconnect
    socket.on('disconnect', () => {
        MatchmakingService.leaveQueue(socket.id);
    });
};
