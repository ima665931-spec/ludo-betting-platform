const User = require('../models/User');
const Transaction = require('../models/Transaction');

class WalletService {
    // Deduct entry fee when joining a game
    static async deductEntryFee(userId, amount, roomId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        if (user.coins < amount) {
            return { success: false, message: 'Insufficient coins. You need ' + amount + ' coins to join.' };
        }
        const result = user.deductCoins(amount);
        if (!result.success) return result;
        await user.save();
        await Transaction.log(userId, 'game_entry', -amount, result.newBalance, roomId, 'Game entry fee');
        return { success: true, newBalance: result.newBalance };
    }

    // Credit winnings when winning a game
    static async creditWinnings(userId, amount, roomId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        const result = user.addCoins(amount);
        user.gamesWon += 1;
        user.totalWinnings += amount;
        await user.save();
        await Transaction.log(userId, 'game_winnings', amount, result.newBalance, roomId, 'Game winnings');
        return { success: true, newBalance: result.newBalance };
    }

    // Refund entry fee (e.g., game cancelled, not enough players)
    static async refundEntryFee(userId, amount, roomId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        const result = user.addCoins(amount);
        await user.save();
        await Transaction.log(userId, 'game_refund', amount, result.newBalance, roomId, 'Entry fee refund');
        return { success: true, newBalance: result.newBalance };
    }

    // Credit ad reward
    static async creditAdReward(userId, amount) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        const result = user.addCoins(amount);
        await user.save();
        await Transaction.log(userId, 'ad_reward', amount, result.newBalance, null, 'Ad reward');
        return { success: true, newBalance: result.newBalance };
    }

    // Increment games played
    static async incrementGamesPlayed(userId) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');
        user.gamesPlayed += 1;
        await user.save();
    }

    // Process game end — distribute prize to winner
    static async processGameEnd(room) {
        if (room.status !== 'playing') return;
        room.status = 'completed';
        
        const winnerUserId = room.getWinnerUserId();
        const prizePool = room.prizePool;

        // Increment games played for all participants
        for (const uid of room.playerUserIds) {
            await this.incrementGamesPlayed(uid);
        }

        if (winnerUserId && prizePool > 0) {
            await this.creditWinnings(winnerUserId, prizePool, room._id);
            room.winnerUserId = winnerUserId;
        } else {
            // No winner — refund everyone
            for (const uid of room.playerUserIds) {
                await this.refundEntryFee(uid, room.entryFee, room._id);
            }
            room.status = 'cancelled';
        }

        await room.save();
        return { winnerUserId, prizePool };
    }
}

module.exports = WalletService;
