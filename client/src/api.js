import axios from 'axios';

const API_URL = 'http://localhost:5000/api';
const FOOD_API = 'https://www.themealdb.com/api/json/v1/1';

// --- Internal Backend Calls ---
export const register = (data) => axios.post(`${API_URL}/register`, data);
export const login = (data) => axios.post(`${API_URL}/login`, data);
export const saveMeal = (token, data) => 
  axios.post(`${API_URL}/meals`, data, { headers: { 'x-auth-token': token } });
export const getMeals = (token) => 
  axios.get(`${API_URL}/meals`, { headers: { 'x-auth-token': token } });
export const deleteMeal = (token, id) => 
  axios.delete(`${API_URL}/meals/${id}`, { headers: { 'x-auth-token': token } });

// --- FatSecret Nutrition Calls (Through Backend Proxy) ---
export const searchFoodNutrition = (query) => axios.get(`${API_URL}/nutrition/search?q=${query}`);
export const getFoodNutritionDetails = (fsId) => axios.get(`${API_URL}/nutrition/id/${fsId}`);

// --- Legacy Food API Calls (TheMealDB - For Daily Recs) ---
export const getRandomMeal = () => axios.get(`${FOOD_API}/random.php`);
export const getMealsByCategory = (cat) => axios.get(`${FOOD_API}/filter.php?c=${cat}`);
export const getMealById = (id) => axios.get(`${FOOD_API}/lookup.php?i=${id}`);
export const getMealsByName = (name) => axios.get(`${FOOD_API}/search.php?s=${name}`);