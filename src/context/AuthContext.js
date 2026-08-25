import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:8080';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            axios
                .get(`${API_URL}/api/auth/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                .then(res => {
                    setUser(res.data.user);
                    setLoading(false);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                    setToken(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [token]);

    const register = async (username, email, password) => {
        const res = await axios.post(`${API_URL}/api/auth/register`, {
            username,
            email,
            password,
        });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const login = async (email, password) => {
        const res = await axios.post(`${API_URL}/api/auth/login`, {
            email,
            password,
        });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const refreshProfile = async () => {
        if (!token) return;
        const res = await axios.get(`${API_URL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data.user);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, register, login, logout, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
