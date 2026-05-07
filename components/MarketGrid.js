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
  const [details, setDetails] = useState({}); 
  const [showAll, setShowAll] = useState(false);
  const [sortBy, setSortBy] = useState('volume');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/markets');
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const arr = await res.json();
        setMarkets(arr.slice(0, MAX_LIMIT));
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }
    load();
  }, []);

  const loadDetail = useCallback(async (market) => {
    const id = market.condition_id;
    const tokenId = market.tokens?.[0]?.token_id;
    if (!tokenId || details[id]) return;

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

  if (loading) return <div className="skeleton skel-card" style={{height:'300px'}}></div>;
  if (error) return <div className="state-box"><h3>Error loading markets</h3><p>{error}</p></div>;

  const sorted = [...markets].sort((a,b) => (parseFloat(b[sortBy]) || 0) - (parseFloat(a[sortBy]) || 0));
  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_LIMIT);

  return (
    <div style={{marginTop:'var(--space-8)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'var(--space-4)'}}>
        <h2 className="section-heading" style={{margin:0}}>Hot Markets</h2>
        <div style={{display:'flex',gap:'6px'}}>
          {[
            {id:'volume', label:'Volume', icon:'trending-up'},
            {id:'liquidity', label:'Liquidity', icon:'droplets'}
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

                {/* FRONT */}
                <div className="card" style={{position:'absolute',inset:0,backfaceVisibility:'hidden',display:'flex',flexDirection:'column',padding:'var(--space-4)'}}>
                  <div style={{fontSize:'11px',color:'var(--color-text-faint)',marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{textTransform:'uppercase'}}>{m.category}</span>
                    <span style={{fontSize:'10px'}}>flip for depth ↗</span>
                  </div>
                  <div style={{flex:1,fontWeight:600,fontSize:'14px',lineHeight:1.45,overflow:'hidden',marginBottom:'10px'}}>
                    {m.question}
                  </div>
                  {yesPct !== null && (
                    <div style={{marginBottom:'10px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',fontWeight:600,marginBottom:'4px'}}>
                        <span style={{color:'#10b981'}}>YES {yesPct}¢</span>
                        <span style={{color:'#ef4444'}}>NO {noPct}¢</span>
                      </div>
                      <div style={{display:'flex',borderRadius:'4px',overflow:'hidden',height:'8px',background:'var(--color-border)'}}>
                        <div style={{width:`${yesPct}%`,background:'#10b981'}} />
                        <div style={{width:`${noPct}%`,background:'#ef4444'}} />
                      </div>
                    </div>
                  )}
                  <div style={{paddingTop:'8px',borderTop:'1px solid var(--color-border)',display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                    <span>Vol <b>{fmt(m.volume)}</b></span>
                    <span>Liq <b style={{color:'var(--color-primary)'}}>{fmt(m.liquidity)}</b></span>
                  </div>
                </div>

                {/* BACK */}
                <div className="card" style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',display:'flex',flexDirection:'column',padding:'var(--space-3)',background:'var(--color-bg-alt)',overflow:'hidden'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px',paddingBottom:'6px',borderBottom:'1px solid var(--color-border)'}}>
                    <span style={{fontSize:'12px',fontWeight:600,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{m.question}</span>
                    <span style={{fontSize:'10px',color:'var(--color-text-faint)'}}>← Back</span>
                  </div>

                  {det?.loading ? (
                    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontSize:'12px',gap:'8px'}}>
                      <div style={{width:'20px',height:'20px',border:'2px solid var(--color-border)',borderTopColor:'var(--color-primary)',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
                      Loading depth...
                    </div>
                  ) : det?.error ? (
                    <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'#ef4444',fontSize:'12px'}}>Error loading data</div>
                  ) : (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',marginBottom:'8px'}}>
                        <div>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#10b981',marginBottom:'3px'}}>BIDS</div>
                          <table style={{width:'100%',fontSize:'10px'}}>
                            <tbody>
                              {(det?.bids || []).map((b, i) => (
                                <tr key={i}><td style={{color:'#10b981'}}>{b.price.toFixed(3)}</td><td style={{textAlign:'right'}}>{b.size.toFixed(0)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#ef4444',marginBottom:'3px'}}>ASKS</div>
                          <table style={{width:'100%',fontSize:'10px'}}>
                            <tbody>
                              {(det?.asks || []).map((a, i) => (
                                <tr key={i}><td style={{color:'#ef4444'}}>{a.price.toFixed(3)}</td><td style={{textAlign:'right'}}>{a.size.toFixed(0)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div style={{marginBottom:'8px',flex:1,overflow:'hidden'}}>
                        <div style={{fontSize:'10px',fontWeight:700,color:'var(--color-text-faint)',marginBottom:'3px'}}>RECENT MOVES</div>
                        <table style={{width:'100%',fontSize:'10px'}}>
                          <tbody>
                            {(det?.recentMoves || []).slice(0, 5).map((t, i) => (
                              <tr key={i}><td>{t.time}</td><td style={{textAlign:'center',color:t.side==='BUY'?'#10b981':'#ef4444'}}>{t.side}</td><td style={{textAlign:'right'}}>{t.price?.toFixed ? t.price.toFixed(3) : t.price}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div style={{padding:'6px', background:'rgba(59,130,246,0.05)', borderRadius:'6px', border:'1px solid rgba(59,130,246,0.1)', marginBottom:'4px'}}>
                         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{fontSize:'11px', fontWeight:600}}>everydaymortgage</span>
                            <button className="btn btn-primary btn-sm" style={{height:'20px', padding:'0 6px', fontSize:'10px'}}
                              onClick={e => { e.stopPropagation(); router.push('/wallet?wallet=0x91eee6b7cea1916214daebec3b92b7513079c5b8'); }}>
                              Vet
                            </button>
                         </div>
                      </div>
                    </>
                  )}
                  <div style={{marginTop:'auto', paddingTop:'4px'}}>
                    <button className="btn btn-ghost btn-sm" style={{width:'100%',fontSize:'11px'}} onClick={e => { e.stopPropagation(); router.push('/wallet'); }}>
                      Browse All Traders
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
      `}</style>
    </div>
  );
}
