import React, { useState, useEffect } from 'react';
import { auth } from '../api/backendApi';
import { UserCircleIcon, CakeIcon, ScaleIcon, ArrowsRightLeftIcon, IdentificationIcon, PhotoIcon } from '@heroicons/react/24/solid';

const UserProfilePage: React.FC = () => {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Campi per la modifica
    const [gender, setGender] = useState('');
    const [age, setAge] = useState<number>(0);
    const [weight, setWeight] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);
    const [profilePicUrl, setProfilePicUrl] = useState('');

    const fetchUserProfile = async () => {
        setLoading(true);
        try {
            const response = await auth.getProfile();
            const userData = response.data;
            if (userData.is_guest) {
                setError("Sei in modalità Ospite. Questa pagina è solo per gli utenti registrati. Accedi o Registrati!");
                setUserProfile(null); // Non mostrare i dati guest qui
            } else {
                setUserProfile(userData);
                setGender(userData.gender);
                setAge(userData.age);
                setWeight(userData.weight_kg);
                setHeight(userData.height_cm);
                setProfilePicUrl(userData.profile_picture_url || '');
                setError(null);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore nel caricamento del profilo. Sei loggato?');
            console.error("Profile fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updatedData = {
                gender,
                age,
                weight_kg: weight,
                height_cm: height,
                profile_picture_url: profilePicUrl
            };
            const response = await auth.updateProfile(updatedData);
            setUserProfile(response.data.user); // Aggiorna il profilo con i dati freschi
            alert('Profilo aggiornato con successo!');
            setIsEditing(false); // Esci dalla modalità di modifica
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore nell\'aggiornamento del profilo.');
            console.error("Profile update error:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center text-accent-red text-xl animate-pulse mt-16">Caricamento del tuo profilo di battaglia...</div>;
    if (error) return <div className="text-center text-red-400 text-lg p-4 bg-dark-card rounded-lg">{error}</div>;
    if (!userProfile) return <div className="text-center text-gray-500 text-lg mt-16">Accedi o Registrati per visualizzare il tuo profilo!</div>;


    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in">
            <h1 className="text-4xl font-extrabold text-accent-red text-center uppercase tracking-widest">
                Il Tuo Profilo, {userProfile.username}!
            </h1>

            <div className="bg-dark-card p-8 rounded-lg shadow-xl border border-accent-blue text-center animate-pop-in">
                <div className="flex flex-col items-center mb-6">
                    <img 
                        src={userProfile.profile_picture_url || 'https://via.placeholder.com/150/0000FF/FFFFFF?text=User'} 
                        alt="Foto Profilo" 
                        className="w-32 h-32 rounded-full object-cover border-4 border-accent-red shadow-lg mb-4" 
                    />
                    <h2 className="text-3xl font-bold text-gray-200">{userProfile.username}</h2>
                    <p className="text-gray-400 text-lg">{userProfile.email}</p>
                </div>

                {!isEditing ? (
                    <div className="space-y-4 text-left">
                        <div className="flex items-center text-gray-300 text-lg">
                            <IdentificationIcon className="h-6 w-6 mr-3 text-accent-blue" />
                            <span>Sesso: <span className="font-semibold">{userProfile.gender === 'M' ? 'Uomo' : 'Donna'}</span></span>
                        </div>
                        <div className="flex items-center text-gray-300 text-lg">
                            <CakeIcon className="h-6 w-6 mr-3 text-accent-blue" />
                            <span>Età: <span className="font-semibold">{userProfile.age} anni</span></span>
                        </div>
                        <div className="flex items-center text-gray-300 text-lg">
                            <ScaleIcon className="h-6 w-6 mr-3 text-accent-blue" />
                            <span>Peso: <span className="font-semibold">{userProfile.weight_kg} kg</span></span>
                        </div>
                        <div className="flex items-center text-gray-300 text-lg">
                            <ArrowsRightLeftIcon className="h-6 w-6 mr-3 text-accent-blue" />
                            <span>Altezza: <span className="font-semibold">{userProfile.height_cm} cm</span></span>
                        </div>
                        <div className="text-center mt-6">
                            <p className="text-xl font-bold text-accent-red">Metabolismo Basale (BMR): <span className="text-accent-green">{userProfile.bmr.toFixed(2)} Kcal/giorno</span></p>
                        </div>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="w-full mt-8 p-3 bg-accent-red hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                        >
                            Modifica Profilo
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="flex items-center bg-gray-700 p-3 rounded border border-gray-600">
                            <PhotoIcon className="h-6 w-6 mr-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="URL Immagine Profilo"
                                value={profilePicUrl}
                                onChange={(e) => setProfilePicUrl(e.target.value)}
                                className="w-full bg-transparent outline-none text-white placeholder-gray-400"
                            />
                        </div>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-blue focus:ring focus:ring-accent-blue focus:ring-opacity-50 outline-none text-white transition-all duration-300"
                        >
                            <option value="M">Uomo</option>
                            <option value="F">Donna</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Età"
                            value={age}
                            onChange={(e) => setAge(parseInt(e.target.value))}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-blue focus:ring focus:ring-accent-blue focus:ring-opacity-50 outline-none text-white placeholder-gray-400"
                            min="1" required
                        />
                        <input
                            type="number"
                            placeholder="Peso (kg)"
                            value={weight}
                            onChange={(e) => setWeight(parseFloat(e.target.value))}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-blue focus:ring focus:ring-accent-blue focus:ring-opacity-50 outline-none text-white placeholder-gray-400"
                            min="1" step="0.1" required
                        />
                        <input
                            type="number"
                            placeholder="Altezza (cm)"
                            value={height}
                            onChange={(e) => setHeight(parseFloat(e.target.value))}
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-blue focus:ring focus:ring-accent-blue focus:ring-opacity-50 outline-none text-white placeholder-gray-400"
                            min="1" step="0.1" required
                        />
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            className="w-full p-3 bg-accent-green hover:bg-green-700 text-white font-bold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                            disabled={loading}
                        >
                            {loading ? 'Aggiornando...' : 'Salva Modifiche'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="w-full mt-2 p-3 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                        >
                            Annulla
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default UserProfilePage;