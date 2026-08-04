import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import OwnerDashboard from './pages/OwnerDashboard';

const MeshBackground = () => (
  <div className="fixed inset-0 z-[-1] overflow-hidden bg-slate-50 pointer-events-none">
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px]"></div>
    <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full bg-fuchsia-400/20 blur-[120px]"></div>
    <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-emerald-400/10 blur-[100px]"></div>
  </div>
);

export default function App() {
  return (
    <Router>
      <div className="min-h-screen font-sans selection:bg-indigo-500/30 relative">
        <MeshBackground />
        <Navbar />
        
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/owner-dashboard" element={<OwnerDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}