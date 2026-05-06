import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowCounterClockwise } from '@phosphor-icons/react';
import { ApiService } from '../services/ApiService';
import { useAuth } from '../App';
import type { Question } from '../types';
import { CATEGORY_LABELS } from '../types';

function getMode(): 'morning' | 'evening' {
  const h = new Date().getHours();
  return h >= 17 || h < 5 ? 'evening' : 'morning';
}

export default function Prompt() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [mode, setMode] = useState<'morning' | 'evening'>(getMode());
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: number; tokensEarned: number } | null>(null);
  const [error, setError] = useState('');

  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => { loadQuestion(); }, [mode]);

  const loadQuestion = async () => {
    setLoading(true);
    setError('');
    try {
      setQuestion(await ApiService.getQuestion(mode));
    } catch {
      setError('Frage konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!question || answer.trim().length < 10) return;
    setSubmitting(true);
    setError('');
    try {
      const { reflection, tokensEarned } = await ApiService.createReflection({
        mode,
        question: question.text,
        question_id: question.id,
        answer: answer.trim(),
        category: question.category,
      });
      if (user && tokensEarned > 0) {
        setUser({ ...user, tokens: user.tokens + tokensEarned });
      }
      setSubmitted({ id: reflection.id, tokensEarned });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[75vh] text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full max-w-xs"
        >
          <div className="w-14 h-14 rounded-full bg-black dark:bg-white mx-auto mb-6 flex items-center justify-center">
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
              <path d="M1 8l7 7L21 1" stroke="white" className="dark:stroke-black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="ios-text-title2 text-black dark:text-white mb-2">Gespeichert</h2>
          <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-1">
            Deine Reflexion wurde gespeichert.
          </p>
          {submitted.tokensEarned > 0 && (
            <p className="ios-text-footnote text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.35)] mb-6">
              +{submitted.tokensEarned} Token{submitted.tokensEarned > 1 ? 's' : ''} gutgeschrieben
            </p>
          )}
          <div className="flex flex-col gap-3 mt-8">
            <button className="btn-primary w-full" onClick={() => navigate(`/reflections/${submitted.id}`)}>
              Psychologisches Feedback
            </button>
            <button className="btn-secondary w-full" onClick={() => navigate('/')}>
              Zum Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={20} weight="regular" />
        </button>
        <span className="ios-text-headline text-black dark:text-white mx-auto">Neue Reflexion</span>
        <div className="w-8" />
      </div>

      {/* Segmented control */}
      <div className="segmented-control mb-6">
        {(['morning', 'evening'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`segmented-control-item ${mode === m ? 'active' : ''}`}
          >
            {m === 'morning' ? 'Morgen' : 'Abend'}
          </button>
        ))}
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="card p-6 mb-5 flex items-center justify-center h-32"
          >
            <div className="spinner" />
          </motion.div>
        ) : question ? (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="card p-5 mb-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="category-chip">
                {CATEGORY_LABELS[question.category] || question.category}
              </span>
              <button
                onClick={loadQuestion}
                className="w-8 h-8 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                title="Andere Frage"
              >
                <ArrowCounterClockwise size={15} weight="regular" className="text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.5)]" />
              </button>
            </div>
            <p className="ios-text-body text-black dark:text-white leading-relaxed">
              {question.text}
            </p>
          </motion.div>
        ) : (
          <div className="card p-6 mb-5 text-center">
            <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)]">
              Keine Frage verfügbar.
            </p>
          </div>
        )}
      </AnimatePresence>

      {/* Answer */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="section-header">Deine Antwort</span>
          <span className={`ios-text-caption font-medium ${
            wordCount >= 40
              ? 'text-black dark:text-white'
              : 'text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.35)]'
          }`}>
            {wordCount} Wörter{wordCount >= 40 ? ' · Bonus' : ''}
          </span>
        </div>
        <textarea
          className="input-field resize-none ios-text-body leading-relaxed"
          rows={8}
          placeholder="Schreib ehrlich und ohne Filter. Nur du liest das."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        {answer.trim().length > 0 && answer.trim().length < 10 && (
          <p className="ios-text-caption text-[rgba(60,60,67,0.5)] mt-1.5 px-1">
            Mindestens 10 Zeichen erforderlich.
          </p>
        )}
      </div>

      {error && <div className="mb-4 alert-error">{error}</div>}

      <button
        className="btn-primary w-full"
        disabled={!question || answer.trim().length < 10 || submitting}
        onClick={handleSubmit}
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Speichern...
          </span>
        ) : 'Reflexion speichern'}
      </button>
    </div>
  );
}
