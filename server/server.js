require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import the schemas
const { User, MealPlan } = require('./models/Schemas');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'mysecretkey123';

// --- DATABASE CONNECTION (Only ONE block like this) ---
// Replace 'mypassword' below with your REAL password if it is different
mongoose.connect('mongodb+srv://saintgame1547_db_user:QDiP5ZHcyPSzjaxu@cluster0.74j2h66.mongodb.net/food_app?appName=Cluster0')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// --- ROUTES ---

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

// Authentication Middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, access denied' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(400).json({ msg: 'Token is not valid' });
  }
};

// Save Meal
app.post('/api/meals', auth, async (req, res) => {
  try {
    const newMeal = new MealPlan({ ...req.body, userId: req.user.id });
    const savedMeal = await newMeal.save();
    res.json(savedMeal);
  } catch (err) { res.status(500).send('Server Error'); }
});

// Get User's Meals
app.get('/api/meals', auth, async (req, res) => {
  try {
    const meals = await MealPlan.find({ userId: req.user.id });
    res.json(meals);
  } catch (err) { res.status(500).send('Server Error'); }
});

// DELETE a meal
app.delete('/api/meals/:id', auth, async (req, res) => {
  try {
    const meal = await MealPlan.findById(req.params.id);
    if (!meal) return res.status(404).json({ msg: 'Meal not found' });

    // Make sure user owns this meal (Security Check)
    if (meal.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await MealPlan.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Meal removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

app.listen(5000, () => console.log('🚀 Server started on port 5000'));