import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Layout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.getAttribute('data-theme') === 'dark');
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

  const navItems = [
    { id: '', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'wallet', label: 'Wallet Lookup', icon: 'search' },
    { id: 'compare', label: 'Compare Wallets', icon: 'git-compare' },
  ];

  return (
    <>
      <div className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)}></div>
      
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <i data-lucide="menu" width="20" height="20"></i>
        </button>
        <div style={{display:'flex', alignItems:'center', gap:'8px', fontWeight:600, fontSize:'15px'}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="var(--color-primary)" opacity="0.15"/>
            <circle cx="12" cy="12" r="5" stroke="var(--color-primary)" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="12" r="2" fill="var(--color-primary)"/>
            <line x1="12" y1="2" x2="12" y2="7" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="17" x2="12" y2="22" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="2" y1="12" x2="7" y2="12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="17" y1="12" x2="22" y2="12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Wallet Intel
        </div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
          <i data-lucide={isDark ? 'sun' : 'moon'} width="18" height="18"></i>
        </button>
      </div>

      <div className="app-layout">
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation">
          <div className="sidebar-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="var(--color-primary)" opacity="0.15"/>
              <circle cx="12" cy="12" r="5" stroke="var(--color-primary)" strokeWidth="2" fill="none"/>
              <circle cx="12" cy="12" r="2" fill="var(--color-primary)"/>
              <line x1="12" y1="2" x2="12" y2="7" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="17" x2="12" y2="22" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="2" y1="12" x2="7" y2="12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="17" y1="12" x2="22" y2="12" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Wallet Intel
          </div>

          <nav className="sidebar-nav" role="list">
            <div className="nav-section-label">Insights</div>
            {navItems.map(item => {
              const path = `/${item.id}`;
              const active = router.pathname === path || (item.id !== '' && router.pathname.startsWith(`/${item.id}`));
              return (
                <Link href={path} key={item.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <i data-lucide={item.icon} width="16" height="16"></i>
                  {item.label}
                </Link>
              );
            })}
            <div className="nav-section-label">Personal</div>
            <Link href="/watchlist" className={`nav-item ${router.pathname === '/watchlist' ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <i data-lucide="star" width="16" height="16"></i>
              Watchlist
              <span className="nav-badge">0</span>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <span style={{fontSize:'var(--text-xs)', color:'var(--color-text-faint)'}}>Polymarket Analytics</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
              <i data-lucide={isDark ? 'sun' : 'moon'} width="16" height="16"></i>
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
