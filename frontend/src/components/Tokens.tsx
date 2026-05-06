import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ApiService } from '../services/ApiService';
import { useAuth } from '../App';

interface TokenInfo {
  tokens: number;
  streak: number;
  subscription: string;
  pro_until?: string;
  history: { id: number; amount: number; reason: string; created_at: string }[];
}

const earnRules = [
  { action: 'Antwort ab 40 Wörtern', reward: '+1 Token' },
  { action: 'Antwort ab 80 Wörtern', reward: '+2 Tokens' },
  { action: 'Streak Tag 3',          reward: '+1 Token' },
  { action: 'Streak Tag 5',          reward: '+2 Tokens' },
  { action: 'Streak Tag 7',          reward: '+3 Tokens' },
  { action: 'Promo-Code einlösen',   reward: '+30 Tokens' },
];

export default function Tokens() {
  const { user, setUser } = useAuth();
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    ApiService.getTokens().then(setInfo).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const result = await ApiService.redeemCode(code.trim());
      setInfo((prev) => prev ? { ...prev, tokens: result.tokens, subscription: result.subscription } : prev);
      if (user) setUser({ ...user, tokens: result.tokens, subscription: result.subscription as 'free' | 'pro' });
      setRedeemMsg({ type: 'success', text: 'Code eingelöst.' });
      setCode('');
    } catch (err: unknown) {
      setRedeemMsg({ type: 'error', text: err instanceof Error ? err.message : 'Ungültiger Code.' });
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center min-h-[60vh]">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="ios-text-title1 text-black dark:text-white mb-6">Tokens</h1>

      {/* Balance */}
      <div className="card p-6 mb-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="section-header mb-2">Guthaben</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-black dark:text-white tabular-nums" style={{ letterSpacing: '-0.04em' }}>
                {info?.tokens ?? user?.tokens ?? 0}
              </span>
              <span className="ios-text-subhead text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)]">Tokens</span>
            </div>
          </div>
          <div className="text-right">
            <p className="section-header mb-1">Status</p>
            <p className="ios-text-headline text-black dark:text-white">
              {info?.subscription ?? user?.subscription ?? 'Free'}
            </p>
            <p className="ios-text-caption text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)]">
              {info?.streak ?? user?.streak ?? 0} Tage Streak
            </p>
          </div>
        </div>
      </div>

      {/* Redeem */}
      <div className="card p-5 mb-5">
        <p className="section-header mb-4">Promo-Code einlösen</p>
        {redeemMsg && (
          <div className={`mb-4 alert-${redeemMsg.type === 'success' ? 'success' : 'error'}`}>
            {redeemMsg.text}
          </div>
        )}
        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            type="text"
            className="input-field flex-1 uppercase ios-text-subhead"
            placeholder="Code eingeben"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" className="btn-primary px-5" disabled={redeeming}>
            {redeeming ? '...' : 'Einlösen'}
          </button>
        </form>
      </div>

      {/* Earn rules */}
      <p className="section-header mb-2 px-1">Tokens verdienen</p>
      <div className="list-group mb-5">
        {earnRules.map((item, i) => (
          <div key={i} className="list-row">
            <span className="ios-text-subhead text-black dark:text-white flex-1">{item.action}</span>
            <span className="ios-text-subhead font-semibold text-[rgba(60,60,67,0.5)] dark:text-[rgba(235,235,245,0.4)] tabular-nums">
              {item.reward}
            </span>
          </div>
        ))}
      </div>

      {/* History */}
      {info?.history && info.history.length > 0 && (
        <>
          <p className="section-header mb-2 px-1">Verlauf</p>
          <div className="list-group">
            {info.history.map((t) => (
              <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="list-row">
                <div className="flex-1">
                  <p className="ios-text-subhead font-medium text-black dark:text-white">{t.reason}</p>
                  <p className="ios-text-caption text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.35)] mt-0.5">
                    {new Date(t.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`ios-text-subhead font-bold tabular-nums ml-3 ${
                  t.amount >= 0 ? 'text-black dark:text-white' : 'text-[rgba(60,60,67,0.45)] dark:text-[rgba(235,235,245,0.4)]'
                }`}>
                  {t.amount >= 0 ? '+' : ''}{t.amount}
                </span>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
