import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const fmt$ = (n) => {
  if (!n && n !== 0) return '$0';
  const v = parseFloat(n);
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(0);
};

export default function WalletVetting() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/wallet?query=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch(); };

  const lb = data?.leaderboard;
  const { score, verdict, verdictColor, flags, insights, stats, categoryBreakdown, scoreComponents } = data?.analysis || {};
  const hasOnChainData = data?.dataSource?.onChain !== null;

  return (
    <div style={{ background: '#0d0f14', minHeight: '100vh', color: '#fff', padding: 20 }}>
      <Head><title>Wallet Vetting | Polymarket Dashboard</title></Head>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header + back link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <Link href="/" style={{ color: '#4f9aff', fontSize: '0.9rem', textDecoration: 'none' }}>← Dashboard</Link>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Wallet Vetting</h1>
        </div>

        {/* Search bar */}
        <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 32 }}>
          <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: 12 }}>Enter Polymarket username or 0x wallet address</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g. Countryside or 0xbddf61af533ff524d27154e589d2d7a81510c684"
              style={{
                flex: 1, background: '#0d0f14', border: '1px solid #444', color: '#fff',
                padding: '14px 16px', borderRadius: 8, fontSize: 16
              }}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                background: loading ? '#555' : '#4f9aff', color: '#fff', border: 'none',
                padding: '14px 32px', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 16, fontWeight: 600
              }}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#dc2626', color: '#fff', padding: 16, borderRadius: 8, marginBottom: 24 }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {data && (
          <>
            {/* Wallet Summary Header */}
            <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: 4 }}>
                    {lb?.userName || 'Unknown Trader'}
                    {lb?.verifiedBadge && <span style={{ color: '#10b981', marginLeft: 8 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#888', fontFamily: 'monospace' }}>{data.proxyWallet}</div>
                  {lb?.xUsername && <div style={{ fontSize: '0.85rem', color: '#4f9aff', marginTop: 4 }}>@{lb.xUsername}</div>}
                </div>
                {lb?.rank && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Rank</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4f9aff' }}>#{lb.rank}</div>
                  </div>
                )}
              </div>

              {/* Key stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid #333' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Realized P&L</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: lb?.pnl > 0 ? '#10b981' : '#ef4444' }}>{fmt$(lb?.pnl)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Volume</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{fmt$(lb?.vol)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Win Rate</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4f9aff' }}>{stats?.winRate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Positions</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{stats?.totalPositions}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Active Months</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{stats?.activeMonths}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Last Active</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: stats?.daysSinceActive <= 30 ? '#10b981' : '#f59e0b' }}>
                    {stats?.daysSinceActive}d ago
                  </div>
                </div>
              </div>
            </div>

            {/* Copy-Worthiness Score */}
            <div style={{ background: '#16181d', border: `2px solid ${verdictColor}`, borderRadius: 12, padding: 28, marginBottom: 24, textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Copy-Worthiness Score</div>
              <div style={{ fontSize: '4rem', fontWeight: 'bold', color: verdictColor, lineHeight: 1, marginBottom: 12 }}>{score}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 600, color: verdictColor, marginBottom: 20 }}>{verdict}</div>

              {/* Score breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginTop: 24, paddingTop: 24, borderTop: '1px solid #333' }}>
                {[
                  ['P&L Quality', scoreComponents?.pnlScore],
                  ['Win Rate', scoreComponents?.wrScore],
                  ['Volume', scoreComponents?.volScore],
                  ['Recency', scoreComponents?.recencyScore],
                  ['Discipline', scoreComponents?.disciplineScore],
                  ['Diversity', scoreComponents?.diversityScore],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4f9aff' }}>{val}/10</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Source Notice */}
            {!hasOnChainData && (
              <div style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: 8, padding: 14, marginBottom: 24, fontSize: '0.85rem', color: '#93c5fd' }}>
                <strong>ℹ️ Leaderboard stats loaded.</strong> Deeper trade-history analysis pending (connect Dune / Goldsky / Allium for full on-chain breakdown).
              </div>
            )}

            {/* Red Flags */}
            {flags && flags.length > 0 && (
              <div style={{ background: '#16181d', border: '1px solid #ef4444', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16, color: '#ef4444' }}>⚠️ Red Flags</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {flags.map(f => (
                    <div key={f.id} style={{ background: '#1a1c22', border: '1px solid #444', borderRadius: 8, padding: 14 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, color: '#f59e0b' }}>{f.label}</div>
                      <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{f.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Insights */}
            {insights && insights.length > 0 && (
              <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Insights</h3>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, fontSize: '0.9rem', color: '#ccc' }}>
                  {insights.map((i, idx) => <li key={idx}>{i}</li>)}
                </ul>
              </div>
            )}

            {/* Category Exposure */}
            {categoryBreakdown && categoryBreakdown.length > 0 && (
              <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Category Exposure</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {categoryBreakdown.map(c => (
                    <div key={c.cat} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 100, fontSize: '0.85rem', color: '#888', textTransform: 'capitalize' }}>{c.cat}</div>
                      <div style={{ flex: 1, background: '#1f2937', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                        <div style={{ background: '#4f9aff', height: '100%', width: `${c.pct}%`, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ width: 60, textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}>{c.pct}%</div>
                      <div style={{ width: 40, textAlign: 'right', fontSize: '0.75rem', color: '#666' }}>({c.count})</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Trades */}
            {data.recentTrades && data.recentTrades.length > 0 && (
              <div style={{ background: '#16181d', border: '1px solid #333', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 16 }}>Recent Activity</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #333' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Side</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Market</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Outcome</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#888' }}>Price</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px', color: '#888' }}>Size</th>
                        <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Category</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentTrades.map((t, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ color: t.side === 'BUY' ? '#10b981' : '#ef4444', fontWeight: 600 }}>{t.side}</span>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                          <td style={{ padding: '10px 12px', color: '#aaa' }}>{t.outcome}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{t.price}</td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace' }}>${t.usdcSize}</td>
                          <td style={{ padding: '10px 12px', textTransform: 'capitalize', color: '#888' }}>{t.category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div style={{ textAlign: 'center', padding: 80, color: '#666' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: '1.1rem' }}>Enter a wallet to begin analysis</div>
          </div>
        )}
      </div>
    </div>
  );
}
