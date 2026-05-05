import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import WalletAnalysis from '../components/WalletAnalysis';

export default function WalletVetting() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (router.query.wallet) {
      setQuery(router.query.wallet);
      handleSearch(router.query.wallet);
    }
  }, [router.query.wallet]);

  const handleSearch = async (searchQuery = query) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    setSearched(true);
    
    try {
      const res = await fetch(`/api/wallet?query=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Lookup failed');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.lucide) {
          window.lucide.createIcons();
        }
      }, 50);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch(); };

  return (
    <>
      <Head>
        <title>Wallet Lookup | Polymarket Dashboard</title>
      </Head>

      <div className="app-topbar">
        <div className="breadcrumb">
          <span className="breadcrumb-item clickable" onClick={() => router.push('/')}>
            <i data-lucide="arrow-left" width="12" height="12"></i> Dashboard
          </span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-item" style={{fontWeight: 500, color: 'var(--color-text)'}}>Wallet Lookup</span>
        </div>
      </div>

      <div className="app-content">
        {!searched && !loading && !data && (
          <div id="onboardingSection">
            <div className="page-header">
              <div>
                <h1 className="page-title">Wallet Lookup</h1>
                <p className="page-subtitle">Analyze any Polymarket wallet: score, verdict, and trade patterns</p>
              </div>
            </div>
            <div className="onboarding-card">
              <h2>Understand any trader in seconds</h2>
              <p>Enter a wallet address below to see their performance score, win rate, profitability, risk flags, and a plain-English verdict on their trading quality.</p>
              <div>
                <div style={{fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 6}}>Try an example wallet:</div>
                <div className="example-wallet" onClick={() => { setQuery('0x7a250d5630b4cf539739df2c5dacb4c659f2488d'); handleSearch('0x7a250d5630b4cf539739df2c5dacb4c659f2488d'); }}>
                  <i data-lucide="copy" width="12" height="12"></i>
                  0x7a250d5630b4cf539739df2c5dacb4c659f2488d
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="search-box">
            <i data-lucide="search" width="16" height="16" className="search-icon"></i>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Enter wallet address (0x...)" 
              autoComplete="off" 
              spellCheck="false" 
            />
            <button className="search-btn" onClick={() => handleSearch()} disabled={loading}>
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* Results area */}
        <div id="walletResults">
          {loading && (
            <>
              <div className="wallet-header">
                <div className="skeleton skel-badge"></div>
                <div className="wallet-header-info">
                  <div className="skeleton skel-h" style={{width: '60%'}}></div>
                  <div className="skeleton skel-text" style={{width: '40%'}}></div>
                  <div className="skeleton skel-text" style={{width: '80%', marginTop: 8}}></div>
                </div>
              </div>
              <div className="kpi-grid">
                {[...Array(4)].map((_, i) => <div key={i} className="skeleton skel-card"></div>)}
              </div>
            </>
          )}

          {error && (
            <div className="state-box">
              <div className="state-icon"><i data-lucide="search-x" width="48" height="48"></i></div>
              <h3>Wallet not found or error</h3>
              <p>{error}</p>
              <button className="btn btn-primary mt-4" onClick={() => handleSearch()}>
                <i data-lucide="refresh-cw" width="14" height="14"></i>
                Try again
              </button>
            </div>
          )}

          {data && !loading && !error && (
            <WalletAnalysis data={data} />
          )}
        </div>
      </div>
    </>
  );
}
