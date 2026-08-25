import React, { useState, useEffect } from 'react';
import './BetSelect.css';

const BetSelect = ({ stake, searchStatus, onCancel }) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="betselect-page">
            <div className="betselect-card">
                <div className="search-spinner"></div>
                <h2>Searching for opponent{dots}</h2>
                <div className="stake-info">
                    <span className="stake-icon-large">{stake.icon}</span>
                    <span className="stake-name" style={{ color: stake.color }}>{stake.label}</span>
                    <span className="stake-entry">Entry: {stake.entryFee} coins</span>
                    <span className="stake-win">Winner gets {stake.entryFee * 2} coins!</span>
                </div>
                <p className="search-status">{searchStatus || 'Looking for a player with same bet...'}</p>
                <button className="cancel-btn" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default BetSelect;
