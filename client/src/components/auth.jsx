import React, { useState } from 'react';
import { login, register } from '../api';
import { motion } from 'framer-motion';

export default function Auth({ setAuth }) {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Register
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    try {
      // If isLogin is true, call login(), otherwise call register()
      const res = isLogin ? await login(formData) : await register(formData);
      setAuth(res.data.token); // Save the token to log the user in
    } catch (err) {
      setError(err.response?.data?.msg || 'Something went wrong');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20"
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-white">
          {isLogin ? 'Welcome Back' : 'Join FusionFeast'}
        </h2>
        
        {error && <p className="bg-red-500/50 text-white p-2 rounded mb-4 text-center text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            className="w-full p-3 rounded-lg bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 border border-white/10 transition-all"
            placeholder="Username" 
            value={formData.username}
            onChange={e => setFormData({ ...formData, username: e.target.value })} 
            required
          />
          <input 
            className="w-full p-3 rounded-lg bg-black/30 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 border border-white/10 transition-all"
            type="password" 
            placeholder="Password" 
            value={formData.password}
            onChange={e => setFormData({ ...formData, password: e.target.value })} 
            required
          />
          
          <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white p-3 rounded-lg font-bold shadow-lg hover:shadow-orange-500/50 hover:scale-105 transition-transform">
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-300 text-sm cursor-pointer hover:text-white transition-colors" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "New chef? Create an account" : "Already have an account? Login"}
        </p>
      </motion.div>
    </div>
  );
}