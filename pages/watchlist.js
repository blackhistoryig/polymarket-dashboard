import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Watchlist() {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadWatchlist = () => {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
    setWatchlist(list);
    return list;
  };

  useEffect(() => {
    const list = loadWatchlist();
    if (list.length > 0) {
      fetchExposure(list);
    }

    const handleUpdate = () => {
      const newList = loadWatchlist();
      fetchExposure(newList);
    };
    window.addEventListener('watchlistUpdated', handleUpdate);
    return () => window.removeEventListener('watchlistUpdated', handleUpdate);
  }, []);

  const fetchExposure = async (list) => {
    if (list.length === 0) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/exposure?wallets=${list.join(',')}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch exposure data');
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.lucide) window.lucide.createIcons();
      }, 50);
    }
  };

  const removeWallet = (addr) => {
    const list = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const newList = list.filter(a => a !== addr.toLowerCase());
    localStorage.setItem('watchlist', JSON.stringify(newList));
    setWatchlist(newList);
    fetchExposure(newList);
    window.dispatchEvent(new Event('watchlistUpdated'));
  };

  if (watchlist.length === 0) {
    return (
      <div className="app-content">
        <div className="state-box">
          <div className="state-icon"><span dangerouslySetInnerHTML={{ __html: '<i data-lucide="star" width="48" height="48"></i>' }} /></div>
          <h3>Your watchlist is empty</h3>
          <p>Add wallets from the leaderboard or lookup to see your combined portfolio exposure.</p>
          <button className="btn btn-primary mt-4" onClick={() => router.push('/')}>Go to Dashboard</button>
        </div>
      </div>
    );
  }

  const healthColor = data?.healthStatus === 'green' ? '#10b981' : data?.healthStatus === 'yellow' ? '#f59e0b' : '#ef4444';

  return (
    <>
      <Head>
        <title>Portfolio Exposure | PolySuperDash</title>
      </Head>

      <div className="app-topbar">
        <div className="breadcrumb">
          <Link href="/" className="breadcrumb-item">Dashboard</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-item active">Portfolio Exposure</span>
        </div>
      </div>

      <div className="app-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Portfolio Exposure</h1>
            <p className="page-subtitle">Aggregated risk analysis across {watchlist.length} tracked wallets</p>
          </div>
          {data && (
            <div style={{display:'flex', alignItems:'center', gap:'12px', background:'var(--color-bg-alt)', padding:'8px 16px', borderRadius:'12px', border:`1px solid ${healthColor}40`}}>
               <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'10px', color:'var(--color-text-faint)', textTransform:'uppercase', fontWeight:700}}>Exposure Health</div>
                  <div style={{fontSize:'18px', fontWeight:800, color:healthColor}}>{data.healthScore}/100</div>
               </div>
               <div style={{width:'40px', height:'40px', borderRadius:'50%', border:`3px solid ${healthColor}20`, borderTopColor:healthColor, animation:'spin 2s linear infinite'}} />
            </div>
          )}
        </div>

        {loading && !data && <div className="skeleton skel-card" style={{height:'300px'}}></div>}

        {data && (
          <>
            {/* Top Summary Bar */}
            <div className="card" style={{background:`linear-gradient(to right, ${healthColor}05, transparent)`, borderLeft:`4px solid ${healthColor}`, marginBottom:'var(--space-6)'}}>
               <div style={{display:'flex', gap:'12px', alignItems:'start'}}>
                  <span dangerouslySetInnerHTML={{ __html: `<i data-lucide="${data.healthStatus === 'green' ? 'check-circle' : 'alert-circle'}" width="20" height="20" style="color:${healthColor}; margin-top:2px;"></i>` }} />
                  <div>
                     <div style={{fontWeight:600, fontSize:'15px', marginBottom:'4px'}}>Portfolio Status: {data.healthStatus === 'green' ? 'Healthy' : 'Attention Required'}</div>
                     <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                        {data.warnings.map((w, i) => (
                           <span key={i} className="flag-chip" style={{background:`${healthColor}15`, color:healthColor, border:`1px solid ${healthColor}30`}}>
                              {w}
                           </span>
                        ))}
                        {data.warnings.length === 0 && <span style={{fontSize:'13px', color:'var(--color-text-muted)'}}>No major concentration risks detected.</span>}
                     </div>
                  </div>
               </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(320px, 1fr))', gap:'var(--space-6)', marginBottom:'var(--space-6)'}}>
               {/* Category Concentration */}
               <div className="card">
                  <div className="section-heading" style={{marginBottom:'12px'}}>Category Concentration</div>
                  <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                     {data.categories.map((c, i) => (
                        <div key={i}>
                           <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'4px'}}>
                              <span style={{textTransform:'capitalize', fontWeight:500}}>{c.cat}</span>
                              <span style={{color: c.pct > 60 ? '#ef4444' : 'var(--color-text-muted)'}}>{c.pct}%</span>
                           </div>
                           <div style={{height:'6px', background:'var(--color-border)', borderRadius:'3px', overflow:'hidden'}}>
                              <div style={{width:`${c.pct}%`, height:'100%', background: c.pct > 60 ? '#ef4444' : 'var(--color-primary)', opacity: 0.8}} />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Sentiment & Overlap */}
               <div className="card">
                  <div className="section-heading" style={{marginBottom:'12px'}}>Sentiment & Market Overlap</div>
                  
                  <div style={{marginBottom:'24px'}}>
                     <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'8px'}}>
                        <span style={{color:'var(--color-text-muted)'}}>Aggregate Sentiment Bias</span>
                        <span style={{fontWeight:600}}>{data.sentiment.yesPct}% YES</span>
                     </div>
                     <div style={{display:'flex', height:'10px', borderRadius:'5px', overflow:'hidden', background:'var(--color-border)'}}>
                        <div style={{width:`${data.sentiment.yesPct}%`, background:'#10b981'}} />
                        <div style={{width:`${data.sentiment.noPct}%`, background:'#ef4444'}} />
                     </div>
                     <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'var(--color-text-faint)', marginTop:'4px'}}>
                        <span>BULLISH (YES)</span>
                        <span>BEARISH (NO)</span>
                     </div>
                  </div>

                  <div>
                     <div style={{fontSize:'12px', fontWeight:600, marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px'}}>
                        <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="layers" width="14" height="14"></i>' }} />
                        Duplicate Bet Detector
                     </div>
                     {data.duplicates.length > 0 ? (
                        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                           {data.duplicates.map((d, i) => (
                              <div key={i} className="clickable" onClick={() => router.push(`/wallet?wallet=${d.slug}`)} 
                                style={{fontSize:'11px', padding:'8px', background:'var(--color-bg-alt)', borderRadius:'6px', border:'1px solid var(--color-border)'}}>
                                 <div style={{fontWeight:600, marginBottom:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{d.title}</div>
                                 <div style={{color:'var(--color-text-faint)'}}>
                                    <span style={{color: d.side === 'yes' ? '#10b981' : '#ef4444', fontWeight:700}}>{d.side.toUpperCase()}</span>
                                    {' '}held by {d.count} watched wallets
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div style={{fontSize:'11px', color:'var(--color-text-faint)', fontStyle:'italic'}}>No overlapping bets across wallets.</div>
                     )}
                  </div>
               </div>
            </div>

            {/* Watchlist Table */}
            <div className="section-heading">Tracked Wallets</div>
            <div className="card" style={{padding:0, overflow:'hidden'}}>
               <table className="data-table">
                  <thead>
                     <tr>
                        <th>Wallet / Trader</th>
                        <th>Status</th>
                        <th style={{textAlign:'right'}}>Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                     {watchlist.map((addr, i) => {
                        const isCrowded = data.crowding.some(c => c.address.toLowerCase() === addr.toLowerCase());
                        return (
                           <tr key={i}>
                              <td>
                                 <div className="clickable" onClick={() => router.push(`/wallet?wallet=${addr}`)} style={{fontWeight:600, color:'var(--color-primary)'}}>
                                    {addr.slice(0, 10)}...{addr.slice(-6)}
                                 </div>
                              </td>
                              <td>
                                 {isCrowded ? (
                                    <span className="flag-chip flag-yellow" style={{fontSize:'10px'}}>
                                       <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="users" width="10" height="10"></i>' }} /> High Crowding
                                    </span>
                                 ) : (
                                    <span style={{fontSize:'11px', color:'var(--color-text-faint)'}}>Low Crowding</span>
                                 )}
                              </td>
                              <td style={{textAlign:'right'}}>
                                 <button className="btn btn-ghost btn-sm" onClick={() => removeWallet(addr)} style={{color:'#ef4444'}}>
                                    <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="trash-2" width="14" height="14"></i>' }} />
                                 </button>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
          </>
        )}
      </div>

      <style>{`
         @keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} }
         .placeholder-pill { padding: 4px 12px; background: var(--color-bg-alt); border-radius: 20px; font-size: 11px; color: var(--color-text-faint); display: flex; align-items: center; gap: 6px; }
      `}</style>
    </>
  );
}
