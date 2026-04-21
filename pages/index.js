import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Dashboard() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: 574, // Polymarket Markets agent
          query: ''
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load markets');
      }
      
      setMarkets(data.results || data.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarkets();
    const interval = setInterval(loadMarkets, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Polymarket Live Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <header className="header">
          <h1>📊 Polymarket Live Dashboard</h1>
          <p>Real-time prediction market data powered by Falcon API</p>
        </header>

        <div className="controls">
          <button 
            onClick={loadMarkets} 
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
          {lastUpdated && (
            <span className="last-updated">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>

        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="markets-grid">
          {loading && markets.length === 0 ? (
            <div className="loading">Loading markets...</div>
          ) : markets.length === 0 ? (
            <div className="loading">No markets found</div>
          ) : (
            markets.map((market, index) => (
              <div key={market.id || index} className="market-card">
                <h3 className="market-title">
                  {market.question || market.title || 'Untitled Market'}
                </h3>
                <div className="market-stats">
                  <div className="stat">
                    <span className="label">Volume:</span>
                    <span className="value">
                      ${formatNumber(market.volume || 0)}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Liquidity:</span>
                    <span className="value">
                      ${formatNumber(market.liquidity || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .header {
          text-align: center;
          color: white;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 2.5rem;
          margin-bottom: 10px;
        }
        .controls {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 20px;
          margin-bottom: 30px;
        }
        .refresh-btn {
          background: white;
          color: #667eea;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .refresh-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .last-updated {
          color: white;
          font-size: 14px;
        }
        .error {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 8px;
          margin: 0 auto 20px;
          max-width: 800px;
        }
        .loading {
          text-align: center;
          color: white;
          font-size: 18px;
          padding: 40px;
        }
        .markets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .market-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: transform 0.3s;
        }
        .market-card:hover {
          transform: translateY(-4px);
        }
        .market-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 15px;
          min-height: 48px;
        }
        .market-stats {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stat {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }
        .label {
          color: #666;
        }
        .value {
          font-weight: 600;
          color: #667eea;
        }
        @media (max-width: 768px) {
          .header h1 {
            font-size: 2rem;
          }
          .markets-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </>
  );
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}
