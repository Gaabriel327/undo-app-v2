import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ApiService } from '../services/ApiService';
import { useAuth } from '../App';

export default function Register() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await ApiService.register(form);
      localStorage.setItem('undo_token', token);
      setUser(user);
      navigate('/profile?onboarding=true');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'first_name', label: 'Vorname',    type: 'text',     placeholder: 'Max',          required: false, autoComplete: 'given-name' },
    { key: 'username',   label: 'Username',   type: 'text',     placeholder: 'max_muster',   required: true,  autoComplete: 'username' },
    { key: 'email',      label: 'E-Mail',     type: 'email',    placeholder: 'max@mail.de',  required: true,  autoComplete: 'email' },
    { key: 'password',   label: 'Passwort',   type: 'password', placeholder: '••••••••',     required: true,  autoComplete: 'new-password' },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black flex flex-col justify-end sm:justify-center p-5 pb-10 sm:pb-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm mx-auto"
      >
        <div className="mb-10">
          <h1 className="ios-text-large-title text-black dark:text-white">UNDO</h1>
          <p className="ios-text-subhead text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.5)] mt-1">
            Konto erstellen und beginnen.
          </p>
        </div>

        {error && <div className="mb-4 alert-error">{error}</div>}

        <div className="list-group mb-4">
          {fields.map(({ key, label, type, placeholder, autoComplete }) => (
            <div key={key} className="list-row gap-3">
              <span className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] w-24 flex-shrink-0">
                {label}
              </span>
              <input
                type={type}
                className="flex-1 bg-transparent focus:outline-none ios-text-subhead text-black dark:text-white placeholder:text-[rgba(60,60,67,0.35)] dark:placeholder:text-[rgba(235,235,245,0.25)]"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                autoComplete={autoComplete}
                autoCapitalize="none"
                minLength={key === 'password' ? 6 : undefined}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          className="btn-primary w-full mb-4"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Erstelle Konto...
            </span>
          ) : 'Konto erstellen'}
        </button>

        <p className="text-center ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)]">
          Bereits ein Konto?{' '}
          <Link to="/login" className="text-black dark:text-white font-semibold">
            Anmelden
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
