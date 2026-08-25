# Ludo Betting Platform — Virtual Currency

Forked from [Wenszel/mern-ludo](https://github.com/Wenszel/mern-ludo). Modified with auth, wallet, and virtual coin betting system.

## What's New (vs original repo)

- **User auth** — register, login, JWT tokens (`/api/auth/register`, `/api/auth/login`)
- **Wallet system** — every user gets 1000 starting coins
- **Transaction ledger** — every coin movement is logged (`/api/auth/transactions`)
- **Daily bonus** — 200 free coins every 24h (`/api/auth/daily-bonus`)
- **Stake-based rooms** — Beginner (10), Amateur (50), Pro (100), Legend (500)
- **Prize pool** — winner takes the pot on game end
- **Leaderboard** — top players by winnings (`/api/auth/leaderboard`)
- **Refund system** — if game doesn't complete, everyone gets coins back

## Prerequisites

- Node.js v20+
- MongoDB (local or Atlas)

## Setup

1. **Clone and install:**
```bash
cd ludo-platform
npm install          # frontend deps
cd backend
npm install          # backend deps (includes bcryptjs + jsonwebtoken)
```

2. **Configure environment:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set your MongoDB URI and JWT secret
```

3. **Run it:**
```bash
# Terminal 1 — backend (port 8080)
cd backend
node server.js

# Terminal 2 — frontend (port 3000)
cd ..  # back to root
npm start
```

4. **Open http://localhost:3000**

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Create account (get 1000 coins) |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/profile` | Get user profile + coin balance |
| POST | `/api/auth/daily-bonus` | Claim 200 free coins |
| GET | `/api/auth/transactions` | Transaction history |
| GET | `/api/auth/leaderboard` | Top 20 players |
| GET | `/api/health` | Health check |

## Stake Levels

| Level | Entry Fee | 2-player pot | 4-player pot |
|-------|-----------|-------------|-------------|
| Beginner | 10 coins | 20 | 40 |
| Amateur | 50 coins | 100 | 200 |
| Pro | 100 coins | 200 | 400 |
| Legend | 500 coins | 1000 | 2000 |

## Next Steps (TODO)

- [ ] Wire auth token into socket connection (currently uses session-based login)
- [ ] Frontend: login/register pages (currently uses name-only login)
- [ ] Frontend: room selection by stake level
- [ ] Frontend: wallet balance display in navbar
- [ ] Frontend: daily bonus button
- [ ] Frontend: leaderboard page
- [ ] Matchmaking: auto-pair players by stake level
- [ ] Admin dashboard: monitor economy, ban users, adjust coin balances
- [ ] Ad integration: rewarded video ads for coins
- [ ] In-app purchases: buy coins via Razorpay/UPI
- [ ] Mobile responsive UI
- [ ] Deploy to production (AWS/Vercel + MongoDB Atlas)
