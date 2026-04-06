import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import OfflineBanner from './components/OfflineBanner';
import Login       from './pages/Login';
import Register    from './pages/Register';
import Portfolio   from './pages/Portfolio';
import Profile     from './pages/Profile';
import Trade       from './pages/Trade';
import Orders      from './pages/Orders';
import Explore     from './pages/Explore';
import StockSearch from './pages/StockSearch';

function Protected({ children }) {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:26, height:26, border:'3px solid var(--border)', borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return isLoggedIn ? children : <Navigate to="/login" replace/>;
}

function Public({ children }) {
  const { isLoggedIn, isLoading } = useAuth();
  if (isLoading) return null;
  return !isLoggedIn ? children : <Navigate to="/portfolio" replace/>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public routes - accessible without login */}
          <Route path="/"        element={<Explore/>}/>
          <Route path="/explore" element={<Explore/>}/>
          <Route path="/stocks"  element={<StockSearch/>}/>
          <Route path="/login"   element={<Public><Login/></Public>}/>
          <Route path="/register" element={<Public><Register/></Public>}/>

          {/* Protected routes */}
          <Route path="/portfolio" element={<Protected><Portfolio/></Protected>}/>
          <Route path="/trade"     element={<Protected><Trade/></Protected>}/>
          <Route path="/orders"    element={<Protected><Orders/></Protected>}/>
          <Route path="/profile"   element={<Protected><Profile/></Protected>}/>
        </Routes>
        <OfflineBanner/>
      </AuthProvider>
    </BrowserRouter>
  );
}
