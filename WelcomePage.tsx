import React, { useState } from 'react';
import { auth } from '../api/backendApi';
import { useNavigate } from 'react-router-dom';

interface WelcomePageProps {
    onLoginSuccess: (token: string, userId: number) => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onLoginSuccess }) => {
    const [isRegister, setIsRegister] = useState(false);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState('M');
    const [age, setAge] = useState(25);
    const [weight, setWeight] = useState(70);
    const [height, setHeight] = useState(175);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleGuestAccess = async () => {
        setLoading(true);
        setError(null);
        try {
            // La chiamata a getProfile() con nessun token forza il backend a dare l'utente guest
            const response = await auth.getProfile();
            console.log("Guest login response:", response.data);
            // Non c'è token per il guest, ma simuliamo un accesso
            onLoginSuccess('', response.data.id); // Passiamo un token vuoto o fittizio, userId guest
            navigate('/dashboard'); // Reindirizza alla dashboard
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore nell\'accesso guest. Riprova!');
            console.error("Guest access error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isRegister) {
                const response = await auth.register({ username, email, password, gender, age, weight_kg: weight, height_cm: height });
                alert('Registrazione avvenuta con successo! Puoi accedere ora.');
                setIsRegister(false); // Torna alla schermata di login dopo la registrazione
            } else {
                const response = await auth.login({ username, password });
                onLoginSuccess(response.data.token, response.data.user.id);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore di autenticazione. Riprova!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
            {/* Scelta Iniziale */}
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-lg border-t-4 border-b-4 border-accent-red text-center animate-fade-in">
                <h1 className="text-4xl font-extrabold text-accent-red mb-6 uppercase tracking-widest">
                    SCEGLI IL TUO CAMMINO
                </h1>
                <p className="text-gray-300 mb-8 text-lg">
                    Sei un **Guerriero Anonimo** o un **Guerriero Impegnato**?
                </p>

                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 justify-center">
                    <button
                        onClick={handleGuestAccess}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 text-xl tracking-wide group"
                        disabled={loading}
                    >
                        {loading && !isRegister ? 'Caricando Guest...' : 'Accedi come Ospite'}
                        <span className="ml-3 inline-block transition-transform duration-200 group-hover:translate-x-2">→</span>
                        <p className="text-sm text-gray-400 mt-1">(Nessuno storico, dati temporanei)</p>
                    </button>
                    <button
                        onClick={() => { setIsRegister(false); setError(null); setUsername(''); setPassword(''); }}
                        className="bg-accent-blue hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 text-xl tracking-wide group"
                    >
                        Accedi come Utente
                        <span className="ml-3 inline-block transition-transform duration-200 group-hover:translate-x-2">→</span>
                        <p className="text-sm text-blue-300 mt-1">(Salva i progressi, statistiche)</p>
                    </button>
                </div>
            </div>

            {/* Modulo di Login/Registrazione (mostrato solo se si sceglie Utente) */}
            {!(loading && !isRegister) && ( // Mostra solo se non stiamo caricando il guest access
                <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md mt-8 border border-accent-blue animate-fade-in delay-200">
                    <h2 className="text-3xl font-bold text-center text-accent-red mb-6 uppercase tracking-wider">
                        {isRegister ? 'Registrati e Unisciti alla Lotta' : 'Entra nel Cuore della Battaglia'}
                    </h2>
                    <form onSubmit={handleUserSubmit} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300 transform hover:scale-105"
                            required
                        />
                        {isRegister && (
                            <>
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300 transform hover:scale-105"
                                    required
                                />
                                <div className="flex space-x-4">
                                    <select
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="w-1/2 p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white transition-all duration-300 transform hover:scale-105"
                                    >
                                        <option value="M">Uomo</option>
                                        <option value="F">Donna</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Età"
                                        value={age}
                                        onChange={(e) => setAge(parseInt(e.target.value))}
                                        className="w-1/2 p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300 transform hover:scale-105"
                                        min="1" required
                                    />
                                </div>
                                <div className="flex space-x-4">
                                    <input
                                        type="number"
                                        placeholder="Peso (kg)"
                                        value={weight}
                                        onChange={(e) => setWeight(parseFloat(e.target.value))}
                                        className="w-1/2 p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300 transform hover:scale-105"
                                        min="1" step="0.1" required
                                    />
                                    <input
                                        type="number"
                                        placeholder="Altezza (cm)"
                                        value={height}
                                        onChange={(e) => setHeight(parseFloat(e.target.value))}
                                        className="w-1/2 p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300 transform hover:scale-105"
                                        min="1" step="0.1" required
                                    />
                                </div>
                            </>
                        )}
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300 transform hover:scale-105"
                            required
                        />
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            className="w-full p-3 bg-accent-red text-white font-bold rounded-lg hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-lg transform hover:scale-105 group"
                            disabled={loading}
                        >
                            {loading ? (isRegister ? 'Registrando...' : 'Accedendo...') : (isRegister ? 'Registrati' : 'Accedi')}
                            <span className="ml-2 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
                        </button>
                    </form>
                    <div className="text-center mt-6 text-gray-400">
                        {isRegister ? (
                            "Hai già un account? "
                        ) : (
                            "Non hai un account? "
                        )}
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-accent-blue hover:text-blue-400 font-bold transition-colors"
                        >
                            {isRegister ? 'Accedi qui' : 'Registrati ora'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WelcomePage;