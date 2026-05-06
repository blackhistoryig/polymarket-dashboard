import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Watchlist() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Watchlist | PolySuperDash</title>
      </Head>

      <div className="app-topbar">
        <div className="breadcrumb">
          <span className="breadcrumb-item clickable" onClick={() => router.push('/')}>
            <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="arrow-left" width="12" height="12"></i>' }} /> Dashboard
          </span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-item" style={{fontWeight: 500, color: 'var(--color-text)'}}>Watchlist</span>
        </div>
      </div>

      <div className="app-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Watchlist</h1>
            <p className="page-subtitle">Track wallets you care about</p>
          </div>
        </div>

        <div className="state-box">
          <div className="state-icon"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="star" width="48" height="48"></i>' }} /></div>
          <h3>Your watchlist is empty</h3>
          <p>After analyzing a wallet, click &quot;Add to Watchlist&quot; to track it here.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            <div className="placeholder-pill"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="clock" width="12" height="12"></i>' }} /> Watchlist alerts — coming soon</div>
            <div className="placeholder-pill"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="bell" width="12" height="12"></i>' }} /> Win streak notifications — coming soon</div>
          </div>
        </div>
      </div>
    </>
  );
}

