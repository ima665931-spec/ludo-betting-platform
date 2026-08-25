import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './AuthPage.css';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:8080';

const AuthPage = () => {
    const { login } = useContext(AuthContext);
    const [mode, setMode] = useState('login');
    
    // Registration fields
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    
    // OTP step
    const [step, setStep] = useState('form'); // 'form' or 'otp'
    const [otp, setOtp] = useState('');
    const [tempToken, setTempToken] = useState('');
    
    // Login fields
    const [loginIdentifier, setLoginIdentifier] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState('');

    const handleRegister = async e => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/register`, {
                username, email, phone, password,
            });
            setTempToken(res.data.tempToken);
            setStep('otp');
            setInfo(`OTP sent to ${email}. Check your inbox (and spam folder).`);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
        setLoading(false);
    };

    const handleVerifyOTP = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/verify-otp`, {
                otp, tempToken,
            });
            // After verification, login the user
            localStorage.setItem('token', res.data.token);
            window.location.reload(); // reload to trigger AuthContext
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        }
        setLoading(false);
    };

    const handleResendOTP = async () => {
        setError('');
        setLoading(true);
        try {
            await axios.post(`${API_URL}/api/auth/resend-otp`, { tempToken });
            setInfo('OTP resent! Check your email.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to resend');
        }
        setLoading(false);
    };

    const handleLogin = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(loginIdentifier, password);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
        setLoading(false);
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        setStep('form');
        setError('');
        setInfo('');
        setUsername(''); setEmail(''); setPhone(''); setPassword('');
        setOtp(''); setLoginIdentifier('');
    };

    // --- OTP verification step (register) ---
    if (mode === 'register' && step === 'otp') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <h1 className="auth-title">🎲 Verify Email</h1>
                    <p className="auth-subtitle">Enter the 6-digit code sent to your email</p>
                    {info && <p className="auth-info">{info}</p>}
                    <form onSubmit={handleVerifyOTP} className="auth-form">
                        <input
                            type="text"
                            placeholder="6-digit OTP"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            className="auth-input otp-input"
                            autoFocus
                        />
                        {error && <p className="auth-error">{error}</p>}
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify & Play'}
                        </button>
                    </form>
                    <button className="auth-link" onClick={handleResendOTP} disabled={loading}>
                        Resend OTP
                    </button>
                    <button className="auth-link" onClick={() => switchMode('register')}>
                        ← Back
                    </button>
                </div>
            </div>
        );
    }

    // --- Login form ---
    if (mode === 'login') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <h1 className="auth-title">🎲 Ludo Battle</h1>
                    <p className="auth-subtitle">Play. Win. Earn Coins.</p>
                    <div className="auth-tabs">
                        <button className="tab active">Login</button>
                        <button className="tab" onClick={() => switchMode('register')}>Sign Up</button>
                    </div>
                    <form onSubmit={handleLogin} className="auth-form">
                        <input
                            type="text"
                            placeholder="Email or Phone number"
                            value={loginIdentifier}
                            onChange={e => setLoginIdentifier(e.target.value)}
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
                            {loading ? 'Please wait...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- Register form ---
    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-title">🎲 Ludo Battle</h1>
                <p className="auth-subtitle">Create your account</p>
                <div className="auth-tabs">
                    <button className="tab" onClick={() => switchMode('login')}>Login</button>
                    <button className="tab active">Sign Up</button>
                </div>
                <form onSubmit={handleRegister} className="auth-form">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        minLength="3"
                        className="auth-input"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <input
                        type="tel"
                        placeholder="Phone number (e.g. +919876543210)"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        className="auth-input"
                    />
                    <input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength="6"
                        className="auth-input"
                    />
                    {error && <p className="auth-error">{error}</p>}
                    {info && <p className="auth-info">{info}</p>}
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? 'Sending OTP...' : 'Sign Up'}
                    </button>
                </form>
                <p className="auth-bonus">🎁 Get 1000 free coins after verification!</p>
            </div>
        </div>
    );
};

export default AuthPage;
