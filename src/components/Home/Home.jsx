import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import BetSelect from '../BetSelect/BetSelect';
import './Home.css';

const STAKE_LEVELS = [
    { key: 'beginner', label: 'Beginner', entryFee: 10, color: '#2ecc71', icon: '🟢' },
    { key: 'amateur', label: 'Amateur', entryFee: 50, color: '#f39c12', icon: '🟡' },
    { key: 'pro', label: 'Pro', entryFee: 100, color: '#e74c3c', icon: '🔴' },
    { key: 'legend', label: 'Legend', entryFee: 500, color: '#9b59b6', icon: '🟣' },
];

const Home = ({ onJoinQueue, searching, searchStatus }) => {
    const { user, logout, refreshProfile } = useContext(AuthContext);
    const [selectedStake, setSelectedStake] = useState(null);

    const handlePlay = (stake) => {
        if (user.coins < stake.entryFee) {
            alert(`Not enough coins! You need ${stake.entryFee} but have ${user.coins}.`);
            return;
        }
        setSelectedStake(stake);
        onJoinQueue(stake);
    };

    const handleCancel = () => {
        setSelectedStake(null);
    };

    if (searching && selectedStake) {
        return <BetSelect stake={selectedStake} searchStatus={searchStatus} onCancel={handleCancel} />;
    }

    return (
        <div className="home-page">
            <div className="home-header">
                <div className="user-info">
                    <h2>👋 {user.username}</h2>
                    <div className="wallet-badge">
                        <span className="coin-icon">🪙</span>
                        <span className="coin-amount">{user.coins}</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="refresh-btn" onClick={refreshProfile}>🔄</button>
                    <button className="logout-btn" onClick={logout}>Logout</button>
                </div>
            </div>

            <div className="home-body">
                <h1 className="game-title">🎲 Ludo Battle</h1>
                <p className="game-subtitle">Select your bet amount & find an opponent</p>

                <div className="stake-grid">
                    {STAKE_LEVELS.map(stake => (
                        <button
                            key={stake.key}
                            className="stake-card"
                            style={{ borderColor: stake.color }}
                            onClick={() => handlePlay(stake)}
                            disabled={user.coins < stake.entryFee}
                        >
                            <span className="stake-icon">{stake.icon}</span>
                            <span className="stake-label">{stake.label}</span>
                            <span className="stake-fee">{stake.entryFee} coins</span>
                            <span className="stake-prize">Win {stake.entryFee * 2}+</span>
                        </button>
                    ))}
                </div>

                <div className="stats-row">
                    <div className="stat-box">
                        <span className="stat-value">{user.gamesPlayed}</span>
                        <span className="stat-label">Games</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">{user.gamesWon}</span>
                        <span className="stat-label">Wins</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-value">{user.totalWinnings}</span>
                        <span className="stat-label">Winnings</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
export { STAKE_LEVELS };
