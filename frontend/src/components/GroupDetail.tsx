import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, PaperPlaneRight, Copy, Check } from '@phosphor-icons/react';
import { ApiService } from '../services/ApiService';
import { useAuth } from '../App';
import type { Group } from '../types';

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    ApiService.getGroup(id)
      .then(setGroup)
      .catch(() => setError('Gruppe nicht gefunden.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!group || !answer.trim()) return;
    const question = group.last_q_text || 'Was hat dich heute bewegt?';
    setSubmitting(true); setError('');
    try {
      await ApiService.postGroupReflection(group.id, question, answer.trim());
      setAnswer('');
      // Refresh in background, show updated answers immediately
      ApiService.getGroup(group.id).then(setGroup).catch(() => {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden.');
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  };

  const copyId = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="page-container flex justify-center items-center min-h-[60vh]"><div className="spinner" /></div>;
  }

  if (!group) {
    return (
      <div className="page-container text-center pt-20">
        <p className="ios-text-subhead text-[rgba(60,60,67,0.5)]">{error || 'Nicht gefunden.'}</p>
        <button className="btn-secondary mt-5" onClick={() => navigate('/groups')}>Zurück</button>
      </div>
    );
  }

  const question = group.last_q_text || 'Was hat dich heute bewegt?';
  const todayAnswered = group.recentReflections?.some(
    (r) => r.user_id === user?.id && r.created_at.startsWith(new Date().toISOString().split('T')[0])
  );

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center mb-7">
        <button onClick={() => navigate('/groups')} className="btn-back">
          <ArrowLeft size={20} />
          WeDo
        </button>
        <button
          onClick={copyId}
          className="ml-auto flex items-center gap-1.5 ios-text-footnote font-medium text-black dark:text-white bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.24)] px-3 py-1.5 rounded-full"
        >
          {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="regular" />}
          {copied ? 'Kopiert' : 'ID teilen'}
        </button>
      </div>

      <div className="mb-1">
        <h1 className="ios-text-title2 text-black dark:text-white">{group.name}</h1>
        <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-0.5">
          {group.members?.length ?? 0} {(group.members?.length ?? 0) === 1 ? 'Mitglied' : 'Mitglieder'}
        </p>
      </div>

      {/* Question */}
      <div className="card p-5 my-5">
        <p className="section-header mb-2">Frage des Tages</p>
        <p className="ios-text-body text-black dark:text-white leading-relaxed">{question}</p>
      </div>

      {/* Answer input */}
      {!todayAnswered ? (
        <div className="mb-6">
          <textarea
            className="input-field resize-none ios-text-body leading-relaxed mb-3"
            rows={4}
            placeholder="Deine Antwort..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          {error && <p className="ios-text-caption text-[rgba(60,60,67,0.5)] mb-2">{error}</p>}
          <button
            className="btn-primary w-full"
            onClick={handleSubmit}
            disabled={!answer.trim() || submitting}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Senden...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <PaperPlaneRight size={15} weight="fill" />
                Antwort senden
              </span>
            )}
          </button>
        </div>
      ) : (
        <div className="card-inset p-3 text-center ios-text-footnote font-medium text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-6">
          Heute bereits geantwortet
        </div>
      )}

      {/* Members */}
      {group.members && group.members.length > 0 && (
        <div className="mb-5">
          <p className="section-header mb-3 px-1">Mitglieder</p>
          <div className="flex flex-wrap gap-2">
            {group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 bg-white dark:bg-[#1C1C1E] px-3 py-1.5 rounded-full"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div className="w-5 h-5 rounded-full bg-black dark:bg-white flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white dark:text-black">
                    {(m.first_name || m.username).charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="ios-text-caption font-medium text-black dark:text-white">
                  {m.first_name || m.username}
                </span>
                {m.streak > 0 && (
                  <span className="ios-text-caption text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.35)]">
                    {m.streak}d
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent answers */}
      {group.recentReflections && group.recentReflections.length > 0 && (
        <div>
          <p className="section-header mb-3 px-1">Letzte Antworten</p>
          <div className="space-y-3">
            {group.recentReflections.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.24)] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.5)]">
                        {(r.first_name || r.username).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="ios-text-caption font-semibold text-black dark:text-white">
                      {r.first_name || r.username}
                    </span>
                  </div>
                  <span className="ios-text-caption text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.35)]">
                    {new Date(r.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="ios-text-subhead text-[rgba(60,60,67,0.7)] dark:text-[rgba(235,235,245,0.65)] leading-relaxed">
                  {r.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
