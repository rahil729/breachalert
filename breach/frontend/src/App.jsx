import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EmailWatchlist from "./pages/EmailWatchlist";
import BreachTimeline from "./pages/BreachTimeline";
import VerifyEmail from "./pages/VerifyEmail";
import Upgrade from "./pages/Upgrade";
import "./styles.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
          </svg>
          BreachAlert
        </Link>
      </div>
      
      <div className="nav-links">
        <Link to="/">Dashboard</Link>
        {!user && (
          <>
            <Link to="/login" className="btn btn-secondary">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
          </>
        )}
        {user && (
          <>
            <Link to="/watchlist" className="btn btn-secondary">Watchlist</Link>
            <Link to="/upgrade" className="btn btn-secondary">Upgrade</Link>
            <button onClick={logout} className="btn btn-secondary">Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/watchlist" element={
          <ProtectedRoute>
            <EmailWatchlist />
          </ProtectedRoute>
        } />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/breaches/:id" element={
          <ProtectedRoute>
            <BreachTimeline />
          </ProtectedRoute>
        } />
        <Route path="/upgrade" element={
          <ProtectedRoute>
            <Upgrade />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;

