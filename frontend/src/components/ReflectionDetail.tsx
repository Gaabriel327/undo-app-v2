import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Export } from '@phosphor-icons/react';
import html2canvas from 'html2canvas';
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
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const shareCardRef = useRef<HTMLDivElement>(null);

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

  const handleShare = async () => {
    if (!shareCardRef.current || !reflection?.feedback) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'undo-reflexion.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'UNDO Reflexion',
          });
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'undo-reflexion.png';
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, 'image/png');
    } catch {
      setSharing(false);
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
  const dateStr = new Date(reflection.created_at).toLocaleDateString('de-DE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

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
        <h1 className="ios-text-title2 text-black dark:text-white">{dateStr}</h1>
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
          {/* Feedback header with share button */}
          <div className="flex items-center justify-between mb-3">
            <p className="section-header">Feedback</p>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center gap-1.5 text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.45)] hover:text-black dark:hover:text-white transition-colors active:scale-95"
              title="Teilen"
            >
              {sharing ? (
                <div className="w-4 h-4 rounded-full border-2 border-neutral-300 border-t-neutral-700 animate-spin" />
              ) : (
                <Export size={18} weight="regular" />
              )}
            </button>
          </div>
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

      {/* Hidden share card — rendered off-screen, captured by html2canvas */}
      <AnimatePresence>
        <div
          ref={shareCardRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            width: '390px',
            height: '693px', // 9:16 ratio story format
            background: '#000000',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '52px 40px 44px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Top: UNDO wordmark */}
          <div>
            <p style={{
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              opacity: 0.4,
              marginBottom: '36px',
            }}>
              UNDO
            </p>

            {/* Category + date */}
            <p style={{
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              opacity: 0.35,
              marginBottom: '8px',
            }}>
              {reflection.category ? (CATEGORY_LABELS[reflection.category] || reflection.category) : modeLabel}
              {'  ·  '}
              {new Date(reflection.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
            </p>

            {/* Divider */}
            <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '28px' }} />

            {/* Feedback text */}
            <p style={{
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 400,
              lineHeight: 1.55,
              letterSpacing: '-0.02em',
              opacity: 0.92,
            }}>
              {reflection.feedback}
            </p>
          </div>

          {/* Bottom: App link */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <p style={{
              color: '#ffffff',
              fontSize: '12px',
              opacity: 0.25,
              letterSpacing: '0.04em',
              fontWeight: 400,
            }}>
              undo-app.com
            </p>
            <p style={{
              color: '#ffffff',
              fontSize: '11px',
              opacity: 0.2,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Täglich reflektieren
            </p>
          </div>
        </div>
      </AnimatePresence>
    </div>
  );
}
