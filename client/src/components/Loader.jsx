import React from 'react';
import { motion } from 'framer-motion';
import { ChefHat } from 'lucide-react';

export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center h-64 w-full">
      <div className="relative">
        {/* Spinning Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-16 h-16 border-4 border-gray-700 border-t-orange-500 rounded-full"
        />
        {/* Icon in middle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <ChefHat className="text-gray-500" size={24} />
        </div>
      </div>
      <p className="text-gray-400 mt-4 text-sm animate-pulse">Cooking up results...</p>
    </div>
  );
}