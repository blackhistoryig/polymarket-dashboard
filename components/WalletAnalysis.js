import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WalletAnalysis({ data, isCompareMode = false, compareSide = null }) {
  if (!data) return null;

  const { proxyWallet, leaderboard, analysis, recentTrades, dataSource } = data;
  const { score, copyabilityScore, edgeType, verdict, verdictColor, flags, stats, categoryBreakdown, openPositions } = analysis || {};

  const scoreClass = (s) => {
    if (s >= 8.5) return 'elite';
    if (s >= 7.0) return 'strong';
    if (s >= 5.0) return 'moderate';
    if (s >= 4.0) return 'risky';
    return 'poor';
  };

  const [isWatched, setIsWatched] = useState(false);

  useEffect(() => {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setIsWatched(list.includes(proxyWallet.toLowerCase()));
  }, [proxyWallet]);

  const toggleWatchlist = () => {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
    let newList;
    if (isWatched) {
      newList = list.filter(a => a !== proxyWallet.toLowerCase());
    } else {
      newList = [...list, proxyWallet.toLowerCase()];
    }
    localStorage.setItem('watchlist', JSON.stringify(newList));
    setIsWatched(!isWatched);
    // Dispatch event for other components (like nav or watchlist page)
    window.dispatchEvent(new Event('watchlistUpdated'));
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
    { label: 'Edge Type', value: edgeType, delta: '—', dir: 'up', tip: 'Inferred specialty based on trade history' },
  ];

  if (isCompareMode) {
    // ... (rest of isCompareMode remains similar but with edgeType)
  }

  return (
    <>
      {dataSource?.onChain === null && (
        <div className="fallback-banner">
          <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="info" width="14" height="14" style="flex-shrink: 0;"></i>' }} />
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
          <div style={{display:'flex', gap:'12px', alignItems:'center', marginTop:'4px'}}>
             <div className="wallet-address" title="Click to copy" onClick={() => navigator.clipboard.writeText(proxyWallet)}>
               <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="copy" width="11" height="11"></i>' }} />
               {proxyWallet.slice(0, 16)}...
             </div>
             <div style={{fontSize:'12px', fontWeight:600, color:'var(--color-primary)'}}>
                {copyabilityScore}% Copyability
             </div>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-3)', maxWidth: '60ch' }}>
            {analysis?.insights?.[0] || 'Analyzing trading patterns...'}
          </p>
          <div className="wallet-actions">
            <Link href={`/compare?wallet=${proxyWallet}`} className="btn btn-primary btn-sm">
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="git-compare" width="13" height="13"></i>' }} />
              Compare
            </Link>
            <button className={`btn ${isWatched ? 'btn-secondary' : 'btn-ghost'} btn-sm`} onClick={toggleWatchlist}>
              <span dangerouslySetInnerHTML={{ __html: `<i data-lucide="${isWatched ? 'star-off' : 'star'}" width="13" height="13"></i>` }} />
              {isWatched ? 'In Watchlist' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="section-heading">Risk-Adjusted Metrics</div>
      <div className="kpi-grid">
        {kpis.map((k, i) => (
          <div key={i} className="kpi-card" data-tip={k.tip}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{fontSize: k.label === 'Edge Type' ? '16px' : '22px'}}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{marginTop:'var(--space-6)', padding:'var(--space-4)', background:'var(--color-bg-alt)', borderRadius:'8px'}}>
         <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:600, marginBottom:'8px'}}>
            <span style={{color:'var(--color-text-muted)'}}>Portfolio Sentiment Bias</span>
            <span>{analysis?.sentimentBias}% YES</span>
         </div>
         <div style={{display:'flex', height:'6px', borderRadius:'3px', overflow:'hidden', background:'var(--color-border)'}}>
            <div style={{width: `${analysis?.sentimentBias}%`, background:'#10b981'}} />
            <div style={{width: `${100 - analysis?.sentimentBias}%`, background:'#ef4444'}} />
         </div>
         <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'var(--color-text-faint)', marginTop:'4px'}}>
            <span>Bullish (YES)</span>
            <span>Bearish (NO)</span>
         </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'var(--space-6)', marginTop:'var(--space-6)'}}>
         {/* Largest Open Positions */}
         <div>
            <div className="section-heading">Largest Open Positions</div>
            <div className="card" style={{padding:0, overflow:'hidden'}}>
               <table className="data-table" style={{fontSize:'12px'}}>
                  <thead>
                     <tr>
                        <th>Market</th>
                        <th style={{textAlign:'right'}}>Value</th>
                     </tr>
                  </thead>
                  <tbody>
                     {(openPositions || []).map((p, i) => (
                        <tr key={i}>
                           <td style={{maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                              <span style={{color: p.outcome === 'Yes' ? '#10b981' : '#ef4444', fontWeight:600}}>{p.outcome}</span> {p.title}
                           </td>
                           <td style={{textAlign:'right'}} className="mono">${p.value}</td>
                        </tr>
                     ))}
                     {(!openPositions || openPositions.length === 0) && <tr><td colSpan="2" style={{textAlign:'center', color:'var(--color-text-faint)'}}>No open positions</td></tr>}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Signal Summary / Flags */}
         <div>
            <div className="section-heading">Risk Signal Summary</div>
            <div className="card" style={{height:'100%'}}>
               <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                  {(flags || []).map((f, i) => (
                     <div key={i} style={{display:'flex', gap:'8px', alignItems:'start'}}>
                        <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="alert-triangle" width="14" height="14" style="color:#f59e0b; margin-top:2px;"></i>' }} />
                        <div>
                           <div style={{fontSize:'12px', fontWeight:600}}>{f.label}</div>
                           <div style={{fontSize:'11px', color:'var(--color-text-faint)'}}>{f.detail}</div>
                        </div>
                     </div>
                  ))}
                  {(flags || []).length === 0 && <div style={{color:'#10b981', fontSize:'13px'}}>No critical risk flags detected.</div>}
               </div>
            </div>
         </div>
      </div>


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


