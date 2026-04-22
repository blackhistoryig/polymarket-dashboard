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
  return (v * 100).toFixed(1) + '%';
};

export default function Dashboard() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [details, setDetails] = useState({ orderbook: null, trades: [], loading: false });

  const loadData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch('/api/markets');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Markets fetch failed');
      setMarkets(data.results || []);
      setLastUpdated(new Date());
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);

  const loadDetails = async (m) => {
    setDetails({ orderbook: null, trades: [], loading: true });
    try {
      const [obRes, trRes] = await Promise.all([
        fetch('/api/orderbook?slug=' + m.market_slug),
        fetch('/api/trades?slug=' + m.market_slug)
      ]);
      const [obData, trData] = await Promise.all([obRes.json(), trRes.json()]);
      setDetails({ orderbook: obData.results, trades: trData.results, loading: false });
    } catch (e) {
      console.error(e);
      setDetails(prev => ({ ...prev, loading: false }));
    }
  };

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

  return (
    <div style={{ background: '#0a0b0d', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Head>
        <title>Polymarket Live Dashboard</title>
      </Head>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        <header style={{ marginBottom: 40, borderBottom: '1px solid #333', paddingBottom: 24, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>Polymarket Live Dashboard</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.5 }}>Real-time Orderbook & Trades</p>
          </div>
          <button onClick={loadData} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
            {loading ? '...' : 'Refresh'}
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 40 }}>
           <div style={{ background: '#16181d', padding: 20, borderRadius: 12 }}>
             <div style={{ fontSize: 12, opacity: 0.5 }}>TOTAL VOLUME</div>
             <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt$(totalVol)}</div>
           </div>
           <div style={{ background: '#16181d', padding: 20, borderRadius: 12 }}>
             <div style={{ fontSize: 12, opacity: 0.5 }}>ACTIVE MARKETS</div>
             <div style={{ fontSize: 20, fontWeight: 700 }}>{markets.length}</div>
           </div>
           <div style={{ background: '#16181d', padding: 20, borderRadius: 12 }}>
             <div style={{ fontSize: 12, opacity: 0.5 }}>LIVE PRICES</div>
             <div style={{ fontSize: 20, fontWeight: 700 }}>{markets.filter(m => getYesPrice(m) !== null).length}</div>
           </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {filtered.map((m, i) => (
            <div key={i} onClick={() => { setSelectedMarket(m); loadDetails(m); }} style={{ background: '#16181d', padding: 20, borderRadius: 12, border: '1px solid #333', cursor: 'pointer' }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{m.question}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#22c55e' }}>{fmtPct(getYesPrice(m))}</span>
                <span style={{ opacity: 0.5 }}>{fmt$(m.volume_total)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMarket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#16181d', width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto', borderRadius: 16, border: '1px solid #333', padding: 30, position: 'relative' }}>
            <button onClick={() => setSelectedMarket(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>&times;</button>
            <h2 style={{ marginTop: 0 }}>{selectedMarket.question}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 20 }}>
              <div>
                <h3>Orderbook</h3>
                {details.loading ? <p>Loading...</p> : (
                  <div>
                    <div style={{ color: '#ef4444' }}>
                      {details.orderbook?.asks?.slice(0, 5).reverse().map((a, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{a.price}</span><span>{a.size}</span></div>
                      ))}
                    </div>
                    <div style={{ height: 1, background: '#333', margin: '8px 0' }}></div>
                    <div style={{ color: '#22c55e' }}>
                      {details.orderbook?.bids?.slice(0, 5).map((b, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{b.price}</span><span>{b.size}</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3>Recent Trades</h3>
                {details.loading ? <p>Loading...</p> : (
                  <div>
                    {details.trades?.slice(0, 10).map((t, j) => (
                      <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: t.side === 'BUY' ? '#22c55e' : '#ef4444' }}>{t.side}</span>
                        <span>{t.price}</span>
                        <span style={{ opacity: 0.5 }}>{fmt$(t.size * t.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
