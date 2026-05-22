import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, SignOut, Bell, BellSlash } from '@phosphor-icons/react';
import { ApiService } from '../services/ApiService';
import { useAuth } from '../App';
import DatePicker from './DatePicker';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function Profile() {
  const { user, setUser, logout, darkMode, toggleDarkMode } = useAuth();
  const push = usePushNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get('onboarding') === 'true';

  const [form, setForm] = useState({
    first_name: user?.first_name ?? '',
    birth_date: user?.birth_date ?? '',
    motive:     user?.motive     ?? '',
    chance:     user?.chance     ?? '',
  });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPwForm, setShowPwForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const formatDate = (d: string) => {
    if (!d) return 'Auswählen';
    const p = d.split('-');
    if (p.length !== 3) return d;
    return `${parseInt(p[2])}. ${MONTHS[parseInt(p[1]) - 1]} ${p[0]}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await ApiService.updateProfile(form);
      setUser(updated);
      setMsg({ type: 'success', text: 'Profil gespeichert.' });
      if (isOnboarding) navigate('/');
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Fehler.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPw(true);
    setMsg(null);
    try {
      await ApiService.changePassword(pwForm.current_password, pwForm.new_password);
      setMsg({ type: 'success', text: 'Passwort geändert.' });
      setPwForm({ current_password: '', new_password: '' });
      setShowPwForm(false);
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Fehler.' });
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="ios-text-title1 text-black dark:text-white">
          {isOnboarding ? 'Profil einrichten' : 'Profil'}
        </h1>
        {!isOnboarding && (
          <button
            onClick={toggleDarkMode}
            className="w-9 h-9 rounded-full bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.24)] flex items-center justify-center"
          >
            {darkMode
              ? <Sun size={17} weight="fill" className="text-black dark:text-white" />
              : <Moon size={17} weight="fill" className="text-black dark:text-white" />}
          </button>
        )}
      </div>

      {/* Avatar */}
      {!isOnboarding && (
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-black dark:bg-white flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white dark:text-black">
              {(user?.first_name || user?.username || 'U').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="ios-text-headline text-black dark:text-white">
              {user?.first_name || user?.username}
            </p>
            <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)]">
              @{user?.username}
            </p>
          </div>
        </div>
      )}

      {/* Onboarding hint */}
      {isOnboarding && (
        <div className="card p-4 mb-6">
          <p className="ios-text-subhead text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.5)] leading-relaxed">
            Dein Motiv und deine Chance helfen der KI, dein Feedback individuell anzupassen.
          </p>
        </div>
      )}

      {/* Message */}
      {msg && (
        <div className={`mb-5 alert-${msg.type === 'success' ? 'success' : 'error'}`}>
          {msg.text}
        </div>
      )}

      {/* Profile form */}
      <form onSubmit={handleSave}>
        <p className="section-header mb-2 px-1">Persönliche Daten</p>
        <div className="list-group mb-5">
          <div className="list-row gap-3">
            <span className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] w-24 flex-shrink-0">
              Vorname
            </span>
            <input
              className="flex-1 bg-transparent focus:outline-none ios-text-subhead text-black dark:text-white placeholder:text-[rgba(60,60,67,0.3)] dark:placeholder:text-[rgba(235,235,245,0.25)]"
              placeholder="Max"
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>

          {/* Birth date row → iOS picker */}
          <button
            type="button"
            className="list-row w-full text-left"
            onClick={() => setShowDatePicker((v) => !v)}
          >
            <span className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] w-24 flex-shrink-0">
              Geburtstag
            </span>
            <span className={`flex-1 ios-text-subhead ${
              form.birth_date
                ? 'text-black dark:text-white'
                : 'text-[rgba(60,60,67,0.3)] dark:text-[rgba(235,235,245,0.25)]'
            }`}>
              {formatDate(form.birth_date)}
            </span>
            <ChevronIcon rotated={showDatePicker} />
          </button>

          <AnimatePresence>
            {showDatePicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 py-4 bg-white dark:bg-[#1C1C1E]"
                  style={{ borderTop: '0.5px solid rgba(60,60,67,0.1)' }}
                >
                  <DatePicker
                    value={form.birth_date || `${new Date().getFullYear() - 25}-01-01`}
                    onChange={(v) => setForm((f) => ({ ...f, birth_date: v }))}
                    maxYear={new Date().getFullYear() - 10}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="section-header mb-2 px-1">Persönliches Profil</p>
        <div className="list-group mb-5">
          <div className="px-4 py-3 bg-white dark:bg-[#1C1C1E]">
            <p className="ios-text-caption font-medium text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-1">
              Mein Motiv
            </p>
            <p className="ios-text-caption text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.3)] mb-2">
              Warum arbeitest du an dir? Was treibt dich an?
            </p>
            <textarea
              className="w-full bg-transparent focus:outline-none ios-text-subhead text-black dark:text-white resize-none placeholder:text-[rgba(60,60,67,0.3)] dark:placeholder:text-[rgba(235,235,245,0.25)]"
              rows={2}
              placeholder="z.B. Ich möchte mehr Klarheit über meine Werte gewinnen."
              value={form.motive}
              onChange={(e) => setForm((f) => ({ ...f, motive: e.target.value }))}
            />
          </div>
          <div
            className="px-4 py-3 bg-white dark:bg-[#1C1C1E]"
            style={{ borderTop: '0.5px solid rgba(60,60,67,0.1)' }}
          >
            <p className="ios-text-caption font-medium text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-1">
              Meine Chance
            </p>
            <p className="ios-text-caption text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.3)] mb-2">
              Was ist dein grösstes ungenutztes Potenzial?
            </p>
            <textarea
              className="w-full bg-transparent focus:outline-none ios-text-subhead text-black dark:text-white resize-none placeholder:text-[rgba(60,60,67,0.3)] dark:placeholder:text-[rgba(235,235,245,0.25)]"
              rows={2}
              placeholder="z.B. Meine Fähigkeit zur tiefen Empathie."
              value={form.chance}
              onChange={(e) => setForm((f) => ({ ...f, chance: e.target.value }))}
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full mb-8" disabled={saving}>
          {saving ? 'Speichern...' : isOnboarding ? 'Profil abschliessen' : 'Änderungen speichern'}
        </button>
      </form>

      {!isOnboarding && (
        <>
          <p className="section-header mb-2 px-1">Konto</p>
          <div className="list-group mb-4">
            <button onClick={() => navigate('/tokens')} className="list-row w-full text-left">
              <span className="ios-text-subhead text-black dark:text-white flex-1">
                Tokens & Abonnement
              </span>
              <span className="ios-text-subhead text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.4)] mr-2">
                {user?.tokens ?? 0}
              </span>
              <ChevronIcon />
            </button>

            <button
              type="button"
              onClick={() => setShowPwForm((v) => !v)}
              className="list-row w-full text-left"
            >
              <span className="ios-text-subhead text-black dark:text-white flex-1">
                Passwort ändern
              </span>
              <ChevronIcon rotated={showPwForm} />
            </button>

            <AnimatePresence>
              {showPwForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handlePasswordChange}
                  className="overflow-hidden"
                >
                  <div
                    className="px-4 pb-4 pt-3 space-y-3 bg-white dark:bg-[#1C1C1E]"
                    style={{ borderTop: '0.5px solid rgba(60,60,67,0.1)' }}
                  >
                    <input
                      type="password"
                      className="input-field ios-text-subhead"
                      placeholder="Aktuelles Passwort"
                      value={pwForm.current_password}
                      onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                      required
                    />
                    <input
                      type="password"
                      className="input-field ios-text-subhead"
                      placeholder="Neues Passwort (min. 6 Zeichen)"
                      value={pwForm.new_password}
                      onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                      minLength={6}
                      required
                    />
                    <button type="submit" className="btn-primary w-full" disabled={changingPw}>
                      {changingPw ? 'Ändern...' : 'Passwort ändern'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Push Notifications */}
          {push.supported && (
            <>
              <p className="section-header mb-2 px-1 mt-6">Erinnerungen</p>
              <div className="list-group mb-4">
                <div className="list-row">
                  <span className="ios-text-subhead text-black dark:text-white flex-1">
                    Tägliche Erinnerung
                  </span>
                  <button
                    onClick={() => push.subscribed ? push.unsubscribe() : push.subscribe()}
                    disabled={push.loading}
                    className={`flex items-center gap-2 ios-text-subhead font-medium transition-colors ${
                      push.subscribed
                        ? 'text-black dark:text-white'
                        : 'text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.35)]'
                    }`}
                  >
                    {push.loading ? (
                      <div className="w-4 h-4 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" />
                    ) : push.subscribed ? (
                      <><Bell size={16} weight="fill" /> An</>
                    ) : (
                      <><BellSlash size={16} weight="regular" /> Aus</>
                    )}
                  </button>
                </div>

                {push.subscribed && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="px-4 pb-4 pt-3 bg-white dark:bg-[#1C1C1E] space-y-3"
                        style={{ borderTop: '0.5px solid rgba(60,60,67,0.1)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="ios-text-subhead text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.5)]">Morgen</span>
                          <input
                            type="time"
                            value={push.morningTime}
                            onChange={(e) => push.updateTimes(e.target.value, push.eveningTime)}
                            className="bg-transparent ios-text-subhead text-black dark:text-white focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="ios-text-subhead text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.5)]">Abend</span>
                          <input
                            type="time"
                            value={push.eveningTime}
                            onChange={(e) => push.updateTimes(push.morningTime, e.target.value)}
                            className="bg-transparent ios-text-subhead text-black dark:text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </>
          )}

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-4 ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] hover:text-black dark:hover:text-white transition-colors"
          >
            <SignOut size={16} weight="regular" />
            Abmelden
          </button>
        </>
      )}
    </div>
  );
}

function ChevronIcon({ rotated = false }: { rotated?: boolean }) {
  return (
    <svg
      width="8" height="13" viewBox="0 0 8 13" fill="none"
      className={`flex-shrink-0 text-[rgba(60,60,67,0.25)] dark:text-[rgba(235,235,245,0.2)] transition-transform duration-200 ${
        rotated ? 'rotate-90' : ''
      }`}
    >
      <path d="M1 1l6 5.5L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
