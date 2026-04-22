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
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('volume');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch markets from Falcon API
      const mRes = await fetch('/api/markets', { method: 'GET' });
      const mData = await mRes.json();
      if (!mRes.ok) throw new Error(mData.error || 'Markets fetch failed');

      const mkts = mData.results || [];
      setMarkets(mkts);

      // 2. Collect all side_a token IDs and fetch prices from Polymarket CLOB
      const tokenIds = mkts
        .map((m) => m.side_a_token_id)
        .filter(Boolean)
        .filter((t) => t.length > 10);

      if (tokenIds.length > 0) {
        const pRes = await fetch('/api/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokens: tokenIds }),
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          setPrices(pData);
        }
      }

      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getYesPrice = (m) => {
    const tokenId = m.side_a_token_id;
    if (!tokenId) return null;
    const p = prices[tokenId];
    if (!p) return null;
    return p.BUY !== undefined ? p.BUY : (p.SELL !== undefined ? p.SELL : null);
  };

  const filtered = markets
    .filter((m) => {
      if (!filter) return true;
      return (m.question || '').toLowerCase().includes(filter.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'volume') return (parseFloat(b.volume_total) || 0) - (parseFloat(a.volume_total) || 0);
      if (sortBy === 'endDate') return new Date(a.end_date) - new Date(b.end_date);
      return 0;
    });

  const totalVolume = markets.reduce((s, m) => s + (parseFloat(m.volume_total) || 0), 0);
  const activeMarkets = markets.filter((m) => !m.closed).length;
  const marketsWithPrices = markets.filter((m) => getYesPrice(m) !== null).length;

  return (
    <>
      <Head>
        <title>Polymarket Live Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)', color: '#fff', fontFamily: "'Segoe UI', sans-serif", padding: '0 0 40px' }}>
        {/* Header */}
        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>Polymarket Live Dashboard</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.6 }}>Real-time prediction market data via Falcon API</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdated && <span style={{ fontSize: 12, opacity: 0.5 }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
            <button onClick={loadData} disabled={loading} style={{ background: loading ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.8)', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 18px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{ display: 'flex', gap: 16, padding: '20px 32px', flexWrap: 'wrap' }}>
          {[{ label: 'Total Volume', value: fmt$(totalVolume) }, { label: 'Active Markets', value: activeMarkets }, { label: 'With Live Prices', value: marketsWithPrices }, { label: 'Auto-refresh', value: '60s' }].map((s) => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 20px', flex: '1 1 140px', minWidth: 120 }}>
              <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, padding: '0 32px 20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search markets..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 13, flex: '1 1 250px', outline: 'none' }}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>
            <option value="volume">Sort: Volume</option>
            <option value="endDate">Sort: End Date</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 32px 20px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 10, padding: '12px 16px', fontSize: 13 }}>
            Error: {error}
          </div>
        )}

        {/* Market Grid */}
        {loading && markets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.5 }}>Loading markets...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', opacity: 0.5 }}>No markets found</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, padding: '0 32px' }}>
            {filtered.map((m, i) => {
              const yesPrice = getYesPrice(m);
              const noPrice = yesPrice !== null ? 1 - parseFloat(yesPrice) : null;
              const vol = parseFloat(m.volume_total) || 0;
              const yesPct = yesPrice !== null ? parseFloat(yesPrice) * 100 : null;
              const endDate = m.end_date ? new Date(m.end_date).toLocaleDateString() : 'N/A';

              return (
                <div key={m.condition_id || i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 18, transition: 'transform 0.15s', cursor: 'default' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 14, minHeight: 40 }}>{m.question || 'Unknown Market'}</div>

                  {/* Price bar */}
                  {yesPct !== null && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: 0.6, marginBottom: 4 }}>
                        <span>{m.side_a_outcome || 'YES'} {fmtPct(yesPrice)}</span>
                        <span>{m.side_b_outcome || 'NO'} {fmtPct(noPrice)}</span>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{ width: yesPct + '%', height: '100%', background: yesPct > 60 ? '#22c55e' : yesPct < 40 ? '#ef4444' : '#f59e0b', transition: 'width 0.5s' }} />
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
                    <div style={{ background: yesPrice !== null ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', border: yesPrice !== null ? '1px solid rgba(34,197,94,0.3)' : 'none', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.side_a_outcome || 'YES'}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: yesPrice !== null ? '#4ade80' : '#888' }}>{yesPrice !== null ? fmtPct(yesPrice) : 'N/A'}</div>
                    </div>
                    <div style={{ background: noPrice !== null ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', border: noPrice !== null ? '1px solid rgba(239,68,68,0.3)' : 'none', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.side_b_outcome || 'NO'}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2, color: noPrice !== null ? '#f87171' : '#888' }}>{noPrice !== null ? fmtPct(noPrice) : 'N/A'}</div>
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
