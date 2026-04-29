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

// ── Card Component ──────────────────────────────────────────────────────────
function MarketCard({ m, onFlip }) {
  const yesPrice = parseFloat(m.last_trade_price) || 0;
  const noPrice = 1 - yesPrice;

  return (
    <div
      onClick={() => onFlip(m)}
      style={{
        background: '#16181d',
        border: '1px solid #333',
        borderRadius: 12,
        padding: 20,
        position: 'relative',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = '#4f9aff';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(79,154,255,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#333';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* External link — stops propagation so card click doesn't fire */}
      <a
        href={m.poly_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 14, right: 14,
          color: '#888', fontSize: '1.1rem', textDecoration: 'none',
          transition: 'color 0.2s', zIndex: 1,
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#4f9aff'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
      >
        ↗
      </a>

      <h3 style={{ fontSize: '1.05rem', marginBottom: 14, paddingRight: 36, lineHeight: 1.4 }}>
        {m.question}
      </h3>

      {/* YES / NO bars */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>YES</span>
          <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>{fmtPct(yesPrice)}</span>
        </div>
        <div style={{ background: '#1f2937', borderRadius: 4, height: 7, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ background: '#10b981', height: '100%', width: `${yesPrice * 100}%`, transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>NO</span>
          <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>{fmtPct(noPrice)}</span>
        </div>
        <div style={{ background: '#1f2937', borderRadius: 4, height: 7, overflow: 'hidden' }}>
          <div style={{ background: '#ef4444', height: '100%', width: `${noPrice * 100}%`, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: '0.8rem', color: '#aaa' }}>
        <span>Vol: <strong style={{ color: '#fff' }}>{fmt$(m.volume_total)}</strong></span>
        <span>Liq: <strong style={{ color: '#10b981' }}>{fmt$(m.liquidity)}</strong></span>
        {m.spread && <span>Spread: <strong style={{ color: '#f59e0b' }}>{fmtPct(m.spread)}</strong></span>}
      </div>

      {/* Click hint */}
      <div style={{ marginTop: 10, fontSize: '0.72rem', color: '#555', textAlign: 'right' }}>
        Click for orderbook &amp; trades ▶
      </div>
    </div>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ market, onClose }) {
  const [details, setDetails] = useState({ orderbook: null, trades: [], loading: true });

  useEffect(() => {
    if (!market) return;
    setDetails({ orderbook: null, trades: [], loading: true });
    const load = async () => {
      try {
        const [obRes, trRes] = await Promise.all([
          fetch(`/api/orderbook?token_id=${market.token_id}`),
          fetch(`/api/trades?slug=${market.slug}&condition_id=${market.condition_id}`),
        ]);
        const [obData, trData] = await Promise.all([obRes.json(), trRes.json()]);
        setDetails({ orderbook: obData || null, trades: trData.results || [], loading: false });
      } catch (e) {
        console.error('Detail load failed:', e);
        setDetails((p) => ({ ...p, loading: false }));
      }
    };
    load();
  }, [market]);

  if (!market) return null;

  const yesPrice = parseFloat(market.last_trade_price) || 0;
  const noPrice = 1 - yesPrice;

  return (
    /* Backdrop */
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Modal panel — stop propagation so inner clicks don't close */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#16181d', border: '1px solid #333', borderRadius: 16,
          width: '100%', maxWidth: 820, maxHeight: '90vh', overflow: 'auto',
          padding: 28, position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: '#333', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%',
            cursor: 'pointer', fontSize: 18, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        {/* Title + link */}
        <div style={{ paddingRight: 40, marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.15rem', lineHeight: 1.4, marginBottom: 6 }}>{market.question}</h2>
          <a
            href={market.poly_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#4f9aff', fontSize: '0.85rem' }}
          >
            Open on Polymarket ↗
          </a>
        </div>

        {/* YES / NO bars (back-of-card) */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#10b981', fontSize: '0.85rem' }}>YES</span>
            <span style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>{fmtPct(yesPrice)}</span>
          </div>
          <div style={{ background: '#1f2937', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ background: '#10b981', height: '100%', width: `${yesPrice * 100}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>NO</span>
            <span style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>{fmtPct(noPrice)}</span>
          </div>
          <div style={{ background: '#1f2937', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{ background: '#ef4444', height: '100%', width: `${noPrice * 100}%` }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24, fontSize: '0.85rem', color: '#aaa' }}>
          <span>Vol: <strong style={{ color: '#fff' }}>{fmt$(market.volume_total)}</strong></span>
          <span>Liq: <strong style={{ color: '#10b981' }}>{fmt$(market.liquidity)}</strong></span>
          {market.spread && <span>Spread: <strong style={{ color: '#f59e0b' }}>{fmtPct(market.spread)}</strong></span>}
          {market.end_date && <span>Ends: <strong style={{ color: '#fff' }}>{new Date(market.end_date).toLocaleDateString()}</strong></span>}
        </div>

        {details.loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading orderbook &amp; trades…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* Orderbook */}
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: '#ccc', borderBottom: '1px solid #333', paddingBottom: 8 }}>Orderbook</h3>
              {/* Asks */}
              <div style={{ marginBottom: 8 }}>
                {(details.orderbook?.asks?.slice(0, 5) || []).reverse().map((a, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0', color: '#ef4444' }}>
                    <span>{parseFloat(a.price).toFixed(3)}</span>
                    <span style={{ color: '#888' }}>{Math.round(a.size)}</span>
                  </div>
                ))}
              </div>
              {/* Spread divider */}
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#555', borderTop: '1px solid #222', borderBottom: '1px solid #222', padding: '4px 0', marginBottom: 8 }}>
                spread
              </div>
              {/* Bids */}
              <div>
                {(details.orderbook?.bids?.slice(0, 5) || []).map((b, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '3px 0', color: '#10b981' }}>
                    <span>{parseFloat(b.price).toFixed(3)}</span>
                    <span style={{ color: '#888' }}>{Math.round(b.size)}</span>
                  </div>
                ))}
              </div>
              {!details.orderbook && <div style={{ color: '#555', fontSize: '0.82rem' }}>No orderbook data</div>}
            </div>

            {/* Recent Trades */}
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 12, color: '#ccc', borderBottom: '1px solid #333', paddingBottom: 8 }}>Recent Trades</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: '3px 8px', fontSize: '0.78rem', color: '#666', marginBottom: 6 }}>
                <span>Side</span><span>Price</span><span>Size</span>
              </div>
              {details.trades.slice(0, 20).map((t, j) => (
                <div key={j} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr', gap: '3px 8px', fontSize: '0.82rem', padding: '2px 0', borderBottom: '1px solid #1a1c22' }}>
                  <span style={{ color: t.side === 'BUY' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{t.side}</span>
                  <span>{parseFloat(t.price).toFixed(3)}</span>
                  <span style={{ color: '#aaa' }}>{fmt$(t.size * t.price)}</span>
                </div>
              ))}
              {details.trades.length === 0 && <div style={{ color: '#555', fontSize: '0.82rem' }}>No recent trades</div>}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  const [dataSource, setDataSource] = useState('gamma');
  const [selectedMarket, setSelectedMarket] = useState(null);

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
    const t = setInterval(loadData, 60000);
    return () => clearInterval(t);
  }, [loadData]);

  // Close modal on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelectedMarket(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filteredMarkets = markets
    .filter((m) => m.question.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'volume') return (b.volume_total || 0) - (a.volume_total || 0);
      if (sortBy === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0);
      if (sortBy === 'endDate') return new Date(a.end_date) - new Date(b.end_date);
      return 0;
    });

  const totalVolume = markets.reduce((s, m) => s + (parseFloat(m.volume_total) || 0), 0);
  const volume24h = markets.reduce((s, m) => s + (parseFloat(m.volume_24h) || 0), 0);

  return (
    <div style={{ background: '#0d0f14', minHeight: '100vh', color: '#fff', padding: '20px' }}>
      <Head><title>Polymarket Live Dashboard</title></Head>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.4rem', marginBottom: 8, textAlign: 'center' }}>Polymarket Live Dashboard</h1>
        <p style={{ textAlign: 'center', color: '#888', marginBottom: 28 }}>Real-time Orderbook &amp; Trades (Falcon API)</p>

        {/* Stats bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[['Total Volume', fmt$(totalVolume), '#4f9aff'], ['24h Volume', fmt$(volume24h), '#4f9aff'], ['Active Markets', markets.length, '#4f9aff'], ['Data Source', dataSource, '#10b981']].map(([label, val, color]) => (
            <div key={label} style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 18 }}>
              <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 'bold', color, textTransform: 'capitalize' }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={loadData}
            style={{ background: '#4f9aff', color: '#fff', border: 'none', padding: '11px 22px', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {lastUpdated && <span style={{ color: '#888', fontSize: '0.85rem' }}>Updated: {lastUpdated}</span>}
          <div style={{ flex: 1 }} />
          <input
            type="text" placeholder="Search markets..."
            value={filter} onChange={(e) => setFilter(e.target.value)}
            style={{ flex: 1, minWidth: 200, background: '#16181d', border: '1px solid #333', color: '#fff', padding: '11px 16px', borderRadius: 8, fontSize: 15 }}
          />
          <select
            value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ background: '#16181d', border: '1px solid #333', color: '#fff', padding: '11px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 15 }}
          >
            <option value="volume">Top Volume</option>
            <option value="liquidity">Top Liquidity</option>
            <option value="endDate">Earliest End Date</option>
          </select>
        </div>

        {error && (
          <div style={{ background: '#dc2626', color: '#fff', padding: 14, borderRadius: 8, marginBottom: 20 }}>Error: {error}</div>
        )}

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
          {filteredMarkets.map((m, i) => (
            <MarketCard key={i} m={m} onFlip={setSelectedMarket} />
          ))}
        </div>

        {filteredMarkets.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>No markets found</div>
        )}
      </div>

      {/* Detail Modal */}
      <DetailModal market={selectedMarket} onClose={() => setSelectedMarket(null)} />
    </div>
  );
}
