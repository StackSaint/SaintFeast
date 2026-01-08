import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle size={80} className="text-red-500 mb-6" />
      <h1 className="text-6xl font-bold mb-2">404</h1>
      <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
      <p className="text-gray-400 max-w-md mb-8">
        Oops! It seems like this recipe doesn't exist. You might have taken a wrong turn in the kitchen.
      </p>
      <Link 
        to="/" 
        className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-full font-bold hover:scale-105 transition-transform shadow-lg shadow-orange-500/20"
      >
        Go Back Home
      </Link>
    </div>
  );
}