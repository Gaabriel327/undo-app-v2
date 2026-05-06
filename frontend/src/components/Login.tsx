import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ApiService } from '../services/ApiService';
import { useAuth } from '../App';

export default function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await ApiService.login(form.username, form.password);
      localStorage.setItem('undo_token', token);
      setUser(user);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col justify-end sm:justify-center p-5 pb-10 sm:pb-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm mx-auto"
      >
        {/* Wordmark */}
        <div className="mb-10">
          <h1 className="ios-text-large-title text-black dark:text-white">UNDO</h1>
          <p className="ios-text-subhead text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.5)] mt-1">
            Tägliche Reflexion. Persönliches Wachstum.
          </p>
        </div>

        {error && (
          <div className="mb-4 alert-error">{error}</div>
        )}

        {/* Form card */}
        <div className="list-group mb-4">
          <div className="list-row gap-3">
            <span className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] w-24 flex-shrink-0">
              Benutzername
            </span>
            <input
              type="text"
              className="flex-1 bg-transparent focus:outline-none ios-text-subhead text-black dark:text-white placeholder:text-[rgba(60,60,67,0.35)] dark:placeholder:text-[rgba(235,235,245,0.25)]"
              placeholder="dein_username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>
          <div className="list-row gap-3">
            <span className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] w-24 flex-shrink-0">
              Passwort
            </span>
            <input
              type="password"
              className="flex-1 bg-transparent focus:outline-none ios-text-subhead text-black dark:text-white placeholder:text-[rgba(60,60,67,0.35)] dark:placeholder:text-[rgba(235,235,245,0.25)]"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          onKeyDown={(e) => e.key === 'Enter' && (handleSubmit as unknown as () => void)()}
          className="btn-primary w-full mb-4"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Anmelden...
            </span>
          ) : 'Anmelden'}
        </button>

        <p className="text-center ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)]">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-black dark:text-white font-semibold">
            Registrieren
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
