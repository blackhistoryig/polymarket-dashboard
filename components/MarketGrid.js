import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

export default function MarketGrid() {
  const router = useRouter();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flipped, setFlipped] = useState({});
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

  const fmt = (n) => {
    if (!n) return '$0';
    const v = parseFloat(n);
    if (v >= 1e6) return `$${(v/1e6).toFixed(1)}M`;
    if (v >= 1e3) return `$${(v/1e3).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  const SORTS = [
    { id: 'volume',    label: 'Volume',    icon: 'bar-chart-2',  key: 'volume' },
    { id: 'liquidity', label: 'Liquidity', icon: 'droplets',     key: 'liquidity' },
    { id: 'activity',  label: 'Activity',  icon: 'zap',          key: 'volume' }, // 24hr volume = activity proxy
  ];

  const sorted = [...markets].sort((a, b) => {
    if (sortBy === 'liquidity') return (b.liquidity || 0) - (a.liquidity || 0);
    return (b.volume || 0) - (a.volume || 0); // volume & activity both sort by volume
  });
  const visible = showAll ? sorted : sorted.slice(0, DEFAULT_LIMIT);

  if (loading) return (
    <div style={{padding:'var(--space-5)',textAlign:'center',color:'var(--color-text-muted)',fontSize:'var(--text-sm)'}}>
      Loading Hot Markets...
    </div>
  );
  if (error) return (
    <div style={{padding:'var(--space-5)',color:'var(--color-error, #ef4444)',fontSize:'var(--text-sm)',background:'rgba(239,68,68,0.06)',borderRadius:'8px',marginBottom:'var(--space-4)'}}>
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
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'var(--space-3)',marginBottom:'var(--space-4)'}}>
        <div className="section-heading" style={{marginBottom:0}}>
          <span dangerouslySetInnerHTML={{__html:'<i data-lucide="flame" width="13" height="13"></i>'}} />
          {' '}Hot Markets
        </div>
        {/* Sort filter pills */}
        <div style={{display:'flex',gap:'6px'}}>
          {[{id:'volume',label:'Volume',icon:'bar-chart-2'},{id:'liquidity',label:'Liquidity',icon:'droplets'},{id:'activity',label:'Activity',icon:'zap'}].map(f => (
            <button
              key={f.id}
              onClick={() => setSortBy(f.id)}
              className={`btn btn-sm ${sortBy === f.id ? 'btn-secondary' : 'btn-ghost text-muted'}`}
              style={{display:'flex',alignItems:'center',gap:'4px',fontSize:'12px'}}
            >
              <span dangerouslySetInnerHTML={{__html:`<i data-lucide="${f.icon}" width="11" height="11"></i>`}} />
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'var(--space-4)'}}>
        {visible.map(m => {
          const isFlipped = !!flipped[m.condition_id];
          const yes = m.tokens?.[0];
          const no = m.tokens?.[1];
          const yesPrice = yes?.price ? parseFloat(yes.price) : null;
          const noPrice = no?.price ? parseFloat(no.price) : null;
          return (
            <div key={m.condition_id} style={{perspective:'1000px',height:'220px',cursor:'pointer'}}
              onClick={() => setFlipped(p => ({...p, [m.condition_id]: !p[m.condition_id]}))}>
              <div style={{
                position:'relative',width:'100%',height:'100%',
                transition:'transform 0.55s cubic-bezier(0.4,0.2,0.2,1)',
                transformStyle:'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'none',
              }}>
                {/* FRONT */}
                <div className="card" style={{position:'absolute',inset:0,backfaceVisibility:'hidden',display:'flex',flexDirection:'column',padding:'var(--space-4)'}}>
                  <div style={{fontSize:'var(--text-xs)',color:'var(--color-text-faint)',marginBottom:'6px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{textTransform:'uppercase',letterSpacing:'0.05em'}}>{m.category || 'Markets'}</span>
                    <span dangerouslySetInnerHTML={{__html:'<i data-lucide="flip-horizontal-2" width="11" height="11"></i>'}} />
                  </div>
                  <div style={{flex:1,fontWeight:600,fontSize:'14px',lineHeight:1.45,display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                    {m.question}
                  </div>
                  <div style={{marginTop:'auto',paddingTop:'10px',borderTop:'1px solid var(--color-border)',display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                    <span><span style={{color:'var(--color-text-faint)'}}>Vol </span><b>{fmt(m.volume)}</b></span>
                    <span><span style={{color:'var(--color-text-faint)'}}>Liq </span><b style={{color:'var(--color-primary)'}}>{fmt(m.liquidity)}</b></span>
                  </div>
                </div>

                {/* BACK */}
                <div className="card" style={{position:'absolute',inset:0,backfaceVisibility:'hidden',transform:'rotateY(180deg)',display:'flex',flexDirection:'column',padding:'var(--space-4)',background:'var(--color-bg-alt)'}}>
                  <div style={{fontSize:'var(--text-xs)',fontWeight:600,color:'var(--color-text-muted)',borderBottom:'1px solid var(--color-border)',paddingBottom:'8px',marginBottom:'10px',display:'flex',justifyContent:'space-between'}}>
                    <span>Token Prices</span>
                    <span style={{color:'var(--color-text-faint)'}} dangerouslySetInnerHTML={{__html:'<i data-lucide="arrow-left" width="11" height="11"></i>'}} />
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px',flex:1}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 8px',borderRadius:'6px',background:'rgba(16,185,129,0.08)'}}>
                      <span style={{fontSize:'13px',fontWeight:500}}>YES</span>
                      <span style={{color:'#10b981',fontWeight:700,fontFamily:'var(--font-mono)',fontSize:'15px'}}>
                        {yesPrice !== null ? `${(yesPrice*100).toFixed(0)}¢` : '—'}
                      </span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 8px',borderRadius:'6px',background:'rgba(239,68,68,0.08)'}}>
                      <span style={{fontSize:'13px',fontWeight:500}}>NO</span>
                      <span style={{color:'#ef4444',fontWeight:700,fontFamily:'var(--font-mono)',fontSize:'15px'}}>
                        {noPrice !== null ? `${(noPrice*100).toFixed(0)}¢` : '—'}
                      </span>
                    </div>
                  </div>
                  <div style={{marginTop:'auto',paddingTop:'8px',display:'flex',gap:'6px'}}>
                    <button className="btn btn-primary btn-sm" style={{flex:1,fontSize:'11px'}}
                      onClick={e => { e.stopPropagation(); router.push(`/wallet?q=${yes?.token_id || ''}`); }}>
                      Vet Top Traders
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More / Less toggle */}
      {markets.length > DEFAULT_LIMIT && (
        <div style={{textAlign:'center',marginTop:'var(--space-4)'}}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(p => !p)}>
            <span dangerouslySetInnerHTML={{__html: showAll
              ? '<i data-lucide="chevron-up" width="13" height="13"></i>'
              : '<i data-lucide="chevron-down" width="13" height="13"></i>'}}
            />
            {showAll ? ` Show fewer` : ` Show ${markets.length - DEFAULT_LIMIT} more markets`}
          </button>
        </div>
      )}

      {/* Scroll cue pointing to Leaderboard below */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '6px', padding: 'var(--space-6) 0 var(--space-2)',
        borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-4)'
      }}>
        <span style={{fontSize:'var(--text-xs)',color:'var(--color-text-faint)',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:500}}>
          Scroll down for the Top Trader Leaderboard
        </span>
        <span style={{animation:'bounce 1.5s infinite'}} dangerouslySetInnerHTML={{__html:'<i data-lucide="chevrons-down" width="18" height="18" style="color:var(--color-primary);opacity:0.6;"></i>'}} />
      </div>

      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }`}</style>
    </div>
  );
}
