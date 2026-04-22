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
  
  // Modal & Detail State
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
        fetch(`/api/orderbook?slug=\${m.market_slug}`),
        fetch(`/api/trades?slug=\${m.market_slug}`)
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
    <div style={{ background: '#0a0b0d', color: '#fff', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Head>
        <title>Polymarket Live Dashboard</title>
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
      </Head>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        <header style={{ marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Polymarket Live Dashboard</h1>
            <p style={{ margin: '8px 0 0', fontSize: 14, opacity: 0.5 }}>Falcon API + Polymarket Analytics</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             {lastUpdated && <span style={{ fontSize: 12, opacity: 0.4 }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
             <button onClick={loadData} disabled={loading} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {loading ? 'Refreshing...' : 'Refresh Now'}
             </button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
           {[
             { label: 'Total Volume', value: fmt$(totalVol) },
             { label: 'Active Markets', value: markets.length },
             { label: 'With Live Prices', value: markets.filter(m => getYesPrice(m) !== null).length },
             { label: 'Refresh Rate', value: '60s' }
           ].map((s, i) => (
             <div key={i} style={{ background: '#16181d', padding: '20px 24px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ fontSize: 12, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{s.label}</div>
               <div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div>
             </div>
           ))}
        </div>

        <div style={{ marginBottom: 32, display: 'flex', gap: 12 }}>
          <input 
            placeholder=\"Search markets...\" 
            value={filter} 
            onChange={e => setFilter(e.target.value)}
            style={{ flex: 1, background: '#16181d', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: 10, color: '#fff', fontSize: 15 }}
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: '#16181d', border: '1px solid rgba(255,255,255,0.1)', padding: '0 16px', borderRadius: 10, color: '#fff' }}>
            <option value=\"volume\">Sort by Volume</option>
            <option value=\"endDate\">Sort by End Date</option>
          </select>
        </div>

        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: 16, borderRadius: 12, marginBottom: 20 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filtered.map((m, i) => {
            const yesPrice = getYesPrice(m);
            const noPrice = yesPrice !== null ? 1 - yesPrice : null;
            return (
              <div 
                key={i} 
                onClick={() => { setSelectedMarket(m); loadDetails(m); }}
                style={{ background: '#16181d', padding: 24, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              >
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, lineHeight: 1.4, minHeight: 44 }}>{m.question}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>YES PRICE</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{fmtPct(yesPrice)}</div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>VOLUME</div>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt$(m.volume_total)}</div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                   <div style={{ width: \`\${(yesPrice || 0) * 100}%\`, height: '100%', background: '#22c55e' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Overlay */}
      {selectedMarket && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
           <div style={{ background: '#16181d', width: '100%', maxWidth: 840, maxHeight: '90vh', overflow: 'hidden', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
             <div style={{ padding: 32, borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                <button onClick={() => setSelectedMarket(null)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', opacity: 0.5 }}>&times;</button>
                <h2 style={{ margin: '0 0 8px', fontSize: 22, paddingRight: 40 }}>{selectedMarket.question}</h2>
                <div style={{ display: 'flex', gap: 20, fontSize: 14, opacity: 0.6 }}>
                   <span>Volume: {fmt$(selectedMarket.volume_total)}</span>
                   <span>Ends: {new Date(selectedMarket.end_date).toLocaleDateString()}</span>
                </div>
             </div>
             
             <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                {/* Orderbook Column */}
                <div>
                   <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, marginBottom: 20 }}>Live Orderbook</h3>
                   {details.loading ? <div style={{ opacity: 0.3 }}>Fetching orderbook...</div> : (
                     <div>
                        {/* Asks (Sells) */}
                        <div style={{ marginBottom: 4 }}>
                           {details.orderbook?.asks?.slice(0, 8).reverse().map((a, i) => (
                             <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                               <span style={{ color: '#ef4444' }}>{parseFloat(a.price).toFixed(3)}</span>
                               <span style={{ opacity: 0.4 }}>{parseFloat(a.size).toFixed(0)}</span>
                             </div>
                           ))}
                        </div>
                        {/* Spread / Mid */}
                        <div style={{ padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', margin: '8px 0', textAlign: 'center', fontSize: 18, fontWeight: 700 }}>
                           {fmtPct(getYesPrice(selectedMarket))}
                        </div>
                        {/* Bids (Buys) */}
                        <div>
                           {details.orderbook?.bids?.slice(0, 8).map((b, i) => (
                             <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                               <span style={{ color: '#22c55e' }}>{parseFloat(b.price).toFixed(3)}</span>
                               <span style={{ opacity: 0.4 }}>{parseFloat(b.size).toFixed(0)}</span>
                             </div>
                           ))}
                        </div>
                        {!details.orderbook && <div style={{ fontSize: 12, opacity: 0.3 }}>No orderbook data available for this market.</div>}
                     </div>
                   )}
                </div>

                {/* Trades Column */}
                <div>
                   <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.5, marginBottom: 20 }}>Recent Trades</h3>
                   {details.loading ? <div style={{ opacity: 0.3 }}>Fetching trades...</div> : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {details.trades?.slice(0, 15).map((t, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 8 }}>
                             <span style={{ color: t.side === 'BUY' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{t.side}</span>
                             <span>{parseFloat(t.price).toFixed(3)}</span>
                             <span style={{ opacity: 0.4 }}>{fmt$(t.size * t.price)}</span>
                          </div>
                        ))}
                        {(!details.trades || details.trades.length === 0) && <div style={{ fontSize: 12, opacity: 0.3 }}>No recent trades found.</div>}
                     </div>
                   )}
                </div>
             </div>
             
             <div style={{ padding: 24, borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'right' }}>
                <a href={selectedMarket.poly_url || `https://polymarket.com/event/\${selectedMarket.slug}`} target=\"_blank\" rel=\"noreferrer\" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View on Polymarket &rarr;</a>
             </div>
           </div>
        </div>
      )}

      <style jsx global>{\`
        body { margin: 0; background: #0a0b0d; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      \`}</style>
    </div>
  );
}
