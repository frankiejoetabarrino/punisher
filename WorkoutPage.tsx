import React, { useState, useEffect } from 'react';
import { workout, auth } from '../api/backendApi'; // Importa anche auth per i dettagli utente
import { useLocation } from 'react-router-dom';
import { ShareIcon, PrinterIcon } from '@heroicons/react/24/solid';

const WorkoutPage: React.FC = () => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const workoutIdFromUrl = queryParams.get('workoutId'); 
    
    const [workoutData, setWorkoutData] = useState<any>(null);
    const [user, setUser] = useState<any>(null); // Per i dati dell'utente (Guest o Registrato)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentWorkoutId, setCurrentWorkoutId] = useState<number | null>(null);

    useEffect(() => {
        const fetchWorkoutAndUser = async () => {
            setLoading(true);
            try {
                const userRes = await auth.getProfile();
                setUser(userRes.data);

                let fetchedWorkout = null;
                if (workoutIdFromUrl) {
                    const historyRes = await workout.getHistory();
                    fetchedWorkout = historyRes.data.find((w: any) => w.id === parseInt(workoutIdFromUrl));
                } else {
                    const historyRes = await workout.getHistory();
                    if (historyRes.data.length > 0) {
                        fetchedWorkout = historyRes.data[0];
                    }
                }
                
                if (fetchedWorkout) {
                    setWorkoutData(fetchedWorkout);
                    setCurrentWorkoutId(fetchedWorkout.id);
                    setError(null);
                } else {
                    setError("Nessun workout trovato. Generane uno dalla Dashboard!");
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Errore nel caricamento del workout. Sei connesso?');
                console.error("Workout fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchWorkoutAndUser();
    }, [workoutIdFromUrl]);

    const handleDownloadPdf = async () => {
        if (!currentWorkoutId) {
            alert("Nessun workout da scaricare!");
            return;
        }
        try {
            const response = await workout.getReportPdf(currentWorkoutId);
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `workout_report_${currentWorkoutId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            alert('Report PDF scaricato con successo!');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Errore nello scaricare il PDF. Riprova!');
            console.error("PDF download error:", err);
        }
    };

    const handleShareWorkout = () => {
        if (!workoutData || !user) {
            alert("Nessun workout da condividere!");
            return;
        }
        const workoutText = `Ho appena generato il mio workout con Calorie Punisher!\n` +
                            `Guerriero: ${user.username}\n` +
                            `Kcal da bruciare: ${workoutData.kcal_to_burn.toFixed(2)} Kcal\n` +
                            `Tempo stimato: ${workoutData.estimated_total_time_min.toFixed(1)} minuti\n\n` +
                            `Piano:\n` +
                            workoutData.workout_details.map((item: any) => 
                                `- ${item.exercise_name} (${item.exercise_acronym}): ${item.duration_min.toFixed(1)} min`
                            ).join('\n') + `\n\n#CaloriePunisher #Crossfit #NoPainNoGain`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Il Mio Workout di Battaglia!',
                text: workoutText,
                url: window.location.href,
            })
            .then(() => console.log('Workout condiviso con successo!'))
            .catch((error) => console.error('Errore nella condivisione:', error));
        } else {
            navigator.clipboard.writeText(workoutText)
                .then(() => alert('Workout copiato negli appunti! Incollalo dove vuoi!'))
                .catch(() => alert('Impossibile copiare il workout.'));
        }
    };

    if (loading) return <div className="text-center text-accent-red text-xl animate-pulse mt-16">Preparando il tuo piano di battaglia...</div>;
    if (error) return <div className="text-center text-red-400 text-lg p-4 bg-dark-card rounded-lg">{error}</div>;
    if (!workoutData) return <div className="text-center text-gray-500 text-lg mt-16">Nessun workout recente trovato. Vai alla Dashboard e Generane uno!</div>;

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in">
            <h1 className="text-4xl font-extrabold text-accent-red text-center uppercase tracking-widest">
                La Tua Sentenza è Servita!
            </h1>

            <div className="bg-dark-card p-8 rounded-lg shadow-xl border-t-4 border-b-4 border-accent-red text-center relative overflow-hidden animate-pop-in">
                <p className="text-gray-300 text-xl font-semibold mb-2">Per bruciare le tue {workoutData.kcal_to_burn.toFixed(2)} Kcal:</p>
                <p className="text-6xl font-extrabold text-accent-green animate-pulse-once mt-2 mb-4">
                    {workoutData.estimated_total_time_min.toFixed(1)} MINUTI
                </p>
                <p className="text-gray-400 text-sm">di puro allenamento infernale!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {workoutData.workout_details.map((item: any, index: number) => (
                    <div 
                        key={index} 
                        className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 hover:border-accent-blue transition-all duration-300 transform hover:-translate-y-1 animate-slide-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <h3 className="text-3xl font-bold text-accent-red mb-2 uppercase flex items-center">
                            {item.exercise_acronym} 
                            <span className="text-gray-400 ml-3 text-xl lowercase normal-case">{item.exercise_name}</span>
                        </h3>
                        <p className="text-gray-200 text-xl font-semibold mt-2">
                            Durata: <span className="text-accent-green">{item.duration_min.toFixed(1)} minuti</span>
                        </p>
                        <p className="text-gray-400 text-sm">
                            Kcal stimate bruciate in questo segmento: {item.kcal_burned_segment.toFixed(2)} Kcal
                        </p>
                    </div>
                ))}
            </div>

            <div className="flex justify-center space-x-6 mt-8">
                <button
                    onClick={handleDownloadPdf}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                    <PrinterIcon className="h-6 w-6 mr-2 text-accent-blue" />
                    Scarica Report PDF
                </button>
                <button
                    onClick={handleShareWorkout}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full shadow-lg flex items-center transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                    <ShareIcon className="h-6 w-6 mr-2 text-accent-green" />
                    Condividi la Tua Gloria
                </button>
            </div>
        </div>
    );
};

export default WorkoutPage;