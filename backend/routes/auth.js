const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

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

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    next();
};

// --- Routes ---

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            return res.status(409).json({ error: 'Username or email already taken' });
        }
        const user = new User({ username, email, password });
        await user.save();
        // Log signup bonus
        await Transaction.log(user._id, 'signup_bonus', 1000, user.coins, null, 'Signup bonus');
        const token = user.generateToken();
        res.status(201).json({
            token,
            user: { id: user._id, username: user.username, email: user.email, coins: user.coins },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
        if (user.isBanned) return res.status(403).json({ error: 'Account banned' });
        const token = user.generateToken();
        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email, coins: user.coins },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get profile
router.get('/profile', authMiddleware, async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            coins: req.user.coins,
            gamesPlayed: req.user.gamesPlayed,
            gamesWon: req.user.gamesWon,
            totalWinnings: req.user.totalWinnings,
        },
    });
});

// Claim daily bonus
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

// Get transaction history
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

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find({ isBanned: false })
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
module.exports.adminMiddleware = adminMiddleware;
