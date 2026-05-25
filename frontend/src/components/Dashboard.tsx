import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Warning } from '@phosphor-icons/react';
import { useAuth } from '../App';
import { ApiService } from '../services/ApiService';
import type { Reflection } from '../types';
import { CATEGORY_LABELS } from '../types';

function getMode(): 'morning' | 'evening' {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? 'evening' : 'morning';
}

function greeting(firstName?: string): string {
  const h = new Date().getHours();
  const n = firstName ? `, ${firstName}` : '';
  if (h >= 5  && h < 12) return `Guten Morgen${n}`;
  if (h < 17)             return `Hallo${n}`;
  if (h < 22)             return `Guten Abend${n}`;
  return `Gute Nacht${n}`;
}

interface GrowthData {
  thisWeekCount: number;
  topCategoryThisWeek: string | null;
  totalWords: number;
  avgFirst: number;
  avgLast: number;
  daysSinceStart: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<Reflection[]>([]);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [showStreakWarning, setShowStreakWarning] = useState(false);
  const mode = getMode();

  useEffect(() => {
    ApiService.getReflections(1, 3)
      .then((r) => setRecent(r.reflections))
      .catch(() => {});
    ApiService.getGrowth()
      .then(setGrowth)
      .catch(() => {});
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const reflectedToday = user?.last_reflection_date === today;
  const streak = user?.streak ?? 0;

  // Show streak warning in the evening if not yet reflected and streak > 0
  useEffect(() => {
    const h = new Date().getHours();
    if (!reflectedToday && streak > 0 && h >= 18) {
      const dismissed = sessionStorage.getItem('streak_warning_dismissed');
      if (!dismissed) setShowStreakWarning(true);
    }
  }, [reflectedToday, streak]);

  const wordGrowth = growth && growth.avgFirst > 0
    ? Math.round(((growth.avgLast - growth.avgFirst) / growth.avgFirst) * 100)
    : null;

  return (
    <div className="page-container">

      {/* ── Streak loss warning ── */}
      <AnimatePresence>
        {showStreakWarning && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-2xl border border-black dark:border-white bg-black dark:bg-white p-4 flex items-start gap-3"
          >
            <Warning size={18} weight="fill" className="text-white dark:text-black flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="ios-text-footnote font-semibold text-white dark:text-black">
                Dein {streak}-Tage-Streak endet heute Nacht
              </p>
              <p className="ios-text-caption text-white/70 dark:text-black/60 mt-0.5">
                2 Minuten reichen.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/reflections/new')}
                className="ios-text-caption font-semibold text-white dark:text-black underline underline-offset-2"
              >
                Jetzt
              </button>
              <button
                onClick={() => {
                  sessionStorage.setItem('streak_warning_dismissed', '1');
                  setShowStreakWarning(false);
                }}
                className="ios-text-caption text-white/50 dark:text-black/40 ml-1"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="ios-text-caption text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-1">
            {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="ios-text-title1 text-black dark:text-white">{greeting(user?.first_name)}</h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {streak > 0 && (
            <span className={`badge ${!reflectedToday && mode === 'evening' ? 'border-black dark:border-white font-semibold' : ''}`}>
              {streak}d
            </span>
          )}
          <button onClick={() => navigate('/tokens')} className="badge">
            {user?.tokens ?? 0} T
          </button>
        </div>
      </div>

      {/* ── Daily CTA ── */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        onClick={() => navigate('/reflections/new')}
        className="w-full text-left card p-6 mb-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="ios-text-caption text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] uppercase tracking-wider mb-2">
              {mode === 'morning' ? 'Morgenreflexion' : 'Abendreflexion'}
            </p>
            <p className="ios-text-headline text-black dark:text-white">
              {reflectedToday ? 'Weitere Reflexion hinzufügen' : 'Jetzt reflektieren'}
            </p>
            <p className="ios-text-footnote text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-1">
              {reflectedToday
                ? 'Du hast heute bereits reflektiert'
                : mode === 'morning'
                  ? 'Beginne deinen Tag mit Klarheit'
                  : 'Schliesse deinen Tag bewusst ab'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-black dark:bg-white flex items-center justify-center flex-shrink-0 ml-4">
            <ArrowRight size={18} weight="bold" className="text-white dark:text-black" />
          </div>
        </div>
      </motion.button>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Streak" value={`${streak}`} sub="Tage" />
        <StatCard label="Wörter" value={growth ? `${(growth.totalWords / 1000).toFixed(1)}k` : `${user?.tokens ?? 0}`} sub={growth ? 'gesamt' : 'Tokens'} />
        <StatCard label="Status" value={user?.subscription === 'pro' ? 'Pro' : 'Free'} sub="Plan" />
      </div>

      {/* ── Wöchentliche Erkenntnis-Karte ── */}
      {growth && growth.thisWeekCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 mb-5"
        >
          <p className="section-header mb-3">Diese Woche</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="ios-text-title2 text-black dark:text-white">
                {growth.thisWeekCount} {growth.thisWeekCount === 1 ? 'Reflexion' : 'Reflexionen'}
              </p>
              {growth.topCategoryThisWeek && (
                <p className="ios-text-footnote text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-1">
                  Stärkstes Thema: <span className="text-black dark:text-white font-medium">
                    {CATEGORY_LABELS[growth.topCategoryThisWeek] || growth.topCategoryThisWeek}
                  </span>
                </p>
              )}
            </div>
            <button
              onClick={() => navigate('/progress')}
              className="ios-text-caption font-medium text-black dark:text-white underline underline-offset-2"
            >
              Details
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Damals vs. Heute ── */}
      {growth && wordGrowth !== null && wordGrowth > 0 && growth.daysSinceStart >= 7 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-5 mb-5 bg-black dark:bg-white"
        >
          <p className="ios-text-caption font-semibold uppercase tracking-widest text-white/40 dark:text-black/40 mb-3">
            Deine Entwicklung
          </p>
          <p className="ios-text-title2 text-white dark:text-black mb-1">
            +{wordGrowth}% tiefere Antworten
          </p>
          <p className="ios-text-footnote text-white/60 dark:text-black/55">
            Vor {growth.daysSinceStart} Tagen schriebst du im Schnitt {growth.avgFirst} Wörter.
            Heute sind es {growth.avgLast}.
          </p>
        </motion.div>
      )}

      {/* ── Recent reflections ── */}
      {recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="section-header">Letzte Einträge</span>
            <button
              onClick={() => navigate('/reflections')}
              className="ios-text-footnote text-black dark:text-white font-medium"
            >
              Alle
            </button>
          </div>
          <div className="list-group">
            {recent.map((r, i) => (
              <motion.button
                key={r.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => navigate(`/reflections/${r.id}`)}
                className="list-row w-full text-left"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="ios-text-caption text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.35)]">
                      {new Date(r.created_at).toLocaleDateString('de-DE', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </span>
                    {r.category && (
                      <span className="category-chip">{CATEGORY_LABELS[r.category] || r.category}</span>
                    )}
                    {r.feedback && (
                      <span className="ios-text-caption text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.3)] font-medium">
                        Feedback
                      </span>
                    )}
                  </div>
                  <p className="ios-text-footnote font-medium text-black dark:text-white line-clamp-1">
                    {r.question}
                  </p>
                  <p className="ios-text-caption text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-0.5 line-clamp-1">
                    {r.answer}
                  </p>
                </div>
                <ChevronIcon />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {recent.length === 0 && (
        <div className="card p-8 text-center">
          <p className="ios-text-headline text-black dark:text-white mb-1">
            Deine erste Reflexion
          </p>
          <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-6">
            Beginne heute. Fünf Minuten täglich genügen.
          </p>
          <button onClick={() => navigate('/reflections/new')} className="btn-primary px-7">
            Starten
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="ios-text-title3 text-black dark:text-white">{value}</div>
      <div className="ios-text-caption text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-0.5">{label}</div>
      <div className="ios-text-caption text-[rgba(60,60,67,0.35)] dark:text-[rgba(235,235,245,0.3)]">{sub}</div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="8" height="13" viewBox="0 0 8 13" fill="none" className="flex-shrink-0 text-[rgba(60,60,67,0.25)] dark:text-[rgba(235,235,245,0.2)]">
      <path d="M1 1l6 5.5L1 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
