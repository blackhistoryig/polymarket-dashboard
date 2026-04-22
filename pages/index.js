import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const fmt$ = (n) => {
  if (!n && n !== 0) return '$0';
  const v = parseFloat(n);
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
};

const fmtPct = (n) => {
  if (n === null || n === undefined || n === '') return 'N/A';
  const v = parseFloat(n);
  if (isNaN(v)) return 'N/A';
  return (v * 100).toFixed(0) + '%';
};

export default function Dashboard() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('volume');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/markets');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Markets fetch failed');
      setMarkets(data.results || []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 60000);
    return () => clearInterval(t);
  }, [loadData]);

  const getYesPrice = (m) => {
    if (!m.outcomePrices) return null;
    const prices = Array.isArray(m.outcomePrices) ? m.outcomePrices : [];
    return prices[0] != null ? parseFloat(prices[0]) : null;
  };

  const filtered = [...markets]
    .filter((m) => !filter || (m.question || '').toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'volume') return (parseFloat(b.volume_total) || 0) - (parseFloat(a.volume_total) || 0);
      if (sortBy === 'endDate') return new Date(a.end_date || 0) - new Date(b.end_date || 0);
      return 0;
    });

  const totalVol = markets.reduce((s, m) => s + (parseFloat(m.volume_total) || 0), 0);
  const withPrices = markets.filter((m) => getYesPrice(m) !== null).length;

  return (
    <>
      <Head><title>Polymarket Live Dashboard</title></Head>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#fff', fontFamily: "'Segoe UI', sans-serif" }}>

        {/* Header */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Polymarket Live Dashboard</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.5 }}>Powered by Falcon API + Polymarket Gamma</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdated && <span style={{ fontSize: 12, opacity: 0.5 }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
            <button onClick={loadData} disabled={loading} style={{ background: loading ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.9)', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 18px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16, padding: '20px 32px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Volume', value: fmt$(totalVol) },
            { label: 'Active Markets', value: markets.length },
            { label: 'With Live Prices', value: withPrices },
            { label: 'Auto-refresh', value: '60s' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 20px', flex: '1 1 140px' }}>
              <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, padding: '0 32px 20px', flexWrap: 'wrap' }}>
          <input placeholder="Search markets..." value={filter} onChange={(e) => setFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 13, flex: '1 1 250px', outline: 'none' }} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 13 }}>
            <option value="volume">Sort: Volume</option>
            <option value="endDate">Sort: End Date</option>
          </select>
        </div>

        {error && (
          <div style={{ margin: '0 32px 20px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>Error: {error}</div>
        )}

        {loading && markets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.5 }}>Loading markets...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.5 }}>No markets found</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, padding: '0 32px 40px' }}>
            {filtered.map((m, i) => {
              const yesPrice = getYesPrice(m);
              const noPrice = yesPrice !== null ? 1 - yesPrice : null;
              const vol = parseFloat(m.volume_total) || 0;
              const yesPct = yesPrice !== null ? yesPrice * 100 : null;
              const endDate = m.end_date ? new Date(m.end_date).toLocaleDateString() : 'N/A';
              const barColor = yesPct !== null ? (yesPct > 60 ? '#22c55e' : yesPct < 40 ? '#ef4444' : '#f59e0b') : '#6366f1';

              return (
                <div key={m.condition_id || i}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 18, transition: 'transform 0.15s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.25)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; }}>

                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 14, minHeight: 38 }}>{m.question || 'Unknown Market'}</div>

                  {yesPct !== null && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, marginBottom: 5 }}>
                        <span>{m.side_a_outcome || 'YES'}</span>
                        <span>{m.side_b_outcome || 'NO'}</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, height: 8, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ width: yesPct + '%', height: '100%', background: barColor, borderRadius: 6, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                        <span style={{ color: barColor, fontWeight: 700 }}>{fmtPct(yesPrice)}</span>
                        <span style={{ opacity: 0.6 }}>{fmtPct(noPrice)}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Volume</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{fmt$(vol)}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ends</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{endDate}</div>
                    </div>
                    <div style={{ background: yesPrice !== null ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', border: yesPrice !== null ? '1px solid rgba(34,197,94,0.3)' : 'none', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.side_a_outcome || 'YES'}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: yesPrice !== null ? '#4ade80' : '#666' }}>{yesPrice !== null ? fmtPct(yesPrice) : 'N/A'}</div>
                    </div>
                    <div style={{ background: noPrice !== null ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', border: noPrice !== null ? '1px solid rgba(239,68,68,0.3)' : 'none', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.side_b_outcome || 'NO'}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, color: noPrice !== null ? '#f87171' : '#666' }}>{noPrice !== null ? fmtPct(noPrice) : 'N/A'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
