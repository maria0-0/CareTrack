import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Import necessary components and styles
import { AuthProvider, AuthContext } from './AuthContext'; 
import './App.css'; // Your main App styles
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import PatientPage from './pages/PatientPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage'; 
import ResetPasswordPage from './pages/ResetPasswordPage'; 
import TemplateManagementPage from './pages/TemplateManagementPage';

// Component to protect routes (You already have this logic)
const PrivateRoute = () => {
  const { user } = useContext(AuthContext);
  // Redirects to login if user is not authenticated
  return user?.token ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          
          {/* -------------------- PUBLIC ROUTES -------------------- */}
          {/* ⭐️ FIX 1: Map / and /login to the LoginPage component ⭐️ */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* ⭐️ FIX 2: Map the new Password Reset Routes ⭐️ */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

          {/* -------------------- PROTECTED ROUTES -------------------- */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patient/:id" element={<PatientPage />} />
            <Route path="/templates" element={<TemplateManagementPage />} />
              </Route>

          {/* Catch-all route for 404s */}
          <Route path="*" element={<h1>404: Page Not Found</h1>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;