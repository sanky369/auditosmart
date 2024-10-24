import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DataInput from './pages/DataInput';
import Analysis from './pages/Analysis';
import { ReportProvider } from './contexts/ReportContext';
import Landing from './pages/Landing';

const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { user } = useAuth();
  return user ? element : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <ReportProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute element={<Layout />} />}>
              <Route index element={<Home />} />
              <Route path="data-input" element={<DataInput />} />
              <Route path="analysis" element={<Analysis />} />
            </Route>
          </Routes>
        </Router>
      </ReportProvider>
    </AuthProvider>
  );
}

export default App;
