import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Funnel } from '@phosphor-icons/react';
import { ApiService } from '../services/ApiService';
import type { Reflection } from '../types';
import { CATEGORY_LABELS } from '../types';

const CATEGORIES = Object.keys(CATEGORY_LABELS);
const PAGE_SIZE = 20;

export default function ReflectionsList() {
  const navigate = useNavigate();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | undefined>();
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    setPage(1);
    load(1, selectedCat);
  }, [selectedCat]);

  const load = async (p: number, cat?: string) => {
    setLoading(true);
    try {
      const { reflections: items, total: t } = await ApiService.getReflections(p, PAGE_SIZE, cat);
      if (p === 1) setReflections(items);
      else setReflections((prev) => [...prev, ...items]);
      setTotal(t);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const grouped = reflections.reduce<Record<string, Reflection[]>>((acc, r) => {
    const d = new Date(r.created_at).toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    (acc[d] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="ios-text-title1 text-black dark:text-white">Einträge</h1>
          <p className="ios-text-footnote text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mt-1">
            {total} {total === 1 ? 'Reflexion' : 'Reflexionen'}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setShowFilter((v) => !v)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
              showFilter || selectedCat
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-[rgba(120,120,128,0.12)] dark:bg-[rgba(120,120,128,0.24)] text-[rgba(60,60,67,0.6)] dark:text-[rgba(235,235,245,0.5)]'
            }`}
          >
            <Funnel size={16} weight={selectedCat ? 'fill' : 'regular'} />
          </button>
          <button onClick={() => navigate('/reflections/new')} className="btn-primary py-2 px-4 text-[14px]">
            <Plus size={14} weight="bold" className="mr-1" />
            Neu
          </button>
        </div>
      </div>

      {/* Category filter */}
      {showFilter && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden mb-5"
        >
          <div className="flex gap-2 flex-wrap pb-1">
            <button
              onClick={() => setSelectedCat(undefined)}
              className={`category-chip transition-all ${
                !selectedCat ? '!bg-black dark:!bg-white !text-white dark:!text-black' : ''
              }`}
            >
              Alle
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat === selectedCat ? undefined : cat)}
                className={`category-chip transition-all ${
                  selectedCat === cat ? '!bg-black dark:!bg-white !text-white dark:!text-black' : ''
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && reflections.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="spinner" />
        </div>
      ) : reflections.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="ios-text-headline text-black dark:text-white mb-1">Keine Einträge</p>
          <p className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] mb-6">
            {selectedCat ? 'Keine Reflexionen in dieser Kategorie.' : 'Schreibe deine erste Reflexion.'}
          </p>
          <button className="btn-primary" onClick={() => navigate('/reflections/new')}>
            Erste Reflexion
          </button>
        </div>
      ) : (
        <div className="space-y-7">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="section-header mb-2">{date}</h3>
              <div className="list-group">
                {items.map((r, i) => (
                  <motion.button
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/reflections/${r.id}`)}
                    className="list-row w-full text-left"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="ios-text-caption text-[rgba(60,60,67,0.4)] dark:text-[rgba(235,235,245,0.35)]">
                          {new Date(r.created_at).toLocaleTimeString('de-DE', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        {r.category && (
                          <span className="category-chip">{CATEGORY_LABELS[r.category]}</span>
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
          ))}

          {reflections.length < total && (
            <button
              onClick={() => { const next = page + 1; setPage(next); load(next, selectedCat); }}
              disabled={loading}
              className="btn-secondary w-full"
            >
              {loading ? 'Laden...' : 'Mehr laden'}
            </button>
          )}
        </div>
      )}
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
