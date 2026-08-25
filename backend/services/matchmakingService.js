// Matchmaking queue — matches players by stake level
// In-memory queue (for single-server deployment)

const queues = {}; // { beginner: [{ socketId, userId, username }], ... }

class MatchmakingService {
    static joinQueue(stakeLevel, socketId, userId, username) {
        if (!queues[stakeLevel]) {
            queues[stakeLevel] = [];
        }

        // Check if already in queue
        const existing = queues[stakeLevel].find(p => p.socketId === socketId);
        if (existing) return { success: false, message: 'Already in queue' };

        // Check if there's a waiting opponent
        if (queues[stakeLevel].length > 0) {
            const opponent = queues[stakeLevel].shift(); // remove first waiting player
            return {
                success: true,
                matched: true,
                opponent: opponent,
                player: { socketId, userId, username },
            };
        }

        // No opponent yet — add to queue
        queues[stakeLevel].push({ socketId, userId, username });
        return { success: true, matched: false };
    }

    static leaveQueue(socketId) {
        for (const level of Object.keys(queues)) {
            queues[level] = queues[level].filter(p => p.socketId !== socketId);
        }
    }

    static getQueueSize(stakeLevel) {
        return queues[stakeLevel] ? queues[stakeLevel].length : 0;
    }

    static getQueueSizes() {
        const sizes = {};
        for (const level of Object.keys(queues)) {
            sizes[level] = queues[level].length;
        }
        return sizes;
    }
}

module.exports = MatchmakingService;
