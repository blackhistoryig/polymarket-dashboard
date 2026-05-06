import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import WalletAnalysis from '../components/WalletAnalysis';

export default function Compare() {
  const router = useRouter();
  const [walletA, setWalletA] = useState('');
  const [walletB, setWalletB] = useState('');
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);

  useEffect(() => {
    if (router.query.wallet && !walletA && !dataA) {
      setWalletA(router.query.wallet);
      loadWallet(router.query.wallet, 'A');
    }
  }, [router.query.wallet]);

  const loadWallet = async (address, side) => {
    if (!address.trim()) return;
    try {
      const res = await fetch(`/api/wallet?query=${encodeURIComponent(address.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      
      if (side === 'A') setDataA(json);
      else setDataB(json);
      
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.lucide) {
          window.lucide.createIcons();
        }
      }, 50);
    } catch (e) {
      alert(`Error loading Wallet ${side}: ${e.message}`);
    }
  };

  const loadSampleComparison = () => {
    setWalletA('0x91eee6b7cea1916214daebec3b92b7513079c5b8');
    setWalletB('0xc2e7800b5af46e6093872b177b7a5e7f0563be51');
    loadWallet('0x91eee6b7cea1916214daebec3b92b7513079c5b8', 'A');
    loadWallet('0xc2e7800b5af46e6093872b177b7a5e7f0563be51', 'B');
  };

  const fmt$ = (n) => {
    if (!n && n !== 0) return '$0';
    const v = parseFloat(n);
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + v.toFixed(0);
  };

  return (
    <>
      <Head>
        <title>Compare Wallets | PolySuperDash</title>
      </Head>

      <div className="app-topbar">
        <div className="breadcrumb">
          <span className="breadcrumb-item clickable" onClick={() => router.push('/')}>
            <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="arrow-left" width="12" height="12"></i>' }} /> Dashboard
          </span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-item" style={{fontWeight: 500, color: 'var(--color-text)'}}>Compare</span>
        </div>
      </div>

      <div className="app-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Compare Wallets</h1>
            <p className="page-subtitle">Side-by-side analysis of two trader profiles</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push('/wallet')}>
            <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="arrow-left" width="14" height="14"></i>' }} /> Back to Lookup
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          <div>
            <div className="section-heading">Wallet A</div>
            <div className="search-box">
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="search" width="16" height="16" className="search-icon"></i>' }} />
              <input 
                type="text" 
                value={walletA} 
                onChange={(e) => setWalletA(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && loadWallet(walletA, 'A')}
                placeholder="0x... Wallet A" 
              />
              <button className="search-btn" onClick={() => loadWallet(walletA, 'A')}>Load</button>
            </div>
          </div>
          <div>
            <div className="section-heading">Wallet B</div>
            <div className="search-box">
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="search" width="16" height="16" className="search-icon"></i>' }} />
              <input 
                type="text" 
                value={walletB} 
                onChange={(e) => setWalletB(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadWallet(walletB, 'B')} 
                placeholder="0x... Wallet B" 
              />
              <button className="search-btn" onClick={() => loadWallet(walletB, 'B')}>Load</button>
            </div>
          </div>
        </div>

        {!dataA && !dataB && (
          <div className="state-box">
            <div className="state-icon"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="git-compare" width="48" height="48"></i>' }} /></div>
            <h3>No wallets loaded yet</h3>
            <p>Enter two wallet addresses above to compare their profiles side by side.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={loadSampleComparison}>
                <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="zap" width="14" height="14"></i>' }} /> Load sample comparison
              </button>
            </div>
          </div>
        )}

        {dataA && !dataB && (
          <div className="fallback-banner"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="info" width="14" height="14" style="flex-shrink: 0;"></i>' }} />Wallet A loaded. Enter a second wallet to compare.</div>
        )}
        {!dataA && dataB && (
          <div className="fallback-banner"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="info" width="14" height="14" style="flex-shrink: 0;"></i>' }} />Wallet B loaded. Enter a second wallet to compare.</div>
        )}

        {(dataA || dataB) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div>{dataA && <WalletAnalysis data={dataA} isCompareMode={true} compareSide="A" />}</div>
            <div>{dataB && <WalletAnalysis data={dataB} isCompareMode={true} compareSide="B" />}</div>
          </div>
        )}

        {dataA && dataB && (
          <>
            <div className="section-heading">Side-by-Side Metrics</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>{dataA.leaderboard?.userName || 'Wallet A'}</th>
                    <th>{dataB.leaderboard?.userName || 'Wallet B'}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Score', dataA.analysis?.score, dataB.analysis?.score],
                    ['P&L (30d)', fmt$(dataA.analysis?.stats?.pnl), fmt$(dataB.analysis?.stats?.pnl)],
                    ['Win Rate', `${dataA.analysis?.stats?.winRate}%`, `${dataB.analysis?.stats?.winRate}%`],
                    ['Trades', dataA.analysis?.stats?.totalPositions, dataB.analysis?.stats?.totalPositions],
                    ['Active Months', dataA.analysis?.stats?.activeMonths, dataB.analysis?.stats?.activeMonths],
                  ].map(([metric, av, bv], i) => (
                    <tr key={i}>
                      <td className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{metric}</td>
                      <td className="mono">{av}</td>
                      <td className="mono">{bv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/wallet?wallet=${dataA.proxyWallet}`)}>
                <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="search" width="13" height="13"></i>' }} /> Deep-dive Wallet A
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/wallet?wallet=${dataB.proxyWallet}`)}>
                <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="search" width="13" height="13"></i>' }} /> Deep-dive Wallet B
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}


