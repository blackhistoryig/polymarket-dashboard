import Link from 'next/link';

export default function WalletAnalysis({ data, isCompareMode = false, compareSide = null }) {
  if (!data) return null;

  const { proxyWallet, leaderboard, analysis, recentTrades, dataSource } = data;
  const { score, verdict, verdictColor, flags, stats, categoryBreakdown } = analysis || {};

  const scoreClass = (s) => {
    if (s >= 8.5) return 'elite';
    if (s >= 7.0) return 'strong';
    if (s >= 5.0) return 'moderate';
    if (s >= 4.0) return 'risky';
    return 'poor';
  };

  const sc = scoreClass(score);
  const scoreMap = { elite:'score-elite', strong:'score-strong', moderate:'score-moderate', risky:'score-risky', poor:'score-poor' };
  const name = leaderboard?.userName || 'Unknown Trader';

  const fmt$ = (n) => {
    if (!n && n !== 0) return '$0';
    const v = parseFloat(n);
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + v.toFixed(0);
  };

  const kpis = [
    { label: 'P&L', value: fmt$(stats?.pnl), delta: '—', dir: 'neutral', tip: 'Net realized profit/loss' },
    { label: 'Win Rate', value: `${stats?.winRate}%`, delta: '—', dir: 'neutral', tip: 'Percentage of resolved bets resulting in profit' },
    { label: 'Total Trades', value: stats?.totalPositions, delta: '—', dir: 'neutral', tip: 'Total number of positions entered' },
    { label: 'Active Months', value: stats?.activeMonths, delta: '—', dir: 'neutral', tip: 'Number of active trading months' },
  ];

  if (isCompareMode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        <div className="wallet-header" style={{ marginBottom: 0 }}>
          <div className={`score-badge ${scoreMap[sc]}`}>
            <div className="score-num">{score}</div>
            <div className="score-lbl">Score</div>
          </div>
          <div className="wallet-header-info">
            <div className="flex gap-3" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="wallet-name">{name}</div>
              <span className={`verdict verdict-${sc}`}>{verdict}</span>
            </div>
            <div className="wallet-address" style={{ fontSize: '10px' }}>{proxyWallet.slice(0, 16)}…</div>
            <div className="flag-wrap mt-4">
              {(flags || []).slice(0, 2).map((f, i) => (
                <span key={i} className="flag-chip flag-yellow">
                  <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="alert-triangle" width="11" height="11"></i>' }} />
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {dataSource?.onChain === null && (
        <div className="fallback-banner">
          <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="info" width="14" height="14" style={{ flexShrink: 0 }}></i>' }} />
          Leaderboard stats loaded. Deeper trade-history analysis is still pending — live data may differ.
        </div>
      )}

      {/* Wallet Header Component */}
      <div className="wallet-header">
        <div className={`score-badge ${scoreMap[sc]}`}>
          <div className="score-num">{score}</div>
          <div className="score-lbl">Score</div>
        </div>
        <div className="wallet-header-info">
          <div className="flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="wallet-name">{name} {leaderboard?.verifiedBadge && <span style={{color: '#10b981', marginLeft: 4}}>✓</span>}</div>
            <span className={`verdict verdict-${sc}`}>{verdict}</span>
          </div>
          <div className="wallet-address" title="Click to copy" onClick={() => navigator.clipboard.writeText(proxyWallet)}>
            <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="copy" width="11" height="11"></i>' }} />
            {proxyWallet}
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', maxWidth: '60ch' }}>
            {analysis?.insights?.[0] || 'Analyzing trading patterns...'}
          </p>
          <div className="wallet-actions">
            <Link href={`/compare?wallet=${proxyWallet}`} className="btn btn-primary btn-sm">
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="git-compare" width="13" height="13"></i>' }} />
              Compare this wallet
            </Link>
            <button className="btn btn-secondary btn-sm">
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="star" width="13" height="13"></i>' }} />
              Add to Watchlist
            </button>
            <button className="btn btn-ghost btn-sm text-muted" onClick={() => navigator.clipboard.writeText(proxyWallet)}>
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="copy" width="13" height="13"></i>' }} />
              Copy Address
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="section-heading">Performance Metrics</div>
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="kpi-card" data-tip={k.tip}>
            <div className="kpi-label">{k.label} <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="info" width="10" height="10" style={{ color: 'var(--color-text-faint)' }}></i>' }} /></div>
            <div className="kpi-value">{k.value}</div>
            <div className={`kpi-delta ${k.dir}`}>
              {k.dir === 'up' && <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="trending-up" width="11" height="11"></i>' }} />}
              {k.dir === 'down' && <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="trending-down" width="11" height="11"></i>' }} />}
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Red Flag Chips */}
      {flags && flags.length > 0 && (
        <>
          <div className="section-heading">Signal Summary</div>
          <div className="flag-wrap mb-6">
            {flags.map((f, i) => (
              <span key={i} className="flag-chip flag-yellow">
                <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="alert-triangle" width="11" height="11"></i>' }} />
                {f.label} - {f.detail}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Recent Trades */}
      {recentTrades && recentTrades.length > 0 && (
        <>
          <div className="section-heading">Recent Positions</div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-6)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Bet</th>
                    <th>Size</th>
                    <th>Result</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((t, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 'var(--text-xs)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </td>
                      <td>
                        <span className={`verdict ${t.side === 'BUY' ? 'verdict-strong' : 'verdict-risky'}`}>{t.side}</span>
                      </td>
                      <td className="mono">${t.usdcSize}</td>
                      <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{t.outcome}</td>
                      <td className="mono text-muted">{t.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

