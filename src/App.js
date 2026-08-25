import React, { useEffect, useState, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReactLoading from 'react-loading';
import { AuthProvider, AuthContext } from './context/AuthContext';
import AuthPage from './components/AuthPage/AuthPage';
import Home from './components/Home/Home';
import Gameboard from './components/Gameboard/Gameboard';

export const PlayerDataContext = createContext();
export const SocketContext = createContext();

const SERVER_URL = process.env.REACT_APP_SERVER_URL || `http://${window.location.hostname}:8080`;

function AppContent() {
    const { user, loading } = useContext(AuthContext);
    const [playerData, setPlayerData] = useState();
    const [playerSocket, setPlayerSocket] = useState();
    const [searching, setSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState('');
    const [inGame, setInGame] = useState(false);

    useEffect(() => {
        if (!user) return;

        const socket = io(SERVER_URL, { withCredentials: true });

        socket.on('player:data', data => {
            data = JSON.parse(data);
            setPlayerData(data);
            if (data.roomId) {
                setInGame(true);
                setSearching(false);
            }
        });

        socket.on('match:searching', data => {
            setSearchStatus(`Searching... ${data.queueSize} player(s) in queue`);
        });

        socket.on('match:found', data => {
            setSearchStatus(`Found opponent: ${data.opponent}! Starting game...`);
            setSearching(false);
        });

        socket.on('match:error', data => {
            setSearchStatus(data.message);
            setSearching(false);
        });

        socket.on('match:cancelled', data => {
            setSearching(false);
            setSearchStatus('');
        });

        setPlayerSocket(socket);

        return () => {
            socket.disconnect();
        };
    }, [user]);

    const handleJoinQueue = useCallback((stake) => {
        if (!playerSocket || !user) return;
        setSearching(true);
        setSearchStatus('Joining queue...');
        playerSocket.emit('match:join', {
            stakeLevel: stake.key,
            userId: user.id,
            username: user.username,
        });
    }, [playerSocket, user]);

    const handleCancelSearch = useCallback(() => {
        if (!playerSocket) return;
        const stake = searching;
        playerSocket.emit('match:leave', {});
        setSearching(false);
        setSearchStatus('');
    }, [playerSocket]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1a1a2e' }}>
                <ReactLoading type="spinningBubbles" color="white" height={66} width={66} />
            </div>
        );
    }

    if (!user) {
        return <AuthPage />;
    }

    if (inGame && playerData) {
        return (
            <SocketContext.Provider value={playerSocket}>
                <PlayerDataContext.Provider value={playerData}>
                    <Gameboard />
                </PlayerDataContext.Provider>
            </SocketContext.Provider>
        );
    }

    return (
        <SocketContext.Provider value={playerSocket}>
            <Home
                onJoinQueue={handleJoinQueue}
                searching={searching}
                searchStatus={searchStatus}
            />
            {searching && (
                <CancelSearch onCancel={handleCancelSearch} />
            )}
        </SocketContext.Provider>
    );
}

const CancelSearch = ({ onCancel }) => null; // Cancel is handled inside Home via BetSelect

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/*" element={<AppContent />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
