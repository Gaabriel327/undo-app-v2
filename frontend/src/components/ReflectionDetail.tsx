import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from '@phosphor-icons/react';
import { ApiService } from '../services/ApiService';
import { useAuth } from '../App';
import type { Reflection } from '../types';
import { CATEGORY_LABELS } from '../types';

export default function ReflectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    ApiService.getReflection(Number(id))
      .then(setReflection)
      .catch(() => setError('Reflexion nicht gefunden.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleGetFeedback = async () => {
    if (!reflection) return;
    if (user?.subscription !== 'pro' && (user?.tokens ?? 0) < 1) {
      navigate('/tokens');
      return;
    }
    setFeedbackLoading(true);
    setError('');
    try {
      const { feedback } = await ApiService.generateFeedback(reflection.id);
      setReflection((r) => (r ? { ...r, feedback } : r));
      if (user && user.subscription !== 'pro') {
        setUser({ ...user, tokens: user.tokens - 1 });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Feedback konnte nicht geladen werden.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center min-h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  if (!reflection) {
    return (
      <div className="page-container text-center pt-20">
        <p className="ios-text-subhead text-[rgba(60,60,67,0.5)]">{error || 'Nicht gefunden.'}</p>
        <button className="btn-secondary mt-5" onClick={() => navigate('/reflections')}>
          Zurück
        </button>
      </div>
    );
  }

  const modeLabel = reflection.mode === 'morning' ? 'Morgenreflexion' : 'Abendreflexion';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center mb-7">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} weight="regular" />
          Zurück
        </button>
      </div>

      {/* Meta */}
      <div className="mb-6">
        <p className="section-header">{modeLabel}</p>
        <h1 className="ios-text-title2 text-black dark:text-white">
          {new Date(reflection.created_at).toLocaleDateString('de-DE', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
        </h1>
        {reflection.category && (
          <span className="category-chip mt-2 inline-block">
            {CATEGORY_LABELS[reflection.category] || reflection.category}
          </span>
        )}
      </div>

      {/* Question */}
      <div className="card p-5 mb-4">
        <p className="section-header mb-2">Frage</p>
        <p className="ios-text-body text-black dark:text-white leading-relaxed">
          {reflection.question}
        </p>
      </div>

      {/* Answer */}
      <div className="card p-5 mb-4">
        <p className="section-header mb-2">Deine Antwort</p>
        <p className="ios-text-body text-[rgba(60,60,67,0.75)] dark:text-[rgba(235,235,245,0.7)] leading-relaxed whitespace-pre-wrap">
          {reflection.answer}
        </p>
      </div>

      {/* AI Feedback */}
      {reflection.feedback ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5"
        >
          <p className="section-header mb-3">Feedback</p>
          <div className="w-10 h-px bg-black dark:bg-white mb-4" />
          <p className="ios-text-body text-black dark:text-white leading-relaxed">
            {reflection.feedback}
          </p>
        </motion.div>
      ) : (
        <div>
          {error && <div className="mb-4 alert-error">{error}</div>}
          <button
            onClick={handleGetFeedback}
            disabled={feedbackLoading}
            className="btn-primary w-full"
          >
            {feedbackLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Feedback wird erstellt...
              </span>
            ) : (
              'Feedback erhalten'
            )}
          </button>
          {user?.subscription !== 'pro' && (
            <p className="ios-text-caption text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.35)] text-center mt-2">
              Kostet 1 Token · {user?.tokens ?? 0} verfügbar ·{' '}
              <button
                onClick={() => navigate('/tokens')}
                className="text-black dark:text-white font-medium underline underline-offset-2"
              >
                Mehr erhalten
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
