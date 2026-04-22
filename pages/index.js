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
      setLoading(true);
      setError(null);
      const res = await fetch('/api/markets');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Markets fetch failed');
      setMarkets(data.results || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = async (m) => {
    setDetails({ orderbook: null, trades: [], loading: true });
    try {
      // Orderbook needs token_id, Trades can use slug or condition_id
      const [obRes, trRes] = await Promise.all([
        fetch(`/api/orderbook?token_id=${m.token_id}`),
        fetch(`/api/trades?slug=${m.slug}&condition_id=${m.condition_id}`)
      ]);
      const [obData, trData] = await Promise.all([obRes.json(), trRes.json()]);
      
      setDetails({
        orderbook: obData || null,
        trades: trData.results || [],
        loading: false
      });
    } catch (e) {
      console.error('Failed to load details:', e);
      setDetails(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 60000);
    return () => clearInterval(t);
  }, [loadData]);

  const filteredMarkets = markets
    .filter(m => m.question.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'volume') return b.volume_total - a.volume_total;
      if (sortBy === 'newest') return new Date(b.start_date) - new Date(a.start_date);
      return 0;
    });

  return (
    <div style={{ background: '#0a0b0d', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <Head>
        <title>Polymarket Live Dashboard</title>
      </Head>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800 }}>Polymarket Live Dashboard</h1>
            <p style={{ margin: '8px 0 0', opacity: 0.6 }}>Real-time Orderbook & Trades (Falcon API)</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <button 
              onClick={loadData}
              disabled={loading}
              style={{
                background: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px',
                borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: '0.2s'
              }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            {lastUpdated && <p style={{ fontSize: 12, opacity: 0.4, marginTop: 8 }}>Updated: {lastUpdated}</p>}
          </div>
        </header>

        {error && (
          <div style={{ background: '#ef444422', border: '1px solid #ef4444', color: '#ef4444', padding: 16, borderRadius: 8, marginBottom: 20 }}>
            Error: {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, marginBottom: 30 }}>
          <input 
            type="text"
            placeholder="Search markets..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1, background: '#16181d', border: '1px solid #333', color: '#fff',
              padding: '12px 16px', borderRadius: 8, fontSize: 16
            }}
          />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: '#16181d', border: '1px solid #333', color: '#fff',
              padding: '0 16px', borderRadius: 8, cursor: 'pointer'
            }}
          >
            <option value="volume">Top Volume</option>
            <option value="newest">Newest</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
          {filteredMarkets.map((m, i) => (
            <div 
              key={i}
              onClick={() => { setSelectedMarket(m); loadDetails(m); }}
              style={{
                background: '#16181d', border: '1px solid #333', borderRadius: 12,
                padding: 20, cursor: 'pointer', transition: '0.2s transform',
                ':hover': { transform: 'translateY(-2px)', borderColor: '#444' }
              }}
            >
              <h3 style={{ margin: '0 0 12px', fontSize: 18, lineHeight: 1.4 }}>{m.question}</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 20 }}>
                  {fmtPct(m.last_trade_price)}
                </span>
                <span style={{ opacity: 0.5, fontSize: 14 }}>
                  Vol: {fmt$(m.volume_total)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMarket && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: 20, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#16181d', width: '100%', maxWidth: 900, maxHeight: '90vh',
            overflow: 'auto', borderRadius: 20, border: '1px solid #333',
            padding: 40, position: 'relative'
          }}>
            <button 
              onClick={() => setSelectedMarket(null)}
              style={{
                position: 'absolute', top: 20, right: 20, background: '#333',
                border: 'none', color: '#fff', width: 32, height: 32,
                borderRadius: '50%', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 20
              }}
            >
              &times;
            </button>
            
            <h2 style={{ marginTop: 0, paddingRight: 40 }}>{selectedMarket.question}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 40, marginTop: 30 }}>
              <div>
                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: 10 }}>Orderbook</h3>
                {details.loading ? <p>Loading orderbook...</p> : (
                  <div>
                    {/* Asks (Sells) in Red */}
                    <div style={{ color: '#ef4444' }}>
                      {details.orderbook?.asks?.slice(0, 5).reverse().map((a, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                          <span>{parseFloat(a.price).toFixed(3)}</span>
                          <span style={{ opacity: 0.6 }}>{Math.round(a.size)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ height: 1, background: '#333', margin: '15px 0' }}></div>
                    
                    {/* Bids (Buys) in Green */}
                    <div style={{ color: '#22c55e' }}>
                      {details.orderbook?.bids?.slice(0, 5).map((b, j) => (
                        <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                          <span>{parseFloat(b.price).toFixed(3)}</span>
                          <span style={{ opacity: 0.6 }}>{Math.round(b.size)}</span>
                        </div>
                      ))}
                    </div>
                    
                    {!details.orderbook && !details.loading && <p style={{ opacity: 0.5 }}>No orderbook data</p>}
                  </div>
                )}
              </div>

              <div>
                <h3 style={{ borderBottom: '1px solid #333', paddingBottom: 10 }}>Recent Trades</h3>
                {details.loading ? <p>Loading trades...</p> : (
                  <div style={{ maxHeight: 400, overflow: 'auto' }}>
                    {details.trades?.slice(0, 20).map((t, j) => (
                      <div key={j} style={{ 
                        display: 'flex', justifyContent: 'space-between', 
                        padding: '8px 0', borderBottom: '1px solid #ffffff05', fontSize: 13
                      }}>
                        <span style={{ 
                          color: t.side === 'BUY' ? '#22c55e' : '#ef4444', 
                          fontWeight: 700, width: 40 
                        }}>
                          {t.side}
                        </span>
                        <span>{parseFloat(t.price).toFixed(3)}</span>
                        <span style={{ opacity: 0.5 }}>{fmt$(t.size * t.price)}</span>
                      </div>
                    ))}
                    {(!details.trades || details.trades.length === 0) && <p style={{ opacity: 0.5 }}>No recent trades</p>}
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
