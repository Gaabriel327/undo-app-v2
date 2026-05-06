import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from '@phosphor-icons/react';
import { ApiService } from '../services/ApiService';
import type { Group } from '../types';

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [joinId, setJoinId] = useState('');
  const [createForm, setCreateForm] = useState({ name: '', motive: '', chance: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    ApiService.getGroups().then(setGroups).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const g = await ApiService.createGroup(createForm);
      setGroups((prev) => [g, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: '', motive: '', chance: '' });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen.');
    } finally { setSubmitting(false); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    setSubmitting(true); setError('');
    try {
      await ApiService.joinGroup(joinId.trim());
      setGroups(await ApiService.getGroups());
      setShowJoin(false); setJoinId('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gruppe nicht gefunden.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page-container">
      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="ios-text-title1 text-black dark:text-white">WeDo</h1>
          <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-1">
            Gemeinsam wachsen
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          <button onClick={() => { setShowJoin(true); setError(''); }} className="btn-secondary py-2 px-4 text-[14px]">
            Beitreten
          </button>
          <button onClick={() => { setShowCreate(true); setError(''); }} className="btn-primary py-2 px-4 text-[14px]">
            <Plus size={14} weight="bold" className="mr-1" />
            Neu
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner" /></div>
      ) : groups.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="ios-text-headline text-black dark:text-white mb-1">Noch keine Gruppen</p>
          <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-6">
            Erstelle eine Gruppe und lade andere ein.
          </p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            Gruppe erstellen
          </button>
        </div>
      ) : (
        <div className="list-group">
          {groups.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              onClick={() => navigate(`/groups/${g.id}`)}
              className="list-row w-full text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="ios-text-subhead font-medium text-black dark:text-white">{g.name}</p>
                <p className="ios-text-caption text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.35)] mt-0.5">
                  {g.member_count} {g.member_count === 1 ? 'Mitglied' : 'Mitglieder'}
                  {g.last_q_day === new Date().toISOString().split('T')[0] && (
                    <span className="ml-2 text-black dark:text-white font-medium">· Heute aktiv</span>
                  )}
                </p>
              </div>
              <ChevronIcon />
            </motion.button>
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <IOSModal title="Gruppe erstellen" onClose={() => setShowCreate(false)}>
            <form onSubmit={handleCreate} className="space-y-3">
              {error && <div className="alert-error">{error}</div>}
              <input className="input-field ios-text-subhead" placeholder="Name der Gruppe" value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} required />
              <input className="input-field ios-text-subhead" placeholder="Gemeinsames Motiv (optional)" value={createForm.motive}
                onChange={(e) => setCreateForm((f) => ({ ...f, motive: e.target.value }))} />
              <input className="input-field ios-text-subhead" placeholder="Gemeinsames Ziel (optional)" value={createForm.chance}
                onChange={(e) => setCreateForm((f) => ({ ...f, chance: e.target.value }))} />
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Erstellen...' : 'Gruppe erstellen'}
              </button>
            </form>
          </IOSModal>
        )}
      </AnimatePresence>

      {/* Join modal */}
      <AnimatePresence>
        {showJoin && (
          <IOSModal title="Gruppe beitreten" onClose={() => setShowJoin(false)}>
            <form onSubmit={handleJoin} className="space-y-3">
              {error && <div className="alert-error">{error}</div>}
              <input className="input-field ios-text-subhead" placeholder="Gruppen-ID einfügen" value={joinId}
                onChange={(e) => setJoinId(e.target.value)} required />
              <p className="ios-text-caption text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.35)]">
                Frage den Gruppenersteller nach der ID.
              </p>
              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? 'Beitreten...' : 'Beitreten'}
              </button>
            </form>
          </IOSModal>
        )}
      </AnimatePresence>
    </div>
  );
}

function IOSModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="card w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="ios-text-headline text-black dark:text-white">{title}</h3>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.24)] flex items-center justify-center">
            <X size={14} weight="bold" className="text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.5)]" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function ChevronIcon() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" className="flex-shrink-0 text-[rgba(60,60,67,0.25)] dark:text-[rgba(235,235,245,0.2)]">
      <path d="M1 1l6 5.5L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
