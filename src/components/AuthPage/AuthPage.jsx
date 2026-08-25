import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './AuthPage.css';

const AuthPage = () => {
    const { login, register } = useContext(AuthContext);
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'register') {
                await register(username, email, password);
            } else {
                await login(email, password);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">🎲 Ludo Battle</h1>
                <p className="auth-subtitle">Play. Win. Earn Coins.</p>

                <div className="auth-tabs">
                    <button
                        className={mode === 'login' ? 'tab active' : 'tab'}
                        onClick={() => setMode('login')}
                    >
                        Login
                    </button>
                    <button
                        className={mode === 'register' ? 'tab active' : 'tab'}
                        onClick={() => setMode('register')}
                    >
                        Sign Up
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {mode === 'register' && (
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            minLength="3"
                            className="auth-input"
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength="6"
                        className="auth-input"
                    />
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
                    </button>
                </form>

                {mode === 'register' && (
                    <p className="auth-bonus">🎁 New users get 1000 free coins!</p>
                )}
            </div>
        </div>
    );
};

export default AuthPage;
