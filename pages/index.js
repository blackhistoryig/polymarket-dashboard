import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

// Format currency
const fmt$ = (n) => {
  if (!n && n !== 0) return '$0';
  const v = parseFloat(n);
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
};

// Format percentage
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
  const [dataSource, setDataSource] = useState('gamma');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/markets?limit=50');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Markets fetch failed');
      setMarkets(data.results || []);
      setDataSource(data.source || 'gamma');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 60000); // Auto-refresh every 60 seconds
    return () => clearInterval(t);
  }, [loadData]);

  const filteredMarkets = markets
    .filter(m => m.question.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'volume') return (b.volume_total || 0) - (a.volume_total || 0);
      if (sortBy === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0);
      if (sortBy === 'endDate') {
        const dateA = new Date(a.end_date);
        const dateB = new Date(b.end_date);
        return dateA - dateB;
      }
      return 0;
    });

  // Calculate total volume and 24h volume
  const totalVolume = markets.reduce((sum, m) => sum + (parseFloat(m.volume_total) || 0), 0);
  const volume24h = markets.reduce((sum, m) => sum + (parseFloat(m.volume_24h) || 0), 0);

  return (
    <div style={{ background: '#0d0f14', minHeight: '100vh', color: '#fff', padding: '20px' }}>
      <Head>
        <title>Polymarket Live Dashboard</title>
      </Head>

      {/* Header */}
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 8, textAlign: 'center' }}>Polymarket Live Dashboard</h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 30 }}>Real-time Orderbook & Trades (Falcon API)</p>

        {/* Stats Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 30
        }}>
          <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: 8 }}>Total Volume</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#4f9aff' }}>{fmt$(totalVolume)}</div>
          </div>
          <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: 8 }}>24h Volume</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#4f9aff' }}>{fmt$(volume24h)}</div>
          </div>
          <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: 8 }}>Active Markets</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#4f9aff' }}>{markets.length}</div>
          </div>
          <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: '0.875rem', color: '#888', marginBottom: 8 }}>Data Source</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#10b981', textTransform: 'capitalize' }}>{dataSource}</div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={loadData}
            style={{
              background: '#4f9aff',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 600
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {lastUpdated && (
            <span style={{ color: '#888', fontSize: '0.875rem' }}>Updated: {lastUpdated}</span>
          )}
          <div style={{ flex: 1 }} />
          <input
            type="text"
            placeholder="Search markets..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              background: '#16181d',
              border: '1px solid #333',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 16
            }}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              background: '#16181d',
              border: '1px solid #333',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 16
            }}
          >
            <option value="volume">Top Volume</option>
            <option value="liquidity">Top Liquidity</option>
            <option value="endDate">Earliest End Date</option>
          </select>
        </div>

        {error && (
          <div style={{ background: '#dc2626', color: '#fff', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            Error: {error}
          </div>
        )}

        {/* Markets Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: 20
        }}>
          {filteredMarkets.map((m, i) => {
            const yesPrice = parseFloat(m.last_trade_price);
            const noPrice = 1 - yesPrice;
            
            return (
              <div
                key={i}
                style={{
                  background: '#16181d',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: 20,
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#4f9aff';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 154, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Clickable link icon */}
                <a
                  href={m.poly_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    color: '#888',
                    fontSize: '1.25rem',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#4f9aff'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                >
                  ↗
                </a>

                {/* Question */}
                <h3 style={{ fontSize: '1.125rem', marginBottom: 16, paddingRight: 40, lineHeight: 1.4 }}>
                  {m.question}
                </h3>

                {/* YES/NO Probability Bars */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.875rem', color: '#10b981' }}>YES</span>
                    <span style={{ fontSize: '0.875rem', color: '#10b981', fontWeight: 600 }}>
                      {fmtPct(yesPrice)}
                    </span>
                  </div>
                  <div style={{ background: '#1f2937', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                      background: '#10b981',
                      height: '100%',
                      width: `${yesPrice * 100}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>NO</span>
                    <span style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 600 }}>
                      {fmtPct(noPrice)}
                    </span>
                  </div>
                  <div style={{ background: '#1f2937', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      background: '#ef4444',
                      height: '100%',
                      width: `${noPrice * 100}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Market Stats */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#888' }}>Vol: </span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{fmt$(m.volume_total)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#888' }}>Liq: </span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{fmt$(m.liquidity)}</span>
                  </div>
                  {m.spread && (
                    <div>
                      <span style={{ color: '#888' }}>Spread: </span>
                      <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fmtPct(m.spread)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredMarkets.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
            No markets found
          </div>
        )}
      </div>
    </div>
  );
}
