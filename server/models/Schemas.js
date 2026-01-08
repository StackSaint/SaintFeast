const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const MealPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  base: { type: String, required: true },
  mealId: { type: String, required: true },
  mealName: { type: String, required: true },
  mealThumb: { type: String },
  isSavedCombo: { type: Boolean, default: false },
  // --- NEW NUTRITION FIELDS ---
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 }
});

const User = mongoose.model('User', UserSchema);
const MealPlan = mongoose.model('MealPlan', MealPlanSchema);

module.exports = { User, MealPlan };