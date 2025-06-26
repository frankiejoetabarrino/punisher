import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import AddMealPage from './pages/AddMealPage';
import WorkoutPage from './pages/WorkoutPage';
import HistoryPage from './pages/HistoryPage';
import UserProfilePage from './pages/UserProfilePage'; // Nuova pagina per il profilo utente
import { HomeIcon, PlusIcon, BoltIcon, ClockIcon, UserCircleIcon, IdentificationIcon } from '@heroicons/react/24/solid';
import { auth, food, workout } from './api/backendApi';

const App: React.FC = () => {
    // Gestione dello stato di autenticazione
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null); // L'ID dell'utente loggato

    useEffect(() => {
        // Controlla se c'è un token JWT salvato per determinare lo stato di login
        const token = localStorage.getItem('jwt_token');
        if (token) {
            // Qui dovresti idealmente decodificare il token o fare una chiamata /profile
            // per validarlo e ottenere l'ID utente. Per semplicità, assumiamo che se c'è token, è loggato.
            // Una chiamata a /profile all'avvio è l'approccio migliore.
            const checkAuth = async () => {
                try {
                    const profileRes = await auth.getProfile();
                    if (profileRes.data && !profileRes.data.is_guest) {
                        setIsLoggedIn(true);
                        setCurrentUserId(profileRes.data.id);
                    } else {
                        // Se c'è un token ma il backend dice che è guest, allora non è un utente registrato
                        localStorage.removeItem('jwt_token');
                        setIsLoggedIn(false);
                        setCurrentUserId(null);
                    }
                } catch (err) {
                    console.error("Errore nel controllare l'autenticazione:", err);
                    localStorage.removeItem('jwt_token'); // Rimuovi token non valido
                    setIsLoggedIn(false);
                    setCurrentUserId(null);
                }
            };
            checkAuth();
        } else {
            setIsLoggedIn(false);
            setCurrentUserId(null);
        }

        // Seeding iniziale del database (se non già popolato)
        const seedData = async () => {
            try {
                await food.seed().catch(err => console.log("Alimenti già seminati o errore:", err));
                await workout.seedExercises().catch(err => console.log("Esercizi già seminati o errore:", err));
            } catch (err) {
                console.error("Errore nel seeding iniziale:", err);
            }
        };
        seedData();
    }, []);

    const handleLoginSuccess = (token: string, userId: number) => {
        localStorage.setItem('jwt_token', token);
        setIsLoggedIn(true);
        setCurrentUserId(userId);
    };

    const handleLogout = () => {
        localStorage.removeItem('jwt_token');
        setIsLoggedIn(false);
        setCurrentUserId(null);
    };

    return (
        <Router>
            <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
                {/* Barra di navigazione */}
                <nav className="bg-gray-800 p-4 shadow-lg flex justify-around items-center fixed bottom-0 left-0 right-0 z-50 md:relative md:bottom-auto md:justify-center md:space-x-8">
                    <Link to="/dashboard" className="nav-item">
                        <HomeIcon className="h-7 w-7 md:h-8 md:w-8" />
                        <span className="mt-1 hidden md:block">Dashboard</span>
                    </Link>
                    <Link to="/add-meal" className="nav-item">
                        <PlusIcon className="h-7 w-7 md:h-8 md:w-8" />
                        <span className="mt-1 hidden md:block">Aggiungi Pasto</span>
                    </Link>
                    <Link to="/workout" className="nav-item">
                        <BoltIcon className="h-7 w-7 md:h-8 md:w-8" />
                        <span className="mt-1 hidden md:block">Workout</span>
                    </Link>
                    <Link to="/history" className="nav-item">
                        <ClockIcon className="h-7 w-7 md:h-8 md:w-8" />
                        <span className="mt-1 hidden md:block">Storico</span>
                    </Link>
                    {isLoggedIn ? (
                        <>
                            <Link to="/profile" className="nav-item">
                                <UserCircleIcon className="h-7 w-7 md:h-8 md:w-8" />
                                <span className="mt-1 hidden md:block">Profilo</span>
                            </Link>
                            <button onClick={handleLogout} className="nav-item text-gray-400">
                                <IdentificationIcon className="h-7 w-7 md:h-8 md:w-8" />
                                <span className="mt-1 hidden md:block">Logout</span>
                            </button>
                        </>
                    ) : (
                        <Link to="/welcome" className="nav-item">
                            <IdentificationIcon className="h-7 w-7 md:h-8 md:w-8" />
                            <span className="mt-1 hidden md:block">Accedi / Guest</span>
                        </Link>
                    )}
                </nav>

                <main className="flex-grow p-4 md:p-8 overflow-y-auto">
                    <Routes>
                        <Route path="/welcome" element={<WelcomePage onLoginSuccess={handleLoginSuccess} />} />
                        <Route path="/dashboard" element={<DashboardPage />} /> {/* Non serve più passare userId */}
                        <Route path="/add-meal" element={<AddMealPage />} />
                        <Route path="/workout" element={<WorkoutPage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        {isLoggedIn && <Route path="/profile" element={<UserProfilePage />} />}
                        <Route path="*" element={<Navigate to="/dashboard" replace />} /> {/* Default alla dashboard */}
                    </Routes>
                </main>
            </div>
        </Router>
    );
};

export default App;