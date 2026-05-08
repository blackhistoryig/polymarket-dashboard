import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Logo = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="var(--color-primary)" opacity="0.15"/>
    {/* Chart bars */}
    <rect x="3" y="14" width="3" height="7" rx="1" fill="var(--color-primary)" opacity="0.5"/>
    <rect x="7" y="10" width="3" height="11" rx="1" fill="var(--color-primary)" opacity="0.75"/>
    <rect x="11" y="6" width="3" height="15" rx="1" fill="var(--color-primary)"/>
    {/* Trend line */}
    <polyline points="3,12 8,8 14,4 20,7" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* Dot at peak */}
    <circle cx="14" cy="4" r="1.5" fill="var(--color-primary)"/>
  </svg>
);

export default function Layout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const [watchlistCount, setWatchlistCount] = useState(0);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.getAttribute('data-theme') === 'dark');

    const updateCount = () => {
      const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
      setWatchlistCount(list.length);
    };

    updateCount();
    window.addEventListener('watchlistUpdated', updateCount);
    window.addEventListener('storage', updateCount);
    
    const interval = setInterval(updateCount, 2000); // Poll every 2s as fallback

    return () => {
      window.removeEventListener('watchlistUpdated', updateCount);
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const nowDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', nowDark ? 'light' : 'dark');
    setIsDark(!nowDark);
    if (typeof window !== 'undefined' && window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 50);
    }
  };

  const close = () => setSidebarOpen(false);

  return (
    <>
      <div className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={close} />

      {/* Mobile top bar */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="menu" width="20" height="20"></i>' }} />
        </button>
        <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:700, fontSize:'15px'}}>
          <Logo />
          PolySuperDash
        </div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          <span dangerouslySetInnerHTML={{ __html: `<i data-lucide="${isDark ? 'sun' : 'moon'}" width="18" height="18"></i>` }} />
        </button>
      </div>

      <div className="app-layout">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation">

          {/* Sidebar brand */}
          <div className="sidebar-logo">
            <Logo />
            <span style={{fontWeight:700}}>PolySuperDash</span>
          </div>

          <nav className="sidebar-nav" role="list">

            {/* ALL TOOLS — presented as equal, user picks */}
            <div className="nav-section-label">Your Tools</div>
            <Link href="/" className={`nav-item ${router.pathname === '/' ? 'active' : ''}`} onClick={close}>
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="layout-dashboard" width="16" height="16"></i>' }} />
              Dashboard
            </Link>
            <Link href="/wallet" className={`nav-item ${router.pathname === '/wallet' ? 'active' : ''}`} onClick={close}>
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="search" width="16" height="16"></i>' }} />
              Wallet Lookup
            </Link>
            <Link href="/compare" className={`nav-item ${router.pathname === '/compare' ? 'active' : ''}`} onClick={close}>
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="git-compare" width="16" height="16"></i>' }} />
              Compare Wallets
            </Link>

            {/* SAVED */}
            <div className="nav-section-label" style={{marginTop:'var(--space-4)'}}>Saved</div>
            <Link href="/watchlist" className={`nav-item ${router.pathname === '/watchlist' ? 'active' : ''}`} onClick={close}>
              <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="star" width="16" height="16"></i>' }} />
              Watchlist
              {watchlistCount > 0 && <span className="nav-badge">{watchlistCount}</span>}
            </Link>

          </nav>

          <div className="sidebar-footer">
            <span style={{fontSize:'var(--text-xs)', color:'var(--color-text-faint)'}}>PolySuperDash · Polymarket Intelligence</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <span dangerouslySetInnerHTML={{ __html: `<i data-lucide="${isDark ? 'sun' : 'moon'}" width="16" height="16"></i>` }} />
            </button>
          </div>
        </aside>

        <main className="app-main">
          {children}
        </main>
      </div>
    </>
  );
}
