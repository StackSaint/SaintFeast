import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomMeal, getMealsByCategory, saveMeal, getMeals, getMealById, deleteMeal, searchFoodNutrition, getFoodNutritionDetails, getMealsByName } from '../api';
import { Calendar, Plus, LogOut, Utensils, ChefHat, Search, X, Clock, Flame, Trash2, Frown } from 'lucide-react'; // Added Frown icon
import toast from 'react-hot-toast';
import Loader from './Loader'; // <--- IMPORT LOADER

const BASES = ['Rice', 'Potato', 'Pasta', 'Bread', 'Salad'];
const PROTEINS = ['Chicken', 'Beef', 'Seafood', 'Pork', 'Vegetarian'];

export default function Dashboard({ token, logout }) {
  const [view, setView] = useState('builder'); 
  const [selectedBase, setSelectedBase] = useState('');
  const [selectedProtein, setSelectedProtein] = useState('');
  
  // Data States
  const [dailyCatalog, setDailyCatalog] = useState([]); 
  const [searchResults, setSearchResults] = useState([]); 
  const [savedMeals, setSavedMeals] = useState([]); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [isLoading, setIsLoading] = useState(false); // <--- NEW LOADING STATE

  // Modal & Date State
  const [selectedMealDetail, setSelectedMealDetail] = useState(null); 
  const [nutritionData, setNutritionData] = useState(null); 
  const [chosenDate, setChosenDate] = useState(new Date().toISOString().split('T')[0]); 

  useEffect(() => {
    loadUserData();
    loadDailyCatalog();
  }, []);

  const changeView = (newView) => {
    setView(newView);
    setSearchQuery('');
    setSearchResults([]);
  };

  const goHome = () => {
    changeView('builder');
    setSelectedBase('');
    setSelectedProtein('');
    setSearchResults([]);
  };

  const loadDailyCatalog = async () => {
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('dailyMeals');
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (parsed.date === today) {
        setDailyCatalog(parsed.meals);
        return;
      }
    }

    try {
      const promises = Array(5).fill().map(() => getRandomMeal());
      const results = await Promise.all(promises);
      const meals = results.map(r => r.data.meals[0]);
      localStorage.setItem('dailyMeals', JSON.stringify({ date: today, meals }));
      setDailyCatalog(meals);
    } catch (err) { console.error(err); }
  };

  const loadUserData = async () => {
    try {
      const res = await getMeals(token);
      setSavedMeals(res.data);
    } catch (err) { console.error(err); }
  };

  // --- ROBUST SEARCH ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setIsLoading(true); // START LOADING
    setSearchResults([]); // Clear previous results

    // 1. Try FATSECRET
    try {
      const res = await searchFoodNutrition(searchQuery);
      let foods = res.data.foods?.food || [];
      if (!Array.isArray(foods)) foods = [foods];
      
      if (foods.length > 0) {
        const formattedFoods = foods.map(f => ({
          idMeal: f.food_id,
          strMeal: f.food_name,
          strMealThumb: 'https://www.fatsecret.com/static/images/icons/default_food_icon.png', 
          description: f.food_description, 
          isFatSecret: true 
        }));
        setSearchResults(formattedFoods);
        setView('search');
        setIsLoading(false); // STOP LOADING
        return;
      }
    } catch (err) {
      console.warn("FatSecret blocked, switching...");
    }

    // 2. BACKUP: TheMealDB
    try {
      const res = await getMealsByName(searchQuery);
      const foods = res.data.meals || [];

      if (foods.length > 0) {
         setSearchResults(foods);
         setView('search');
         toast("Using Recipe Backup", { icon: '📖', style: { fontSize: '12px', background: '#333', color: '#fff' } });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false); // ALWAYS STOP LOADING
      setView('search');   // Ensure we are in search view even if empty
    }
  };

  const handleFilterSearch = async () => {
    if (!selectedProtein) return;
    setIsLoading(true);
    try {
      const res = await getMealsByCategory(selectedProtein);
      setSearchResults(res.data.meals.slice(0, 10) || []);
      setView('search'); 
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  const handleSave = async (e, meal, isCombo, specificDate = null) => {
    if (e) e.stopPropagation();
    const dateToSave = specificDate || new Date().toISOString().split('T')[0];

    const alreadyExists = savedMeals.some(
      saved => saved.mealId === meal.idMeal && saved.date === dateToSave
    );

    if (alreadyExists) {
      toast.error("Already planned for that date!", { icon: '📅', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
      return; 
    }

    const mealData = {
      date: dateToSave,
      base: selectedBase || 'None',
      mealId: meal.idMeal,
      mealName: meal.strMeal,
      mealThumb: meal.strMealThumb,
      isSavedCombo: isCombo,
      calories: nutritionData ? nutritionData.cal : 0,
      protein: nutritionData ? nutritionData.protein : 0,
      fat: nutritionData ? nutritionData.fat : 0,
      carbs: nutritionData ? nutritionData.carbs : 0,
    };

    toast.promise(
      saveMeal(token, mealData),
      {
        loading: 'Saving...',
        success: <b>Added to {dateToSave}!</b>,
        error: <b>Could not save.</b>,
      },
      { style: { minWidth: '250px', borderRadius: '10px', background: '#333', color: '#fff' } }
    );
    setTimeout(loadUserData, 1000);
  };

  const triggerDelete = (e, mealId) => {
    e.stopPropagation();
    toast((t) => (
      <div className="flex flex-col gap-2 items-center">
        <span className="font-bold">Delete this meal?</span>
        <div className="flex gap-2">
          <button onClick={() => confirmDelete(mealId, t.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">Yes</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">Cancel</button>
        </div>
      </div>
    ), { duration: 4000, icon: '🗑️', style: { borderRadius: '12px', background: '#222', color: '#fff', border: '1px solid #444' } });
  };

  const confirmDelete = async (mealId, toastId) => {
    toast.dismiss(toastId);
    const originalMeals = [...savedMeals];
    setSavedMeals(savedMeals.filter(m => m._id !== mealId));
    try {
      await deleteMeal(token, mealId);
      toast.success("Meal removed", { style: { background: '#333', color: '#fff' } });
    } catch (err) {
      setSavedMeals(originalMeals);
      toast.error("Failed to delete");
    }
  };

  // --- OPEN MODAL LOGIC ---
  const openMealDetails = async (meal) => {
    setSelectedMealDetail(meal);
    setNutritionData(null); 
    setChosenDate(new Date().toISOString().split('T')[0]);

    if (meal.calories && meal.calories > 0) {
      setNutritionData({
        cal: meal.calories,
        protein: meal.protein,
        fat: meal.fat,
        carbs: meal.carbs
      });
    }

    if (meal.isFatSecret) {
      try {
        const res = await getFoodNutritionDetails(meal.idMeal);
        const details = res.data.food;
        const servings = details.servings.serving;
        const serving = Array.isArray(servings) ? servings[0] : servings; 
        
        setNutritionData({
          cal: Math.round(serving.calories) || 0,
          protein: Math.round(serving.protein) || 0,
          fat: Math.round(serving.fat) || 0,
          carbs: Math.round(serving.carbohydrate) || 0
        });
        
        setSelectedMealDetail({
          ...meal,
          strMealThumb: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3', 
          strInstructions: `Serving Size: ${serving.serving_description}\n\nNote: This is a generic food item from FatSecret, so it does not have step-by-step cooking instructions.`,
          isFatSecret: true
        });
      } catch (err) { toast.error("Could not load nutrition"); }
    } else {
      try {
        const res = await getMealById(meal.idMeal || meal.mealId);
        setSelectedMealDetail(res.data.meals[0]);
      } catch (err) { toast.error("Failed to load details"); }
    }
  };

  const renderIngredients = () => {
    if (!selectedMealDetail || selectedMealDetail.isFatSecret) return null;
    let ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = selectedMealDetail[`strIngredient${i}`];
      const measure = selectedMealDetail[`strMeasure${i}`];
      if (ingredient && ingredient.trim() !== "") {
        ingredients.push({ name: ingredient, measure: measure });
      }
    }
    if (ingredients.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Utensils size={18}/> Ingredients</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {ingredients.map((item, i) => (
            <div key={i} className="bg-gray-800 p-2 rounded text-sm text-gray-300 border border-gray-700">
              <span className="font-bold text-white">{item.name}</span> 
              {item.measure && <span className="text-xs block text-gray-500">{item.measure}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-6">
          <div onClick={goHome} className="cursor-pointer group">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent group-hover:scale-105 transition-transform">SaintFeast</h1>
          </div>
          <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" placeholder="Search food..." 
              className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
          <div className="flex gap-3">
            <button onClick={() => changeView('builder')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${view === 'builder' ? 'bg-orange-600' : 'bg-gray-800'}`}>Builder</button>
            <button onClick={() => changeView('calendar')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${view === 'calendar' ? 'bg-orange-600' : 'bg-gray-800'}`}>Calendar</button>
            <button onClick={logout} className="p-2 bg-red-600/20 text-red-500 rounded-full hover:bg-red-600 hover:text-white"><LogOut size={18} /></button>
          </div>
        </header>

        {/* DAILY PICKS */}
        {view === 'builder' && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Flame className="text-orange-500" /> Daily Top Picks</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {dailyCatalog.map(meal => (
                <motion.div key={meal.idMeal} whileHover={{ scale: 1.05 }} onClick={() => openMealDetails(meal)} className="min-w-[200px] bg-gray-800 rounded-xl overflow-hidden cursor-pointer shadow-lg border border-gray-700">
                  <img src={meal.strMealThumb} className="w-full h-32 object-cover" alt={meal.strMeal} />
                  <div className="p-3"><h3 className="font-bold text-sm truncate">{meal.strMeal}</h3><p className="text-xs text-gray-400 mt-1 truncate">{meal.strArea} • {meal.strCategory}</p></div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'builder' || view === 'search' ? (
            <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              
              {/* BUILDER */}
              {view === 'builder' && (
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 mb-8 backdrop-blur-sm">
                  <div className="mb-6"><h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400"><Utensils size={18}/> Choose Base</h3><div className="flex gap-3 flex-wrap">{BASES.map(base => (<button key={base} onClick={() => setSelectedBase(base)} className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedBase === base ? 'bg-white text-black font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>{base}</button>))}</div></div>
                  <div><h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400"><ChefHat size={18}/> Choose Protein</h3><div className="flex gap-3 flex-wrap items-center">{PROTEINS.map(prot => (<button key={prot} onClick={() => setSelectedProtein(prot)} className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedProtein === prot ? 'bg-orange-600 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>{prot}</button>))}<button onClick={handleFilterSearch} disabled={!selectedProtein} className="ml-auto px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold disabled:opacity-50">Show Matches</button></div></div>
                </div>
              )}

              {/* LOADING STATE */}
              {isLoading && <Loader />}

              {/* SEARCH RESULTS */}
              {!isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                  {searchResults.map(meal => (
                    <motion.div layout key={meal.idMeal} onClick={() => openMealDetails(meal)} className="bg-gray-800 rounded-xl overflow-hidden shadow-xl hover:ring-2 hover:ring-orange-500 transition-all cursor-pointer group relative">
                      <div className="h-40 bg-gray-700 flex items-center justify-center overflow-hidden">
                         {meal.isFatSecret ? (
                           <div className="text-center p-2">
                              <span className="text-4xl">🥗</span>
                              <p className="text-[10px] text-gray-400 mt-2 line-clamp-2">{meal.description?.split('|')[0]}</p>
                           </div>
                         ) : (
                           <img src={meal.strMealThumb} alt={meal.strMeal} className="w-full h-full object-cover" />
                         )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-sm line-clamp-2">{meal.strMeal}</h3>
                        {meal.isFatSecret && <span className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded mt-1 inline-block">Nutrition Available</span>}
                      </div>
                      <button onClick={(e) => handleSave(e, meal, true)} className="absolute top-2 right-2 bg-white text-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100" title="Quick Add for Today"><Plus size={16} /></button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* CUSTOM "NOT FOUND" STATE */}
              {view === 'search' && !isLoading && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center mt-20 text-gray-500 opacity-80">
                  <Frown size={60} className="mb-4 text-gray-600" />
                  <h3 className="text-xl font-bold mb-1">No food found</h3>
                  <p className="text-sm">We checked the pantry, but couldn't find "{searchQuery}".</p>
                  <p className="text-xs mt-2 text-gray-600">Try searching for generic terms like "Chicken" or "Pasta"</p>
                </div>
              )}

            </motion.div>
          ) : (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-orange-500"/> Your Meal Calendar</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedMeals.sort((a, b) => new Date(a.date) - new Date(b.date)).map(plan => (
                  <div key={plan._id} onClick={() => openMealDetails(plan)} className="group relative bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4 items-center shadow-md hover:bg-gray-750 cursor-pointer hover:border-orange-500 transition-colors">
                     <button onClick={(e) => triggerDelete(e, plan._id)} className="absolute top-2 right-2 p-2 bg-red-500/10 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:text-white" title="Remove Meal"><Trash2 size={16} /></button>
                     <img src={plan.mealThumb} className="w-16 h-16 rounded-lg object-cover" />
                     <div>
                       <div className="flex items-center gap-2 mb-1"><span className={`text-[10px] font-mono px-2 py-1 rounded ${plan.date === new Date().toISOString().split('T')[0] ? 'bg-green-900 text-green-300' : 'bg-gray-900 text-gray-400'}`}>{plan.date}</span></div>
                       <h4 className="font-bold text-sm truncate w-32 md:w-40">{plan.mealName}</h4>
                       
                       {plan.calories > 0 ? (
                         <p className="text-xs text-green-400 mt-1 font-bold">⚡ {plan.calories} kcal</p>
                       ) : (
                         <p className="text-xs text-gray-500 mt-1 italic">Recipe Item</p>
                       )}
                     </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- MODAL --- */}
        <AnimatePresence>
          {selectedMealDetail && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedMealDetail(null)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
                
                <div className="relative">
                  <img src={selectedMealDetail.strMealThumb} className="w-full h-64 object-cover" alt="Detail" />
                  <button onClick={() => setSelectedMealDetail(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition-colors"><X size={20}/></button>
                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-900 to-transparent p-6 pt-20">
                    <h2 className="text-3xl font-bold">{selectedMealDetail.strMeal}</h2>
                    <p className="text-orange-400 font-semibold">{selectedMealDetail.strArea} • {selectedMealDetail.strCategory}</p>
                  </div>
                </div>
                
                <div className="p-8">
                  {/* --- NUTRITION SECTION --- */}
                  {nutritionData && (
                    <div className="mb-8 grid grid-cols-4 gap-2 text-center">
                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
                        <span className="block text-3xl font-extrabold text-orange-500">{nutritionData.cal}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Calories</span>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
                        <span className="block text-2xl font-bold text-blue-400">{nutritionData.protein}g</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Protein</span>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
                        <span className="block text-2xl font-bold text-yellow-400">{nutritionData.fat}g</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Fat</span>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-lg">
                        <span className="block text-2xl font-bold text-green-400">{nutritionData.carbs}g</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Carbs</span>
                      </div>
                    </div>
                  )}

                  {/* --- INGREDIENTS SECTION --- */}
                  {renderIngredients()}

                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Clock size={18}/> Instructions</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedMealDetail.strInstructions || "No instructions available."}
                    </p>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                     <div className="flex flex-col gap-1 w-full md:w-auto">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Plan Date</label>
                        <input type="date" value={chosenDate} onChange={(e) => setChosenDate(e.target.value)} className="bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-orange-500 focus:outline-none" />
                     </div>
                     <div className="flex gap-3 w-full md:w-auto">
                        <button onClick={(e) => { handleSave(e, selectedMealDetail, false, chosenDate); setSelectedMealDetail(null); }} className="flex-1 md:flex-none px-6 py-2 bg-green-600 rounded-lg font-bold hover:bg-green-500 transition-colors text-sm shadow-lg shadow-green-900/20">Add to Calendar</button>
                     </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}