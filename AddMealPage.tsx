import React, { useState, useEffect } from 'react';
import { food, meals } from '../api/backendApi';
import { PlusCircleIcon, MagnifyingGlassIcon, QrCodeIcon, XCircleIcon } from '@heroicons/react/24/solid';

const AddMealPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedFoodItems, setSelectedFoodItems] = useState<any[]>([]);
    const [mealDescription, setMealDescription] = useState('Pasto del Guerriero');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [totalCurrentMealKcal, setTotalCurrentMealKcal] = useState(0);

    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchTerm.length > 2) {
                setLoading(true);
                try {
                    const response = await food.search(searchTerm);
                    setSearchResults(response.data);
                    setError(null);
                } catch (err: any) {
                    setError(err.response?.data?.message || 'Errore nella ricerca alimenti.');
                    setSearchResults([]);
                } finally {
                    setLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delaySearch);
    }, [searchTerm]);

    const handleBarcodeSearch = async () => {
        if (!barcodeInput) {
            setError("Inserisci un codice a barre!");
            return;
        }
        setLoading(true);
        try {
            const response = await food.getByBarcode(barcodeInput);
            const foundItem = response.data;
            handleAddFoodItem({ ...foundItem, grams_consumed: 100 });
            setBarcodeInput('');
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Codice a barre non trovato o errore. Riprova!');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFoodItem = (item: any) => {
        const grams = item.grams_consumed || 100;
        const kcal = (item.kcal_per_100g / 100) * grams;
        const existingItemIndex = selectedFoodItems.findIndex(selItem => selItem.food_item_id === item.id);
        
        if (existingItemIndex > -1) {
            const updatedItems = [...selectedFoodItems];
            updatedItems[existingItemIndex].grams_consumed += grams;
            updatedItems[existingItemIndex].kcal_total_item += kcal;
            setSelectedFoodItems(updatedItems);
        } else {
            setSelectedFoodItems(prev => [
                ...prev, 
                { 
                    food_item_id: item.id, 
                    grams_consumed: grams, 
                    kcal_total_item: kcal, 
                    food_item_details: item 
                }
            ]);
        }
        setSearchTerm('');
        setSearchResults([]);
    };

    const handleUpdateGrams = (index: number, newGrams: number) => {
        if (newGrams <= 0) {
            handleRemoveFoodItem(index);
            return;
        }
        const updatedItems = [...selectedFoodItems];
        const item = updatedItems[index];
        const foodDetails = item.food_item_details;

        item.grams_consumed = newGrams;
        item.kcal_total_item = (foodDetails.kcal_per_100g / 100) * newGrams;
        
        setSelectedFoodItems(updatedItems);
    };

    const handleRemoveFoodItem = (index: number) => {
        setSelectedFoodItems(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        const total = selectedFoodItems.reduce((sum, item) => sum + item.kcal_total_item, 0);
        setTotalCurrentMealKcal(total);
    }, [selectedFoodItems]);

    const handleSubmitMeal = async () => {
        if (selectedFoodItems.length === 0) {
            setError("Aggiungi almeno un alimento per registrare il pasto!");
            return;
        }
        setLoading(true);
        try {
            const mealData = {
                description: mealDescription,
                items: selectedFoodItems.map(item => ({
                    food_item_id: item.food_item_id,
                    grams_consumed: item.grams_consumed
                }))
            };
            await meals.add(mealData);
            alert('Pasto registrato! Il tuo debito è aggiornato!');
            setSelectedFoodItems([]);
            setMealDescription('Pasto del Guerriero');
            setTotalCurrentMealKcal(0);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Errore nella registrazione del pasto. Sei sicuro di aver mangiato davvero?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-fade-in">
            <h1 className="text-4xl font-extrabold text-accent-red text-center uppercase tracking-widest">
                Aggiungi il Tuo Peccato Culinario!
            </h1>

            {error && <div className="text-red-400 text-lg text-center bg-dark-card p-4 rounded-lg">{error}</div>}

            <div className="bg-dark-card p-6 rounded-lg shadow-xl border border-gray-700 animate-pop-in">
                <h2 className="text-2xl font-bold text-gray-200 mb-4 flex items-center">
                    <MagnifyingGlassIcon className="h-7 w-7 text-gray-400 mr-2" />
                    Cerca il Tuo Vizio:
                </h2>
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Cerca un alimento (es. pizza, pollo, tiramisu)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300"
                    />
                    {loading && searchTerm.length > 2 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            Caricamento...
                        </div>
                    )}
                </div>

                {searchResults.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg bg-gray-700 p-2 scrollbar-thin scrollbar-thumb-accent-red scrollbar-track-gray-800">
                        {searchResults.map((item) => (
                            <div 
                                key={item.id} 
                                className="flex items-center p-3 mb-2 rounded-lg bg-gray-600 hover:bg-gray-500 cursor-pointer transition-colors duration-200"
                                onClick={() => handleAddFoodItem(item)}
                            >
                                {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-full mr-4 border border-gray-500" />}
                                <div className="flex-grow">
                                    <p className="font-semibold text-lg text-white">{item.name}</p>
                                    <p className="text-sm text-gray-300">{item.kcal_per_100g.toFixed(1)} Kcal / 100g</p>
                                </div>
                                <PlusCircleIcon className="h-7 w-7 text-accent-green hover:text-green-300" />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-dark-card p-6 rounded-lg shadow-xl border border-accent-blue animate-pop-in">
                <h2 className="text-2xl font-bold text-gray-200 mb-4 flex items-center">
                    <QrCodeIcon className="h-7 w-7 text-accent-blue mr-2" />
                    Scansiona il Codice a Barre del Demone:
                </h2>
                <div className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Inserisci codice a barre manualmente..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        className="flex-grow p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-blue focus:ring focus:ring-accent-blue focus:ring-opacity-50 outline-none text-white placeholder-gray-400 transition-all duration-300"
                    />
                    <button
                        onClick={handleBarcodeSearch}
                        className="bg-accent-blue hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95"
                        disabled={loading}
                    >
                        {loading ? 'Cercando...' : 'Cerca'}
                    </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                    (Nota: la scansione diretta da fotocamera richiede un'app mobile nativa, qui simuliamo l'input manuale del codice)
                </p>
            </div>

            <div className="bg-dark-card p-6 rounded-lg shadow-xl border border-accent-red animate-slide-in-up">
                <h2 className="text-2xl font-bold text-gray-200 mb-4 flex items-center">
                    <PlusIcon className="h-7 w-7 text-accent-red mr-2" />
                    Il Tuo Pasto Corrente (Il Tuo Debito!)
                </h2>
                <input
                    type="text"
                    placeholder="Descrizione del pasto (es. Pranzo, Cena del Sabato)"
                    value={mealDescription}
                    onChange={(e) => setMealDescription(e.target.value)}
                    className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none text-white placeholder-gray-400 mb-4 transition-all duration-300"
                />

                {selectedFoodItems.length === 0 ? (
                    <p className="text-gray-400 text-center text-lg py-8">Aggiungi alimenti per iniziare il tuo pasto!</p>
                ) : (
                    <div className="space-y-4">
                        {selectedFoodItems.map((item, index) => (
                            <div key={item.food_item_id} className="flex items-center bg-gray-700 p-3 rounded-lg shadow-md relative group">
                                {item.food_item_details.image_url && <img src={item.food_item_details.image_url} alt={item.food_item_details.name} className="w-16 h-16 object-cover rounded-md mr-4 border border-gray-600" />}
                                <div className="flex-grow">
                                    <p className="font-semibold text-xl text-white">{item.food_item_details.name}</p>
                                    <div className="flex items-center mt-1">
                                        <input
                                            type="number"
                                            value={item.grams_consumed}
                                            onChange={(e) => handleUpdateGrams(index, parseFloat(e.target.value))}
                                            className="w-24 p-1 rounded bg-gray-600 border border-gray-500 text-white text-center mr-2 focus:border-accent-red focus:ring focus:ring-accent-red focus:ring-opacity-50 outline-none"
                                            min="1"
                                            step="1"
                                        />
                                        <span className="text-gray-300">g</span>
                                        <span className="ml-4 text-lg font-bold text-red-300">{item.kcal_total_item.toFixed(1)} Kcal</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleRemoveFoodItem(index)}
                                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <XCircleIcon className="h-6 w-6" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="text-center mt-6 p-4 bg-gray-700 rounded-lg border border-accent-red shadow-inner">
                    <p className="text-2xl font-bold text-red-400 uppercase tracking-wide">Totale Kcal del Pasto:</p>
                    <p className="text-5xl font-extrabold text-accent-red mt-2 animate-bounce-once">{totalCurrentMealKcal.toFixed(1)}</p>
                </div>

                <button
                    onClick={handleSubmitMeal}
                    className="w-full mt-6 p-4 bg-accent-green hover:bg-green-700 text-white text-2xl font-extrabold rounded-lg shadow-xl uppercase tracking-wider transition-all duration-300 transform hover:scale-105 active:scale-95 group"
                    disabled={loading || selectedFoodItems.length === 0}
                >
                    {loading ? 'Registrando il tuo debito...' : 'Registra Pasto e Affronta il Giudizio!'}
                    <span className="ml-2 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
                </button>
            </div>
        </div>
    );
};

export default AddMealPage;