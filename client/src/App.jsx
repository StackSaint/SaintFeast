import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; 
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import NotFound from './components/NotFound'; // <--- IMPORT THIS

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const setAuth = (newToken) => {
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    } else {
      localStorage.removeItem('token');
      setToken(null);
    }
  };

  return (
    <Router>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={!token ? <Auth setAuth={setAuth} /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <Dashboard token={token} logout={() => setAuth(null)} /> : <Navigate to="/login" />} />
        
        {/* CATCH ALL ROUTE (404) */}
        <Route path="*" element={<NotFound />} /> 
      </Routes>
    </Router>
  );
}

export default App;