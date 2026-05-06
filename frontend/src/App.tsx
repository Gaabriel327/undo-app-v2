import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from './types';
import { ApiService } from './services/ApiService';
import Login from './components/Login';
import Register from './components/Register';
import Interface from './components/Interface';

interface AuthContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('undo_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('undo_dark', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const token = localStorage.getItem('undo_token');
    if (!token) { setLoading(false); return; }
    ApiService.getMe()
      .then(setUser)
      .catch(() => localStorage.removeItem('undo_token'))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('undo_token');
    setUser(null);
  };

  const toggleDarkMode = () => setDarkMode((d) => !d);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#F2F2F7] dark:bg-black">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, darkMode, toggleDarkMode }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
          <Route path="/*"        element={user ? <Interface /> : <Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
