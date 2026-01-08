require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const qs = require('qs');

// Import Schemas
const { User, MealPlan } = require('./models/Schemas');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'mysecretkey123';

// --- FATSECRET CREDENTIALS ---
const FS_ID = '037b4c75166d4337a9c581785ee25e30';
const FS_SECRET = 'e5edecd77bf54487a5066066ac6c4c5d';

// Helper: Get FatSecret Token
const getFatSecretToken = async () => {
  try {
    const tokenUrl = 'https://oauth.fatsecret.com/connect/token';
    const data = qs.stringify({ grant_type: 'client_credentials', scope: 'basic' });
    const auth = Buffer.from(`${FS_ID}:${FS_SECRET}`).toString('base64');
    
    const res = await axios.post(tokenUrl, data, {
      headers: { 
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      }
    });
    return res.data.access_token;
  } catch (err) {
    console.error("❌ Token Error:", err.message);
    return null;
  }
};

// --- DATABASE CONNECTION ---
// Make sure this password matches your real MongoDB password
mongoose.connect('mongodb+srv://saintgame1547_db_user:QDiP5ZHcyPSzjaxu@cluster0.74j2h66.mongodb.net/food_app?appName=Cluster0')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// --- ROUTES ---

// 1. FATSECRET PROXY: Search Food
app.get('/api/nutrition/search', async (req, res) => {
  const query = req.query.q;
  console.log(`🔍 Searching for: "${query}"`);

  try {
    const token = await getFatSecretToken();
    if (!token) return res.status(500).json({ msg: 'Failed to get API Token' });

    const response = await axios.get('https://platform.fatsecret.com/rest/server.api', {
      headers: { Authorization: `Bearer ${token}` },
      params: { method: 'foods.search', format: 'json', search_expression: query, max_results: 50 }
    });

    // DEBUG LOG: Print what FatSecret actually sent back
    // console.log("📦 FatSecret Response:", JSON.stringify(response.data, null, 2));

    // CHECK FOR HIDDEN ERRORS (FatSecret sometimes returns 200 OK with an error body)
    if (response.data.error) {
        console.error("❌ FatSecret API Error:", response.data.error.message);
        return res.status(400).json({ error: response.data.error });
    }

    res.json(response.data);
  } catch (err) {
    console.error("❌ Search Route Error:", err.message);
    res.status(500).send('Server Error');
  }
});

// 2. FATSECRET PROXY: Get Details
app.get('/api/nutrition/id/:id', async (req, res) => {
  try {
    const token = await getFatSecretToken();
    const response = await axios.get('https://platform.fatsecret.com/rest/server.api', {
      headers: { Authorization: `Bearer ${token}` },
      params: { method: 'food.get.v2', format: 'json', food_id: req.params.id }
    });
    res.json(response.data);
  } catch (err) { res.status(500).send('FatSecret API Error'); }
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user = new User({ username, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, username } });
  } catch (err) { res.status(500).send('Server Error'); }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, username } });
  } catch (err) { res.status(500).send('Server Error'); }
});

// Auth Middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) { res.status(400).json({ msg: 'Invalid Token' }); }
};

// Save Meal
app.post('/api/meals', auth, async (req, res) => {
  try {
    const newMeal = new MealPlan({ ...req.body, userId: req.user.id });
    const savedMeal = await newMeal.save();
    res.json(savedMeal);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Get Meals
app.get('/api/meals', auth, async (req, res) => {
  try {
    const meals = await MealPlan.find({ userId: req.user.id });
    res.json(meals);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Delete Meal
app.delete('/api/meals/:id', auth, async (req, res) => {
  try {
    const meal = await MealPlan.findById(req.params.id);
    if (!meal) return res.status(404).json({ msg: 'Meal not found' });
    if (meal.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });
    await MealPlan.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Meal removed' });
  } catch (err) { res.status(500).send('Server Error'); }
});

app.listen(5000, () => console.log('🚀 Server started on port 5000'));