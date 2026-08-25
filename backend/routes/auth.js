const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const EmailService = require('../services/emailService');

const router = express.Router();

// --- Auth middleware ---
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token provided' });
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.isBanned) return res.status(403).json({ error: 'Account banned' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// --- STEP 1: Register (creates unverified user, sends OTP) ---
router.post('/register', async (req, res) => {
    try {
        const { username, email, phone, password } = req.body;
        if (!username || !email || !phone || !password) {
            return res.status(400).json({ error: 'All fields required: username, email, phone, password' });
        }

        // Check if email already exists AND is verified
        const existingEmail = await User.findOne({ email });
        if (existingEmail && existingEmail.isEmailVerified) {
            return res.status(409).json({ error: 'Email already registered. Please login.' });
        }

        // Check if phone already exists AND is verified
        const existingPhone = await User.findOne({ phone });
        if (existingPhone && existingPhone.isEmailVerified) {
            return res.status(409).json({ error: 'Phone number already registered.' });
        }

        // If unverified user exists with same email, delete and recreate
        if (existingEmail && !existingEmail.isEmailVerified) {
            await User.deleteOne({ _id: existingEmail._id });
        }

        // Create new unverified user
        const user = new User({ username, email, phone, password });
        const otp = user.generateOTP();
        await user.save();

        // Send OTP email
        const emailResult = await EmailService.sendOTP(email, otp, username);
        if (!emailResult.success) {
            return res.status(500).json({ error: 'Failed to send OTP email. Try again.' });
        }

        // Return a temporary token (not full access — just for OTP verification)
        const tempToken = jwt.sign(
            { id: user._id, purpose: 'verify' },
            process.env.JWT_SECRET || 'dev_secret_change_me',
            { expiresIn: '15m' }
        );

        res.status(201).json({
            message: 'OTP sent to your email. Verify to complete registration.',
            tempToken,
            email: email,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- STEP 2: Verify OTP (marks verified, gives signup bonus, returns full token) ---
router.post('/verify-otp', async (req, res) => {
    try {
        const { otp, tempToken } = req.body;
        if (!otp || !tempToken) {
            return res.status(400).json({ error: 'OTP and token required' });
        }

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'dev_secret_change_me');
        if (decoded.purpose !== 'verify') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.isEmailVerified) return res.status(400).json({ error: 'Already verified' });

        const verified = user.verifyOTP(otp);
        if (!verified) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        await user.save();
        // Log signup bonus
        await Transaction.log(user._id, 'signup_bonus', 1000, user.coins, null, 'Signup bonus');

        const token = user.generateToken();
        res.json({
            message: 'Email verified! Account created with 1000 bonus coins.',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                coins: user.coins,
                gamesPlayed: user.gamesPlayed,
                gamesWon: user.gamesWon,
                totalWinnings: user.totalWinnings,
            },
        });
    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token expired. Please register again.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// --- STEP 3: Resend OTP ---
router.post('/resend-otp', async (req, res) => {
    try {
        const { tempToken } = req.body;
        if (!tempToken) return res.status(400).json({ error: 'Token required' });

        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'dev_secret_change_me');
        if (decoded.purpose !== 'verify') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.isEmailVerified) return res.status(400).json({ error: 'Already verified' });

        const otp = user.generateOTP();
        await user.save();

        const emailResult = await EmailService.sendOTP(user.email, otp, user.username);
        if (!emailResult.success) {
            return res.status(500).json({ error: 'Failed to send OTP. Try again.' });
        }

        res.json({ message: 'OTP resent to your email.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Login (email OR phone + password) ---
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Email/phone and password required' });
        }

        // Find by email or phone
        const user = await User.findOne({
            $or: [
                { email: identifier.toLowerCase().trim() },
                { phone: identifier.trim() },
            ],
        });

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        if (!user.isEmailVerified) return res.status(403).json({ error: 'Email not verified. Please verify first.' });
        if (user.isBanned) return res.status(403).json({ error: 'Account banned' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = user.generateToken();
        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                coins: user.coins,
                gamesPlayed: user.gamesPlayed,
                gamesWon: user.gamesWon,
                totalWinnings: user.totalWinnings,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Get profile ---
router.get('/profile', authMiddleware, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            phone: req.user.phone,
            coins: req.user.coins,
            gamesPlayed: req.user.gamesPlayed,
            gamesWon: req.user.gamesWon,
            totalWinnings: req.user.totalWinnings,
        },
    });
});

// --- Claim daily bonus ---
router.post('/daily-bonus', authMiddleware, async (req, res) => {
    try {
        const result = req.user.claimDailyBonus();
        if (!result.success) return res.status(400).json({ error: result.message });
        await req.user.save();
        await Transaction.log(req.user._id, 'daily_bonus', result.bonus, result.newBalance, null, 'Daily login bonus');
        res.json({ bonus: result.bonus, newBalance: result.newBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Get transaction history ---
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ transactions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Get leaderboard ---
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find({ isBanned: false, isEmailVerified: true })
            .select('username coins gamesWon totalWinnings')
            .sort({ totalWinnings: -1 })
            .limit(20);
        res.json({ leaderboard: users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
