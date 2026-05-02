import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('breachalert_token');
    if (token) {
      getProfile()
        .then(setUser)
        .catch(() => localStorage.removeItem('breachalert_token'));
    }
    setLoading(false);
  }, []);

  const login = (tokenData) => {
    localStorage.setItem('breachalert_token', tokenData.access_token);
    getProfile().then(setUser);
  };

  const logout = () => {
    localStorage.removeItem('breachalert_token');
    setUser(null);
  };

  const value = { user, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

