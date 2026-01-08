const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Stores a specific meal combination (Base + Protein/Dish) on a specific date
const MealPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  base: { type: String, required: true }, // Rice, Potato, etc.
  mealId: { type: String, required: true }, // ID from TheMealDB
  mealName: { type: String, required: true },
  mealThumb: { type: String },
  isSavedCombo: { type: Boolean, default: false } // If user wants to "store mix for later"
});

const User = mongoose.model('User', UserSchema);
const MealPlan = mongoose.model('MealPlan', MealPlanSchema);

module.exports = { User, MealPlan };