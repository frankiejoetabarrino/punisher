import React, { useState, useEffect } from 'react';
import { userProfile, meals, workout } from '../api/backendApi';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ClockIcon, IdentificationIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const DashboardPage: React.FC = () => {
    const [user, setUser] = useState<any>(null); // Contiene il profilo utente (guest o registrato)
    const [dailyMeals, setDailyMeals] = useState<any[]>([]);
    const [totalDailyKcalIngested, setTotalDailyKcalIngested] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            setLoading(true);
            const userRes = await userProfile.get(); // Ottiene il profilo utente (guest o registrato)
            setUser(userRes.data);

            const mealsRes = await meals.getDaily(); // Ottiene i pasti per l'utente corrente
            setDailyMeals(mealsRes.data.meals);
            setTotalDailyKcalIngested(mealsRes.data.total_daily_kcal_ingested);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore nel caricamento dei dati della dashboard. Controlla la tua connessione!');
            console.error("Dashboard data fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []); // Non dipende da userId, perché lo stato utente è gestito dall'API e localStorage

    const handleGenerateWorkout = async () => {
        if (!user) {
            setError("Profilo utente non disponibile per generare un workout.");
            return;
        }
        try {
            const response = await workout.generate(totalDailyKcalIngested);
            alert(`Workout generato! Tempo stimato: ${response.data.workout.estimated_total_time_min} minuti.`);
            navigate(`/workout?workoutId=${response.data.workout.id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore nella generazione del workout. Troppe Kcal o non abbastanza esercizi?');
            console.error("Workout generation error:", err);
        }
    };

    if (loading) return <div className="text-center text-accent-red text-xl animate-pulse mt-16">Caricamento della tua arena...</div>;
    if (error) return <div className="text-center text-red-400 text-lg p-4 bg-dark-card rounded-lg">{error}</div>;
    if (!user) return <div className="text-center text-gray-500 text-lg">Nessun profilo utente trovato. Accedi o continua come ospite dalla pagina di benvenuto.</div>;

    const estimatedDailyBurn = user.bmr * (user.is_guest ? 1.3 : 1.5); // Fattore attività più alto per registrato
    const dailyBalance = totalDailyKcalIngested - estimatedDailyBurn;
    const balanceColor = dailyBalance > 0 ? 'bg-red-600' : 'bg-green-600';
    const balanceText = dailyBalance > 0 ? `+${dailyBalance.toFixed(2)} Kcal` : `${dailyBalance.toFixed(2)} Kcal`;

    const mealLabels = dailyMeals.map(meal => meal.description || `Pasto ${new Date(meal.meal_time).toLocaleTimeString('it-IT')}`);
    const mealKcalData = dailyMeals.map(meal => meal.total_kcal_in_meal);

    const mealChartData = {
        labels: mealLabels,
        datasets: [
            {
                label: 'Kcal Ingerite per Pasto',
                data: mealKcalData,
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
            },
        ],
    };

    const mealChartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const, labels: { color: 'white' } },
            title: { display: true, text: 'Kcal Consumate Oggi', color: 'white' },
        },
        scales: {
            x: { ticks: { color: 'gray' }, grid: { color: 'rgba(255,255,255,0.1)' } },
            y: { ticks: { color: 'gray' }, grid: { color: 'rgba(255,255,255,0.1)' }, beginAtZero: true, max: Math.max(totalDailyKcalIngested * 1.2, 1000) },
        },
    };

    const doughnutData = {
        labels: ['Kcal Ingerite', 'Kcal Bruciate Stimate'],
        datasets: [
            {
                data: [totalDailyKcalIngested, estimatedDailyBurn],
                backgroundColor: ['#EF4444', '#22C55E'],
                borderColor: ['#1a1a1a', '#1a1a1a'],
                borderWidth: 2,
            },
        ],
    };

    const doughnutOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const, labels: { color: 'white' } },
            title: { display: true, text: 'Bilancio Calorico Base Oggi', color: 'white' },
        },
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in">
            <h1 className="text-4xl font-extrabold text-accent-red text-center uppercase tracking-widest">
                La Tua Arena, {user.username}{user.is_guest ? ' (Ospite)' : ''}!
            </h1>

            {/* Avviso per utente guest */}
            {user.is_guest && (
                <div className="bg-blue-900 bg-opacity-50 border border-blue-700 p-4 rounded-lg text-center text-blue-300 text-sm animate-pop-in">
                    Sei in modalità **Ospite**. I tuoi dati sono temporanei e non verranno salvati. Per monitorare i tuoi progressi, registrati!
                </div>
            )}

            {/* Bilancio Calorico Totale Oggi */}
            <div className="bg-dark-card p-6 rounded-lg shadow-xl border border-accent-red text-center animate-pop-in">
                <h2 className="text-2xl font-bold text-gray-200 mb-4">Bilancio Energetico Attuale</h2>
                <div className={`text-5xl font-extrabold ${balanceColor} p-4 rounded-lg inline-block shadow-lg transition-all duration-500 ease-out transform hover:scale-105`}>
                    {balanceText}
                </div>
                <p className="text-gray-400 mt-2">Kcal ingertie vs. Kcal bruciate stimate (basate su BMR + attività)</p>
            </div>

            {/* Grafici */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-dark-card p-6 rounded-lg shadow-xl border border-accent-blue animate-slide-in-left">
                    <Bar data={mealChartData} options={mealChartOptions} />
                </div>
                <div className="bg-dark-card p-6 rounded-lg shadow-xl border border-accent-green animate-slide-in-right">
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                    <p className="text-center text-gray-400 text-sm mt-4">Il tuo Metabolismo Basale (BMR): {user.bmr.toFixed(2)} Kcal/giorno</p>
                </div>
            </div>

            {/* Ultimi Pasti */}
            <div className="bg-dark-card p-6 rounded-lg shadow-xl border border-gray-700 animate-fade-in delay-200">
                <h2 className="text-2xl font-bold text-gray-200 mb-4 flex items-center">
                    <ClockIcon className="h-7 w-7 text-gray-400 mr-2" />
                    I Tuoi Ultimi Peccati (Pasti Recenti)
                </h2>
                {dailyMeals.length === 0 ? (
                    <p className="text-gray-400 text-center">Nessun pasto registrato oggi. Vai a mangiare qualcosa, poi paga il conto!</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dailyMeals.map((meal) => (
                            <div key={meal.meal_id} className="bg-gray-700 p-4 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
                                <h3 className="text-xl font-semibold text-accent-red mb-2">{meal.description}</h3>
                                <p className="text-gray-300 text-sm mb-1">{new Date(meal.meal_time).toLocaleTimeString('it-IT')}</p>
                                <ul className="text-gray-400 text-sm list-disc pl-5">
                                    {meal.items.map((item: any, idx: number) => (
                                        <li key={idx} className="flex items-center space-x-2">
                                            {item.image_url && <img src={item.image_url} alt={item.food_item_name} className="w-8 h-8 rounded-full object-cover border border-gray-600" />}
                                            <span>{item.food_item_name} ({item.grams_consumed}g) - {item.kcal_total.toFixed(2)} Kcal</span>
                                        </li>
                                    ))}
                                </ul>
                                <p className="text-lg font-bold text-red-300 mt-2">Totale: {meal.total_kcal_in_meal.toFixed(2)} Kcal</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pulsante Genera Workout */}
            <div className="text-center mt-8">
                <button
                    onClick={handleGenerateWorkout}
                    className="bg-accent-red hover:bg-red-800 text-white text-2xl font-extrabold py-4 px-10 rounded-full shadow-2xl tracking-wider uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 animate-pulse-once"
                >
                    Genera il Tuo WOD di Vendetta!
                </button>
            </div>
        </div>
    );
};

export default DashboardPage;