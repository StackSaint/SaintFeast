import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getRandomMeal, getMealsByCategory, saveMeal, getMeals, getMealsByName, getMealById, deleteMeal } from '../api';
import { Calendar, Plus, LogOut, Utensils, ChefHat, Search, X, Clock, Flame, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

  // Modal & Date State
  const [selectedMealDetail, setSelectedMealDetail] = useState(null); 
  const [chosenDate, setChosenDate] = useState(new Date().toISOString().split('T')[0]); 

  useEffect(() => {
    loadUserData();
    loadDailyCatalog();
  }, []);

  // --- NAVIGATION HELPERS ---
  const changeView = (newView) => {
    setView(newView);
    setSearchQuery('');
    setSearchResults([]);
  };

  const goHome = () => {
    changeView('builder');
    setSelectedBase('');
    setSelectedProtein('');
  };

  // --- DATA LOADING ---
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

  // --- SEARCH ---
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await getMealsByName(searchQuery);
      setSearchResults(res.data.meals || []);
      setView('search'); 
    } catch (err) { toast.error("Could not find food"); }
  };

  const handleFilterSearch = async () => {
    if (!selectedProtein) return;
    try {
      const res = await getMealsByCategory(selectedProtein);
      setSearchResults(res.data.meals.slice(0, 10) || []);
      setView('search'); 
    } catch (err) { console.error(err); }
  };

  // --- SAVE LOGIC ---
  const handleSave = async (e, meal, isCombo, specificDate = null) => {
    if (e) e.stopPropagation();
    
    const dateToSave = specificDate || new Date().toISOString().split('T')[0];

    // Check Duplicates
    const alreadyExists = savedMeals.some(
      saved => saved.mealId === meal.idMeal && saved.date === dateToSave
    );

    if (alreadyExists) {
      toast.error("Already planned for that date!", { 
        icon: '📅',
        style: { borderRadius: '10px', background: '#333', color: '#fff' }
      });
      return; 
    }

    // Save with nice loading effect
    toast.promise(
      saveMeal(token, {
        date: dateToSave,
        base: selectedBase || 'None',
        mealId: meal.idMeal,
        mealName: meal.strMeal,
        mealThumb: meal.strMealThumb,
        isSavedCombo: isCombo
      }),
      {
        loading: 'Saving to calendar...',
        success: <b>Added to {dateToSave}!</b>,
        error: <b>Could not save.</b>,
      },
      {
        style: { minWidth: '250px', borderRadius: '10px', background: '#333', color: '#fff' },
      }
    );
    
    setTimeout(loadUserData, 1000);
  };

  // --- NEW DELETE LOGIC (No Browser Popup) ---
  const triggerDelete = (e, mealId) => {
    e.stopPropagation();
    
    // Custom Toast with Buttons
    toast((t) => (
      <div className="flex flex-col gap-2 items-center">
        <span className="font-bold">Delete this meal?</span>
        <div className="flex gap-2">
          <button 
            onClick={() => confirmDelete(mealId, t.id)}
            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
          >
            Yes, Delete
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 4000, icon: '🗑️', style: { borderRadius: '12px', background: '#222', color: '#fff', border: '1px solid #444' } });
  };

  const confirmDelete = async (mealId, toastId) => {
    toast.dismiss(toastId); // Close the question toast
    
    // Optimistic Update
    const originalMeals = [...savedMeals];
    setSavedMeals(savedMeals.filter(m => m._id !== mealId));

    try {
      await deleteMeal(token, mealId);
      toast.success("Meal removed", { style: { background: '#333', color: '#fff' } });
    } catch (err) {
      setSavedMeals(originalMeals); // Revert if failed
      toast.error("Failed to delete", { style: { background: '#333', color: '#fff' } });
    }
  };

  // --- OPEN MODAL ---
  const openMealDetails = async (mealId) => {
    try {
      const res = await getMealById(mealId);
      setSelectedMealDetail(res.data.meals[0]);
      setChosenDate(new Date().toISOString().split('T')[0]); 
    } catch (err) { toast.error("Failed to load details"); }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-6">
          <div onClick={goHome} className="cursor-pointer group">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent group-hover:scale-105 transition-transform">
              FusionFeast
            </h1>
            <p className="text-gray-400 text-sm group-hover:text-white transition-colors"></p>
          </div>

          <form onSubmit={handleSearch} className="relative w-full max-w-md">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search food..." 
              className="w-full bg-gray-800 border border-gray-700 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <div className="flex gap-3">
            <button onClick={() => changeView('builder')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${view === 'builder' ? 'bg-orange-600' : 'bg-gray-800'}`}>Builder</button>
            <button onClick={() => changeView('calendar')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${view === 'calendar' ? 'bg-orange-600' : 'bg-gray-800'}`}>Calendar</button>
            <button onClick={logout} className="p-2 bg-red-600/20 text-red-500 rounded-full hover:bg-red-600 hover:text-white"><LogOut size={18} /></button>
          </div>
        </header>

        {/* --- DAILY RECOMMENDATIONS --- */}
        {view === 'builder' && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Flame className="text-orange-500" /> Daily Top Picks</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {dailyCatalog.map(meal => (
                <motion.div 
                  key={meal.idMeal} 
                  whileHover={{ scale: 1.05 }}
                  onClick={() => openMealDetails(meal.idMeal)}
                  className="min-w-[200px] bg-gray-800 rounded-xl overflow-hidden cursor-pointer shadow-lg border border-gray-700"
                >
                  <img src={meal.strMealThumb} className="w-full h-32 object-cover" alt={meal.strMeal} />
                  <div className="p-3">
                    <h3 className="font-bold text-sm truncate">{meal.strMeal}</h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">{meal.strArea} • {meal.strCategory}</p>
                  </div>
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
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400"><Utensils size={18}/> Choose Base</h3>
                    <div className="flex gap-3 flex-wrap">
                      {BASES.map(base => (
                        <button key={base} onClick={() => setSelectedBase(base)} className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedBase === base ? 'bg-white text-black font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>{base}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-orange-400"><ChefHat size={18}/> Choose Protein</h3>
                    <div className="flex gap-3 flex-wrap items-center">
                      {PROTEINS.map(prot => (
                        <button key={prot} onClick={() => setSelectedProtein(prot)} className={`px-4 py-2 rounded-lg text-sm transition-all ${selectedProtein === prot ? 'bg-orange-600 text-white font-bold' : 'bg-gray-700 hover:bg-gray-600'}`}>{prot}</button>
                      ))}
                      <button onClick={handleFilterSearch} disabled={!selectedProtein} className="ml-auto px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold disabled:opacity-50">Show Matches</button>
                    </div>
                  </div>
                </div>
              )}

              {/* SEARCH RESULTS */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {searchResults.map(meal => (
                  <motion.div 
                    layout 
                    key={meal.idMeal} 
                    onClick={() => openMealDetails(meal.idMeal)}
                    className="bg-gray-800 rounded-xl overflow-hidden shadow-xl hover:ring-2 hover:ring-orange-500 transition-all cursor-pointer group relative"
                  >
                    <img src={meal.strMealThumb} alt={meal.strMeal} className="w-full h-40 object-cover" />
                    <div className="p-4">
                      <h3 className="font-bold text-sm line-clamp-2">{meal.strMeal}</h3>
                    </div>
                    <button 
                      onClick={(e) => handleSave(e, meal, true)} 
                      className="absolute top-2 right-2 bg-white text-black p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100"
                      title="Quick Add for Today"
                    >
                      <Plus size={16} />
                    </button>
                  </motion.div>
                ))}
              </div>
              {view === 'search' && searchResults.length === 0 && <p className="text-center text-gray-500 mt-10">Try searching for something else...</p>}

            </motion.div>
          ) : (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Calendar className="text-orange-500"/> Your Meal Calendar</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedMeals
                  .sort((a, b) => new Date(a.date) - new Date(b.date)) 
                  .map(plan => (
                  <div key={plan._id} onClick={() => openMealDetails(plan.mealId)} className="group relative bg-gray-800 p-4 rounded-xl border border-gray-700 flex gap-4 items-center shadow-md hover:bg-gray-750 cursor-pointer hover:border-orange-500 transition-colors">
                     
                     {/* TRASH BUTTON (UPDATED) */}
                     <button 
                        onClick={(e) => triggerDelete(e, plan._id)}
                        className="absolute top-2 right-2 p-2 bg-red-500/10 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 hover:text-white"
                        title="Remove Meal"
                      >
                        <Trash2 size={16} />
                      </button>

                     <img src={plan.mealThumb} className="w-16 h-16 rounded-lg object-cover" />
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className={`text-[10px] font-mono px-2 py-1 rounded ${plan.date === new Date().toISOString().split('T')[0] ? 'bg-green-900 text-green-300' : 'bg-gray-900 text-gray-400'}`}>
                           {plan.date}
                         </span>
                       </div>
                       <h4 className="font-bold text-sm truncate w-32 md:w-40">{plan.mealName}</h4>
                       <p className="text-xs text-gray-400 mt-1">Base: <span className="text-orange-300">{plan.base}</span></p>
                     </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- RECIPE MODAL --- */}
        <AnimatePresence>
          {selectedMealDetail && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setSelectedMealDetail(null)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-gray-700 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative">
                  <img src={selectedMealDetail.strMealThumb} className="w-full h-64 object-cover" alt="Detail" />
                  <button onClick={() => setSelectedMealDetail(null)} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-red-600 transition-colors"><X size={20}/></button>
                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-900 to-transparent p-6 pt-20">
                    <h2 className="text-3xl font-bold">{selectedMealDetail.strMeal}</h2>
                    <p className="text-orange-400 font-semibold">{selectedMealDetail.strArea} • {selectedMealDetail.strCategory}</p>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Utensils size={18}/> Ingredients</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Array.from({ length: 20 }).map((_, i) => {
                        const ingredient = selectedMealDetail[`strIngredient${i+1}`];
                        const measure = selectedMealDetail[`strMeasure${i+1}`];
                        return ingredient ? (
                          <div key={i} className="bg-gray-800 p-2 rounded text-sm text-gray-300 border border-gray-700">
                            <span className="font-bold text-white">{ingredient}</span> 
                            {measure && <span className="text-xs block text-gray-500">{measure}</span>}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Clock size={18}/> Instructions</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {selectedMealDetail.strInstructions}
                    </p>
                  </div>

                  <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                     <div className="flex flex-col gap-1 w-full md:w-auto">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Plan Date</label>
                        <input 
                          type="date" 
                          value={chosenDate}
                          onChange={(e) => setChosenDate(e.target.value)}
                          className="bg-gray-900 text-white p-2 rounded border border-gray-600 focus:border-orange-500 focus:outline-none"
                        />
                     </div>

                     <div className="flex gap-3 w-full md:w-auto">
                        <a href={selectedMealDetail.strYoutube} target="_blank" rel="noreferrer" className="flex-1 md:flex-none px-4 py-2 bg-red-600 rounded-lg font-bold hover:bg-red-500 transition-colors text-center text-sm flex items-center justify-center gap-2">
                          YouTube
                        </a>
                        <button 
                          onClick={(e) => { 
                            handleSave(e, selectedMealDetail, false, chosenDate); 
                            setSelectedMealDetail(null); 
                          }} 
                          className="flex-1 md:flex-none px-6 py-2 bg-green-600 rounded-lg font-bold hover:bg-green-500 transition-colors text-sm shadow-lg shadow-green-900/20"
                        >
                          Add to Calendar
                        </button>
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