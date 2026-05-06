import Head from 'next/head';
import { useRouter } from 'next/router';

// MOCK DATA for Leaderboard (as per index.html, updated with REAL Polymarket wallets)
const LEADERBOARD = [
  { rank:1, address:'0x91eee6b7cea1916214daebec3b92b7513079c5b8', label:'everydaymortgage', score:94, verdict:'elite',    pnl:'+$472,838', winrate:'78%', trades:312 },
  { rank:2, address:'0xc2e7800b5af46e6093872b177b7a5e7f0563be51', label:'beachboy4',        score:88, verdict:'strong',   pnl:'+$446,056', winrate:'71%', trades:194 },
  { rank:3, address:'0xe48109602719f95c247fec255ffb71bab3f985a3', label:'trade-via-Gravia', score:81, verdict:'strong',   pnl:'+$394,019', winrate:'67%', trades:258 },
  { rank:4, address:'0x6ac5bb06a9eb05641fd5e82640268b92f3ab4b6e', label:'Lakersfan111',     score:74, verdict:'moderate', pnl:'+$338,714', winrate:'61%', trades:87  },
  { rank:5, address:'0x9f2fe025f84839ca81dd8e0338892605702d2ca8', label:'surfandturf',      score:67, verdict:'moderate', pnl:'+$304,135', winrate:'58%', trades:143 },
  { rank:6, address:'0xce5bec63b40392845a9a504915f607c8e03a047a', label:'Nexuus',           score:48, verdict:'risky',    pnl:'+$279,999', winrate:'44%', trades:201 },
  { rank:7, address:'0x84cfffc3f16dcc353094de30d4a45226eccd2f63', label:'mooseborzoi',      score:38, verdict:'poor',     pnl:'+$279,227', winrate:'36%', trades:388 },
];

export default function Dashboard() {
  const router = useRouter();

  const scoreClass = (score) => {
    if (score >= 85) return 'elite';
    if (score >= 70) return 'strong';
    if (score >= 55) return 'moderate';
    if (score >= 40) return 'risky';
    return 'poor';
  };

  const verdictLabel = (v) => {
    const map = { elite:'🏆 Elite', strong:'✅ Strong', moderate:'📊 Moderate', risky:'⚠️ Risky', poor:'🔴 Poor' };
    return map[v] || v;
  };

  const navigateToWallet = (address) => {
    router.push(`/wallet?wallet=${address}`);
  };

  return (
    <>
      <Head>
        <title>Dashboard | Polymarket Wallet Intel</title>
      </Head>

      <div className="app-topbar">
        <div className="breadcrumb">
          <span className="breadcrumb-item" style={{fontWeight: 500, color: 'var(--color-text)'}}>Dashboard</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/wallet')}>
            <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="search" width="14" height="14"></i>' }} /> Lookup Wallet
          </button>
        </div>
      </div>

      <div className="app-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Leaderboard and top trader performance at a glance</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/compare')}>
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="git-compare" width="14" height="14"></i>' }} /> Compare
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/wallet')}>
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="search" width="14" height="14"></i>' }} /> Lookup Wallet
            </button>
          </div>
        </div>

        {/* Platform KPIs */}
        <div className="section-heading">Platform Overview</div>
        <div className="kpi-grid" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="kpi-card">
            <div className="kpi-label"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="users" width="12" height="12"></i>' }} /> Active Traders</div>
            <div className="kpi-value">24,810</div>
            <div className="kpi-delta up"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="trending-up" width="11" height="11"></i>' }} />+3.2% 7d</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="activity" width="12" height="12"></i>' }} /> Volume 24h</div>
            <div className="kpi-value">$8.3M</div>
            <div className="kpi-delta up"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="trending-up" width="11" height="11"></i>' }} />+12.4%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="bar-chart-2" width="12" height="12"></i>' }} /> Open Markets</div>
            <div className="kpi-value">1,492</div>
            <div className="kpi-delta neutral">—</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="trophy" width="12" height="12"></i>' }} /> Elite Wallets</div>
            <div className="kpi-value">87</div>
            <div className="kpi-delta up"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="trending-up" width="11" height="11"></i>' }} />+5 this wk</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: 'var(--space-5)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div className="card-title">Top Traders — Leaderboard</div>
              <div className="card-subtitle">Click any wallet to open Wallet Lookup</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm text-muted">7d</button>
              <button className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>30d</button>
              <button className="btn btn-ghost btn-sm text-muted">All</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" role="grid">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Wallet</th>
                  <th>Score</th>
                  <th>Verdict</th>
                  <th>P&L (30d)</th>
                  <th>Win Rate</th>
                  <th>Trades</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {LEADERBOARD.map((w, i) => {
                  const sc = scoreClass(w.score);
                  const colorMap = { elite: 'gold', strong: 'success', moderate: 'primary', risky: 'warning', poor: 'error' };
                  
                  return (
                    <tr key={i} onClick={() => navigateToWallet(w.address)} title="Click to analyze wallet">
                      <td style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>{w.rank}</td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{w.label}</div>
                        <div className="wallet-link">{w.address.slice(0, 10)}…{w.address.slice(-6)}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 'var(--text-base)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: `var(--color-${colorMap[sc]})` }}>
                          {w.score}
                        </span>
                      </td>
                      <td><span className={`verdict verdict-${sc}`}>{verdictLabel(w.verdict)}</span></td>
                      <td style={{ fontWeight: 500 }} className={w.pnl.startsWith('+') ? 'text-success' : 'text-error'}>{w.pnl}</td>
                      <td>{w.winrate}</td>
                      <td className="text-muted">{w.trades}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigateToWallet(w.address); }}>
                          <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="arrow-right" width="13" height="13"></i>' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

