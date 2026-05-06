import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
} from 'recharts';
import { ApiService } from '../services/ApiService';
import type { ReflectionStats } from '../types';
import { CATEGORY_LABELS } from '../types';
import { useAuth } from '../App';

export default function Progress() {
  const { darkMode } = useAuth();
  const [stats, setStats] = useState<ReflectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiService.getStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center min-h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  const radarData = stats?.scores.map((s) => ({
    subject: CATEGORY_LABELS[s.category] || s.category,
    score: Math.round(s.score),
    fullMark: 100,
  })) ?? [];

  const topCat = stats?.scores.reduce(
    (best, s) => (s.score > (best?.score ?? 0) ? s : best),
    null as { category: string; score: number } | null
  );

  const avg = stats?.scores.length
    ? Math.round(stats.scores.reduce((a, s) => a + s.score, 0) / stats.scores.length)
    : 0;

  const axisColor = darkMode ? 'rgba(235,235,245,0.35)' : 'rgba(60,60,67,0.4)';
  const gridColor = darkMode ? 'rgba(84,84,88,0.4)' : 'rgba(60,60,67,0.1)';
  const radarStroke = darkMode ? '#FFFFFF' : '#000000';
  const radarFill = darkMode ? '#FFFFFF' : '#000000';

  return (
    <div className="page-container">
      <h1 className="ios-text-title1 text-black dark:text-white mb-1">Fortschritt</h1>
      <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-7">
        Basierend auf deinen Reflexionen
      </p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard value={stats?.totalReflections ?? 0} label="Reflexionen" />
        <StatCard value={stats?.streak ?? 0} label="Streak" />
        <StatCard value={avg} label="Ø Score" />
      </div>

      {/* Radar */}
      {radarData.length > 0 ? (
        <div className="card p-5 mb-4">
          <p className="section-header mb-4">Kategorien</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 4, right: 12, bottom: 4, left: 12 }}>
              <PolarGrid stroke={gridColor} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fontSize: 10, fill: axisColor, fontFamily: 'system-ui' }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke={radarStroke}
                fill={radarFill}
                fillOpacity={0.07}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card p-6 text-center mb-4">
          <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)]">
            Beginne mit Reflexionen, um deinen Fortschritt zu sehen.
          </p>
        </div>
      )}

      {/* Category bars */}
      {stats?.scores && stats.scores.length > 0 && (
        <div className="card p-5 mb-4">
          <p className="section-header mb-5">Im Detail</p>
          <div className="space-y-4">
            {stats.scores
              .slice()
              .sort((a, b) => b.score - a.score)
              .map((s) => (
                <div key={s.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="ios-text-footnote font-medium text-black dark:text-white">
                      {CATEGORY_LABELS[s.category] || s.category}
                    </span>
                    <span className="ios-text-caption font-semibold text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] tabular-nums">
                      {Math.round(s.score)}
                    </span>
                  </div>
                  <div className="h-[3px] bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.24)] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.score}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-black dark:bg-white rounded-full"
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Top category */}
      {topCat && topCat.score > 50 && (
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="section-header mb-1">Deine Stärke</p>
            <p className="ios-text-headline text-black dark:text-white">
              {CATEGORY_LABELS[topCat.category] || topCat.category}
            </p>
          </div>
          <span className="ios-text-title1 text-black dark:text-white tabular-nums">
            {Math.round(topCat.score)}
          </span>
        </div>
      )}
    </div>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="ios-text-title3 text-black dark:text-white tabular-nums">{value}</div>
      <div className="ios-text-caption text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-0.5">{label}</div>
    </div>
  );
}
