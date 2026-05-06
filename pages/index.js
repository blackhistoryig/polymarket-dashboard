import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MarketGrid from '../components/MarketGrid';

export default function Dashboard() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState('All');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?timeframe=${timeframe}`);
        const data = await res.json();
        setLeaderboard(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, [timeframe]);

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



        {/* Hot Markets with flipping cards */}
        <MarketGrid />

        {/* Leaderboard */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: 'var(--space-5)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
            <div>
              <div className="card-title">Top Traders — Leaderboard</div>
              <div className="card-subtitle">Click any wallet to open Wallet Lookup</div>
            </div>
            <div className="flex gap-2">
              <button className={`btn btn-sm ${timeframe === '1D' ? 'btn-secondary' : 'btn-ghost text-muted'}`} onClick={() => setTimeframe('1D')}>1D</button>
              <button className={`btn btn-sm ${timeframe === '7D' ? 'btn-secondary' : 'btn-ghost text-muted'}`} onClick={() => setTimeframe('7D')}>7D</button>
              <button className={`btn btn-sm ${timeframe === '1M' ? 'btn-secondary' : 'btn-ghost text-muted'}`} onClick={() => setTimeframe('1M')}>1M</button>
              <button className={`btn btn-sm ${timeframe === 'All' ? 'btn-secondary' : 'btn-ghost text-muted'}`} onClick={() => setTimeframe('All')}>All</button>
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
                {loading ? (
                  <tr><td colSpan="8" style={{textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)'}}>Loading data...</td></tr>
                ) : leaderboard.map((w, i) => {
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

