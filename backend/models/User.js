const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    // OTP fields
    emailOTP: {
        type: String,
        default: null,
    },
    otpExpires: {
        type: Date,
        default: null,
    },
    avatar: {
        type: String,
        default: null,
    },
    coins: {
        type: Number,
        default: 0, // 0 until verified, then 1000 on first login
        min: 0,
    },
    signupBonusClaimed: {
        type: Boolean,
        default: false,
    },
    gamesPlayed: {
        type: Number,
        default: 0,
    },
    gamesWon: {
        type: Number,
        default: 0,
    },
    totalWinnings: {
        type: Number,
        default: 0,
    },
    lastDailyBonus: {
        type: Date,
        default: null,
    },
    isBanned: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
}, {
    timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
UserSchema.methods.generateToken = function () {
    return jwt.sign(
        { id: this._id, username: this.username, role: this.role },
        process.env.JWT_SECRET || 'dev_secret_change_me',
        { expiresIn: '7d' }
    );
};

// Generate OTP
UserSchema.methods.generateOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailOTP = otp;
    this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
    return otp;
};

// Verify OTP
UserSchema.methods.verifyOTP = function (candidateOTP) {
    if (!this.emailOTP || !this.otpExpires) return false;
    if (Date.now() > this.otpExpires.getTime()) return false;
    if (this.emailOTP !== candidateOTP) return false;
    // Clear OTP and mark verified
    this.emailOTP = null;
    this.otpExpires = null;
    this.isEmailVerified = true;
    // Claim signup bonus on verification
    if (!this.signupBonusClaimed) {
        this.coins = 1000;
        this.signupBonusClaimed = true;
    }
    return true;
};

// Claim daily bonus
UserSchema.methods.claimDailyBonus = function () {
    const now = new Date();
    if (this.lastDailyBonus) {
        const hoursSinceLast = (now - this.lastDailyBonus) / (1000 * 60 * 60);
        if (hoursSinceLast < 20) {
            return { success: false, message: 'Daily bonus already claimed. Come back later.' };
        }
    }
    const bonus = 200;
    this.coins += bonus;
    this.lastDailyBonus = now;
    return { success: true, bonus, newBalance: this.coins };
};

// Deduct coins
UserSchema.methods.deductCoins = function (amount) {
    if (this.coins < amount) {
        return { success: false, message: 'Insufficient coins' };
    }
    this.coins -= amount;
    return { success: true, newBalance: this.coins };
};

// Add coins
UserSchema.methods.addCoins = function (amount) {
    this.coins += amount;
    return { success: true, newBalance: this.coins };
};

module.exports = mongoose.model('User', UserSchema);
