/**
 * Main App Component
 * Contains routing and global providers
 */

import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';

// Pages
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import CreateForm from './pages/CreateForm/CreateForm';
import StudentForm from './pages/StudentForm/StudentForm';
import FormResponses from './pages/FormResponses/FormResponses';
import FormAnalysis from './pages/FormAnalysis/FormAnalysis';
import FormDetails from './pages/FormDetails/FormDetails';

// Loading fallback component
const LoadingFallback = () => (
    <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
    }}>
        <div style={{ textAlign: 'center' }}>
            <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #ddd',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
            }}></div>
            <p>Loading...</p>
        </div>
    </div>
);

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/form/:formId" element={<StudentForm />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forms/create"
                  element={
                    <ProtectedRoute>
                      <CreateForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forms/:formId"
                  element={
                    <ProtectedRoute>
                      <FormDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forms/:formId/edit"
                  element={
                    <ProtectedRoute>
                      <CreateForm />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forms/:formId/responses"
                  element={
                    <ProtectedRoute>
                      <FormResponses />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/forms/:formId/analysis"
                  element={
                    <ProtectedRoute>
                      <FormAnalysis />
                    </ProtectedRoute>
                  }
                />

                {/* Default Route */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>

            <ToastContainer
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
