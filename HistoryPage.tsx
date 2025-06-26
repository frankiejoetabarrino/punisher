import React, { useState, useEffect } from 'react';
import { workout, auth } from '../api/backendApi'; // Importa anche auth
import { ArrowTopRightOnSquareIcon, ShieldExclamationIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

const HistoryPage: React.FC = () => {
    const [workoutHistory, setWorkoutHistory] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null); // Per sapere se è guest o registrato
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistoryAndUser = async () => {
            setLoading(true);
            try {
                const userRes = await auth.getProfile();
                setUser(userRes.data);

                if (userRes.data.is_guest) {
                    setError("Come Ospite, lo storico dei workout non è disponibile. Registrati per tenere traccia dei tuoi progressi!");
                    setWorkoutHistory([]);
                } else {
                    const response = await workout.getHistory();
                    setWorkoutHistory(response.data);
                    setError(null);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Errore nel caricamento della cronologia. Sei connesso?');
                console.error("History fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistoryAndUser();
    }, []);

    if (loading) return <div className="text-center text-accent-red text-xl animate-pulse mt-16">Scavando nelle tue imprese passate...</div>;
    
    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in">
            <h1 className="text-4xl font-extrabold text-accent-red text-center uppercase tracking-widest">
                La Tua Cronologia di Battaglia
            </h1>

            {error && (
                <div className="bg-red-900 bg-opacity-50 border border-red-700 p-4 rounded-lg text-center text-red-300 text-lg animate-pop-in flex items-center justify-center">
                    <ShieldExclamationIcon className="h-8 w-8 mr-3" /> {error}
                </div>
            )}

            {user && user.is_guest ? (
                <p className="text-gray-400 text-center text-lg mt-8">
                    Solo i veri **Guerrieri Registrati** possono vantare la loro storia. Accedi o Registrati per sbloccare lo storico completo!
                </p>
            ) : (
                workoutHistory.length === 0 ? (
                    <p className="text-gray-500 text-center text-lg mt-8">
                        Ancora nessun workout registrato. Vai a generare il tuo primo piano di battaglia dalla Dashboard!
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {workoutHistory.map((w) => (
                            <div 
                                key={w.id} 
                                className="bg-dark-card p-6 rounded-lg shadow-xl border border-gray-700 hover:border-accent-blue transition-all duration-300 transform hover:-translate-y-1 animate-slide-in-up"
                            >
                                <h3 className="text-2xl font-bold text-accent-red mb-2 flex justify-between items-center">
                                    Workout #{w.id}
                                    <Link to={`/workout?workoutId=${w.id}`} className="text-gray-400 hover:text-accent-blue transition-colors">
                                        <ArrowTopRightOnSquareIcon className="h-6 w-6" />
                                    </Link>
                                </h3>
                                <p className="text-gray-300 text-sm mb-2">Generato il: {new Date(w.generation_date).toLocaleDateString('it-IT')} alle {new Date(w.generation_date).toLocaleTimeString('it-IT')}</p>
                                <p className="text-gray-200 text-lg font-semibold">
                                    Kcal da bruciare: <span className="text-accent-green">{w.kcal_to_burn.toFixed(2)} Kcal</span>
                                </p>
                                <p className="text-gray-200 text-lg font-semibold">
                                    Tempo stimato: <span className="text-accent-blue">{w.estimated_total_time_min.toFixed(1)} minuti</span>
                                </p>
                                <div className="mt-4 text-gray-400">
                                    <p className="font-semibold">Dettagli del piano:</p>
                                    <ul className="list-disc list-inside text-sm">
                                        {w.workout_details.slice(0, 3).map((item: any, index: number) => (
                                            <li key={index}>{item.exercise_name} ({item.duration_min.toFixed(1)} min)</li>
                                        ))}
                                        {w.workout_details.length > 3 && <li>...e altri esercizi</li>}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
};

export default HistoryPage;