const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: ['signup_bonus', 'daily_bonus', 'game_entry', 'game_winnings', 'game_refund', 'admin_credit', 'admin_debit', 'ad_reward', 'purchase'],
        required: true,
    },
    amount: {
        type: Number,
        required: true, // positive for credit, negative for debit
    },
    balanceAfter: {
        type: Number,
        required: true,
    },
    roomId: {
        type: Schema.Types.ObjectId,
        ref: 'Room',
        default: null,
    },
    description: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

// Static method to log a transaction
TransactionSchema.statics.log = async function (userId, type, amount, balanceAfter, roomId = null, description = '') {
    return this.create({
        userId,
        type,
        amount,
        balanceAfter,
        roomId,
        description,
    });
};

module.exports = mongoose.model('Transaction', TransactionSchema);
