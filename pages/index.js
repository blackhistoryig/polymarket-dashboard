import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawDebug, setRawDebug] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: 574, query: '' })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      // Store raw for debugging
      setRawDebug(data.raw);

      // Try multiple response shapes from Falcon
      let parsed = [];

      if (Array.isArray(data.results) && data.results.length > 0) {
        parsed = data.results;
      } else if (Array.isArray(data.data) && data.data.length > 0) {
        parsed = data.data;
      } else if (data.raw) {
        // Falcon sometimes returns a formatted string or nested object
        const raw = data.raw;
        if (Array.isArray(raw)) {
          parsed = raw;
        } else if (raw.results && Array.isArray(raw.results)) {
          parsed = raw.results;
        } else if (raw.data && Array.isArray(raw.data)) {
          parsed = raw.data;
        } else if (raw.markets && Array.isArray(raw.markets)) {
          parsed = raw.markets;
        } else if (typeof raw === 'string') {
          // Try to extract JSON from string
          try {
            const inner = JSON.parse(raw);
            parsed = inner.results || inner.data || inner.markets || (Array.isArray(inner) ? inner : []);
          } catch (e) {}
        }
      }

      setMarkets(parsed);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price) => {
    if (price === undefined || price === null) return 'N/A';
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return (num * 100).toFixed(1) + '%';
  };

  const formatVolume = (vol) => {
    if (!vol) return '$0';
    const num = parseFloat(vol);
    if (isNaN(num)) return vol;
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  };

  return (
    <>
      <Head>
        <title>Polymarket Live Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>📊 Polymarket Live Dashboard</h1>
          <p style={styles.subtitle}>Real-time prediction market data powered by Falcon API</p>
          <button onClick={loadMarkets} disabled={loading} style={styles.button}>
            {loading ? 'Loading...' : '⟳ Refresh'}
          </button>
          {lastUpdated && (
            <p style={styles.updated}>Last updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>

        {error && (
          <div style={styles.error}>
            <strong>Error:</strong> {error}
            {rawDebug && (
              <details style={{marginTop: 8}}>
                <summary>API Debug Info</summary>
                <pre style={{fontSize: 11, overflow: 'auto', maxHeight: 200}}>
                  {JSON.stringify(rawDebug, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {!loading && !error && markets.length === 0 && rawDebug && (
          <div style={styles.error}>
            <strong>No markets parsed.</strong> Raw API response:
            <details style={{marginTop: 8}}>
              <summary>Show raw data</summary>
              <pre style={{fontSize: 11, overflow: 'auto', maxHeight: 300}}>
                {JSON.stringify(rawDebug, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {!loading && !error && markets.length === 0 && !rawDebug && (
          <p style={styles.empty}>No markets found</p>
        )}

        <div style={styles.grid}>
          {markets.map((market, i) => (
            <div key={market.id || market.condition_id || i} style={styles.card}>
              <h3 style={styles.cardTitle}>{market.question || market.title || market.name || 'Unknown Market'}</h3>
              <div style={styles.cardBody}>
                <div style={styles.stat}>
                  <span style={styles.label}>Volume</span>
                  <span style={styles.value}>{formatVolume(market.volume || market.volumeNum || market.total_volume)}</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.label}>Yes Price</span>
                  <span style={{...styles.value, color: '#4ade80'}}>
                    {formatPrice(market.outcomePrices?.[0] || market.yes_price || market.price)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.label}>No Price</span>
                  <span style={{...styles.value, color: '#f87171'}}>
                    {formatPrice(market.outcomePrices?.[1] || market.no_price)}
                  </span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.label}>Status</span>
                  <span style={styles.value}>{market.active ? 'Active' : (market.status || 'Open')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '24px', fontFamily: 'system-ui, sans-serif' },
  header: { textAlign: 'center', marginBottom: 32, color: 'white' },
  title: { fontSize: 32, fontWeight: 700, margin: '0 0 8px' },
  subtitle: { fontSize: 16, opacity: 0.85, margin: '0 0 16px' },
  button: { background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 15, backdropFilter: 'blur(4px)' },
  updated: { fontSize: 12, opacity: 0.7, marginTop: 8 },
  error: { background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 24, maxWidth: 900, margin: '0 auto 24px' },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 18 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, maxWidth: 1400, margin: '0 auto' },
  card: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.2)', color: 'white' },
  cardTitle: { fontSize: 15, fontWeight: 600, margin: '0 0 12px', lineHeight: 1.4 },
  cardBody: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  stat: { background: 'rgba(0,0,0,0.15)', borderRadius: 8, padding: '8px 10px' },
  label: { display: 'block', fontSize: 11, opacity: 0.7, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, fontWeight: 600 },
};
