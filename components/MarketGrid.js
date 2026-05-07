import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;

export default function MarketGrid() {
  const router = useRouter();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipped, setFlipped] = useState({});
  const [details, setDetails] = useState({}); // { [condition_id]: { bids, asks, recentMoves, loading } }
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState('volume');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/markets');
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const arr = await res.json();
        if (!Array.isArray(arr)) throw new Error('Unexpected response format');
        setMarkets(arr.slice(0, MAX_LIMIT));
      } catch (e) {
        console.error('MarketGrid fetch error:', e);
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Lazy-load orderbook + trades when a card is flipped
  const loadDetail = useCallback(async (market) => {
    const id = market.condition_id;
    const tokenId = market.tokens?.[0]?.token_id;
    if (!tokenId || details[id]) return; // already loaded or no token

    setDetails(p => ({ ...p, [id]: { loading: true } }));
    try {
      const res = await fetch(`/api/market-detail?tokenId=${tokenId}`);
      const data = res.ok ? await res.json() : {};
      setDetails(p => ({ ...p, [id]: { ...data, loading: false } }));
    } catch (e) {
      setDetails(p => ({ ...p, [id]: { loading: false, error: true } }));
    }
  }, [details]);

  const handleFlip = (market) => {
    const id = market.condition_id;
    const nowFlipped = !flipped[id];
    setFlipped(p => ({ ...p, [id]: nowFlipped }));
    if (nowFlipped) loadDetail(market);
  };

  const fmt = (n) => {
    if (!n) return '$0';
    const v = parseFloat(n);
    if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v/1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  const sorted = [...markets].sort((a, b) => {
    if (sortBy === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0);
    return (b.volume || 0) - (a.volume || 0);
  });
  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_LIMIT);

  if (loading) return (
    <div style={{padding:'var(--space-5)',textAlign:'center',color:'var(--color-text-muted)',fontSize:'var(--text-sm)'}}>
      Loading Hot Markets...
    </div>
  );
  if (error) return (
    <div style={{padding:'var(--space-5)',color:'#ef4444',fontSize:'var(--text-sm)',background:'rgba(239,68,68,0.06)',borderRadius:'8px',marginBottom:'var(--space-4)'}}>
      ⚠️ Could not load markets: {error}
    </div>
  );
  if (!markets.length) return (
    <div style={{padding:'var(--space-5)',textAlign:'center',color:'var(--color-text-muted)',fontSize:'var(--text-sm)'}}>
      No hot markets found right now.
    </div>
  );

  return (
    <div style={{marginBottom:'var(--space-8)'}}>
      {/* Header + sort filters */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'var(--space-3)',marginBottom:'var(--space-4)'}}>
        <div className="section-heading" style={{marginBottom:0}}>
          <span dangerouslySetInnerHTML={{__html:'<i data-lucide="flame" width="13" height="13"></i>'}} />
          {' '}Hot Markets
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          {[
            {id:'volume',    label:'Volume',    icon:'bar-chart-2'},
            {id:'liquidity', label:'Liquidity', icon:'droplets'},
            {id:'activity',  label:'Activity',  icon:'zap'},
          ].map(f => (
            <button key={f.id} onClick={() => setSortBy(f.id)}
              className={`btn btn-sm ${sortBy === f.id ? 'btn-secondary' : 'btn-ghost text-muted'}`}
              style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px'}}>
              <span dangerouslySetInnerHTML={{__html:`<i data-lucide="${f.icon}" width="11" height="11"></i>`}} />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:'var(--space-4)'}}>
        {visible.map(m => {
          const id = m.condition_id;
          const isFlipped = !!flipped[id];
          const det = details[id];
          const yes = m.tokens?.[0];
          const no  = m.tokens?.[1];
          const yesPct = yes?.price ? Math.round(yes.price * 100) : null;
          const noPct  = no?.price  ? Math.round(no.price  * 100) : null;

          return (
            <div key={id} style={{perspective:'1200px', height: isFlipped ? '420px' : '200px', transition:'height 0.55s', cursor:'pointer'}}
              onClick={() => handleFlip(m)}>
              <div style={{
                position:'relative', width:'100%', height:'100%',
                transition:'transform 0.55s cubic-bezier(0.4,0.2,0.2,1)',
                transformStyle:'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'none',
              }}>

                {/* ── FRONT ── */}
                <div className="card" style={{position:'absolute',inset:0,backfaceVisibility:'hidden',display:'flex',flexDirection:'column',padding:'var(--space-4)'}}>
                  {/* Top row: category + flip hint */}
                  <div style={{fontSize:'11px',color:'var(--color-text-faint)',marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{textTransform:'uppercase',letterSpacing:'0.05em'}}>{m.category}</span>
                    <span style={{fontSize:'10px',color:'var(--color-text-faint)'}}>flip for orderbook ↗</span>
                  </div>

                  {/* Market question */}
                  <div style={{flex:1,fontWeight:600,fontSize:'14px',lineHeight:1.45,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',marginBottom:'10px'}}>
                    {m.question}
                  </div>

                  {/* YES/NO probability bar */}
                  {yesPct !== null && noPct !== null && (
                    <div style={{marginBottom:'10px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',fontWeight:600,marginBottom:'4px'}}>
                        <span style={{color:'#10b981'}}>YES {yesPct}¢</span>
                        <span style={{color:'#ef4444'}}>NO {noPct}¢</span>
                      </div>
                      <div style={{display:'flex',borderRadius:'4px',overflow:'hidden',height:'8px'}}>
                        <div style={{width:`${yesPct}%`,background:'#10b981',transition:'width 0.3s'}} />
                        <div style={{width:`${noPct}%`,background:'#ef4444',transition:'width 0.3s'}} />
                      </div>
                    </div>
                  )}

                  {/* Footer: Volume + Liquidity */}
                  <div style={{paddingTop:'8px',borderTop:'1px solid var(--color-border)',display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                    <span><span style={{color:'var(--color-text-faint)'}}>24h Vol </span><b>{fmt(m.volume)}</b></span>
                    <span><span style={{color:'var(--color-text-faint)'}}>Liq </span><b style={{color:'var(--color-primary)'}}>{fmt(m.liquidity)}</b></span>
                  </div>
                        {/* ── BACK ── */}
                <div className="card" style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',display:'flex',flexDirection:'column',padding:'var(--space-3)',background:'var(--color-bg-alt)',overflow:'hidden'}}>
                  {/* Back header */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',paddingBottom:'6px',borderBottom:'1px solid var(--color-border)'}}>
                    <span style={{fontSize:'12px',fontWeight:600,color:'var(--color-text)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.question}</span>
                    <span style={{fontSize:'10px',color:'var(--color-text-faint)',marginLeft:'6px',whiteSpace:'nowrap'}}>← Back</span>
                  </div>

                  {det?.loading ? (
                    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--color-text-muted)',fontSize:'12px',gap:'8px'}}>
                      <div style={{width:'20px',height:'20px',border:'2px solid var(--color-border)',borderTopColor:'var(--color-primary)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
                      Fetching Orderbook...
                    </div>
                  ) : det?.error ? (
                     <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#ef4444',fontSize:'12px',textAlign:'center',padding:'var(--space-4)'}}>
                        Failed to load real-time depth.
                     </div>
                  ) : (
                    <>
                      {/* Orderbook */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
                        {/* Bids */}
                        <div>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#10b981',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Real-time Bids</div>
                          <table style={{width:'100%',fontSize:'11px',borderCollapse:'collapse'}}>
                            <thead><tr>
                              <th style={{textAlign:'left',color:'var(--color-text-faint)',fontWeight:500,paddingBottom:'2px'}}>Price</th>
                              <th style={{textAlign:'right',color:'var(--color-text-faint)',fontWeight:500,paddingBottom:'2px'}}>Size</th>
                            </tr></thead>
                            <tbody>
                              {(det?.bids || []).map((b, i) => (
                                <tr key={i} style={{background: i%2===0 ? 'rgba(16,185,129,0.04)' : 'transparent'}}>
                                  <td style={{color:'#10b981',fontFamily:'var(--font-mono)',padding:'1px 0'}}>{b.price.toFixed(3)}</td>
                                  <td style={{textAlign:'right',fontFamily:'var(--font-mono)',color:'var(--color-text-muted)',padding:'1px 0'}}>{b.size.toFixed(0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Asks */}
                        <div>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#ef4444',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Real-time Asks</div>
                          <table style={{width:'100%',fontSize:'11px',borderCollapse:'collapse'}}>
                            <thead><tr>
                              <th style={{textAlign:'left',color:'var(--color-text-faint)',fontWeight:500,paddingBottom:'2px'}}>Price</th>
                              <th style={{textAlign:'right',color:'var(--color-text-faint)',fontWeight:500,paddingBottom:'2px'}}>Size</th>
                            </tr></thead>
                            <tbody>
                              {(det?.asks || []).map((a, i) => (
                                <tr key={i} style={{background: i%2===0 ? 'rgba(239,68,68,0.04)' : 'transparent'}}>
                                  <td style={{color:'#ef4444',fontFamily:'var(--font-mono)',padding:'1px 0'}}>{a.price.toFixed(3)}</td>
                                  <td style={{textAlign:'right',fontFamily:'var(--font-mono)',color:'var(--color-text-muted)',padding:'1px 0'}}>{a.size.toFixed(0)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Recent Trades (Price History Proxy) */}
                      <div style={{marginBottom:'8px'}}>
                        <div style={{fontSize:'10px',fontWeight:700,color:'var(--color-text-muted)',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Price Updates (Proxy Feed)</div>
                        <table style={{width:'100%',fontSize:'11px',borderCollapse:'collapse'}}>
                          <thead><tr>
                            <th style={{textAlign:'left',color:'var(--color-text-faint)',fontWeight:500}}>Time</th>
                            <th style={{textAlign:'center',color:'var(--color-text-faint)',fontWeight:500}}>Side*</th>
                            <th style={{textAlign:'right',color:'var(--color-text-faint)',fontWeight:500}}>Price</th>
                          </tr></thead>
                          <tbody>
                            {(det?.recentMoves || []).slice(0, 10).map((t, i) => (
                              <tr key={i}>
                                <td style={{color:'var(--color-text-faint)',fontFamily:'var(--font-mono)',padding:'1px 0'}}>{t.time}</td>
                                <td style={{textAlign:'center',padding:'1px 0'}}>
                                  <span style={{fontSize:'10px',fontWeight:600,color: t.side==='BUY' ? '#10b981' : '#ef4444'}}>{t.side}</span>
                                </td>
                                <td style={{textAlign:'right',fontFamily:'var(--font-mono)',color:'var(--color-text)',padding:'1px 0'}}>{t.price?.toFixed ? t.price.toFixed(3) : t.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{fontSize:'9px', color:'var(--color-text-faint)', marginTop:'4px', fontStyle:'italic'}}>*Side inferred from price delta</div>
                      </div>
                    </>
                  )}

                  {/* Vet Traders button */}
                  <div style={{marginTop:'auto',paddingTop:'6px'}}>
                    <button className="btn btn-primary btn-sm" style={{width:'100%',fontSize:'12px'}}
                      onClick={e => { e.stopPropagation(); router.push(`/wallet?wallet=${yes?.token_id || ''}`); }}>
                      <span dangerouslySetInnerHTML={{ __html: '<i data-lucide="shield-check" width="12" height="12"></i>' }} />
                      {' '}Vet Traders for this Market
                    </button>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { from {transform:rotate(0deg)} to {transform:rotate(360deg)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
      `}</style>
    </div>
  );
}
