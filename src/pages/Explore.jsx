import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Search, ArrowRight, ChevronRight, BarChart2 } from 'lucide-react';
import Header from '../components/Header';
import { getStockData } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const FMT = v => v==null?'—':new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);

const INDICES = [
  { sym:'NIFTY50.NS',    name:'NIFTY 50',     fb:22150 },
  { sym:'NIFTYBANK.NS',  name:'BANK NIFTY',   fb:47200 },
  { sym:'SENSEX.NS',     name:'SENSEX',        fb:73100 },
  { sym:'NIFTYIT.NS',    name:'NIFTY IT',      fb:36800 },
];

const POPULAR = [
  { s:'RELIANCE.NS',  n:'Reliance Industries',      sec:'Energy',   fb:1413  },
  { s:'TCS.NS',       n:'Tata Consultancy Services', sec:'IT',       fb:3870  },
  { s:'HDFCBANK.NS',  n:'HDFC Bank',                sec:'Banking',  fb:1690  },
  { s:'INFY.NS',      n:'Infosys',                  sec:'IT',       fb:1510  },
  { s:'ICICIBANK.NS', n:'ICICI Bank',               sec:'Banking',  fb:1360  },
  { s:'SBIN.NS',      n:'SBI',                      sec:'Banking',  fb:782   },
  { s:'BAJFINANCE.NS',n:'Bajaj Finance',             sec:'Finance',  fb:8910  },
  { s:'WIPRO.NS',     n:'Wipro',                     sec:'IT',       fb:255   },
  { s:'TATAMOTORS.NS',n:'Tata Motors',               sec:'Auto',     fb:665   },
  { s:'BHARTIARTL.NS',n:'Bharti Airtel',             sec:'Telecom',  fb:1640  },
  { s:'IRFC.NS',      n:'IRFC',                      sec:'Finance',  fb:148   },
  { s:'RVNL.NS',      n:'RVNL',                      sec:'Infra',    fb:295   },
  { s:'SUNPHARMA.NS', n:'Sun Pharma',                sec:'Pharma',   fb:1720  },
  { s:'MARUTI.NS',    n:'Maruti Suzuki',              sec:'Auto',     fb:11900 },
  { s:'LTIM.NS',      n:'LTIMindtree',               sec:'IT',       fb:5120  },
  { s:'KOTAKBANK.NS', n:'Kotak Mahindra Bank',        sec:'Banking',  fb:1960  },
];

const SEC_BG = { IT:'#EEF0FF', Banking:'#E6F4FF', Finance:'#E6FFF9', Energy:'#FFF3E8', Auto:'#FFF0F8', Telecom:'#F3EEFF', Pharma:'#EDFFF5', Infra:'#E6FFFD', Services:'#F5F5F5' };
const SEC_CLR = { IT:'#5367ff', Banking:'#0891b2', Finance:'#00b386', Energy:'#ea580c', Auto:'#db2777', Telecom:'#7c3aed', Pharma:'#16a34a', Infra:'#0f766e', Services:'#64748b' };

function IndexCard({ name, data, loading }) {
  const up = (data?.changePercent??0) >= 0;
  return (
    <div style={{ flex:'1 1 140px',minWidth:130,padding:'14px 16px',background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--r-md)',boxShadow:'var(--shadow-xs)' }}>
      <p style={{ fontSize:11,fontWeight:600,color:'var(--muted)',letterSpacing:'0.3px',marginBottom:6,textTransform:'uppercase' }}>{name}</p>
      {loading||!data ? (
        <><div className="skeleton" style={{ height:20,width:'75%',marginBottom:5 }}/><div className="skeleton" style={{ height:14,width:'50%' }}/></>
      ) : (
        <>
          <p style={{ fontSize:18,fontWeight:700,fontFamily:'var(--mono)',color:'var(--text)',letterSpacing:'-0.5px',marginBottom:4 }}>{FMT(data.price)}</p>
          <p style={{ fontSize:12,fontWeight:600,color:up?'var(--green-d)':'var(--red)' }}>
            {up?'▲':'▼'} {FMT(Math.abs(data.change??0))} ({up?'+':''}{(data.changePercent??0).toFixed(2)}%)
          </p>
        </>
      )}
    </div>
  );
}

export default function Explore() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [prices, setPrices]  = useState({});
  const [indices,setIndices] = useState({});
  const [query,  setQuery]   = useState('');
  const [loaded, setLoaded]  = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      const r = {};
      await Promise.allSettled(POPULAR.slice(0,12).map(async s => {
        try { const d = await getStockData(s.s,'1d','1m'); if(d?.meta) r[s.s]={price:d.meta.price,changePercent:d.meta.changePercent??0,change:d.meta.change??0}; } catch {}
      }));
      setPrices(r); setLoaded(true);
    };
    fetchPrices();
  }, []);

  const doSearch = e => {
    e.preventDefault();
    if (query.trim()) navigate(`/stocks?q=${encodeURIComponent(query.trim())}`);
  };

  // Double for infinite ticker
  const tickerItems = [...POPULAR, ...POPULAR];

  return (
    <div style={{ minHeight:'100vh',background:'var(--bg)' }}>
      <Header/>

      {/* ── Indices bar (like Groww top bar) ── */}
      <div style={{ background:'#fff',borderBottom:'1px solid var(--border)',overflowX:'auto' }}>
        <div style={{ maxWidth:1280,margin:'0 auto',display:'flex',padding:'0 24px',gap:0 }}>
          {INDICES.map(idx => {
            const d = indices[idx.sym];
            const up = (d?.changePercent??0) >= 0;
            return (
              <div key={idx.sym} style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 20px',borderRight:'1px solid var(--border)',flexShrink:0,whiteSpace:'nowrap' }}>
                <span style={{ fontSize:12,fontWeight:600,color:'var(--text)' }}>{idx.name}</span>
                {d ? (
                  <span style={{ fontSize:12,fontWeight:600,color:up?'var(--green-d)':'var(--red)' }}>
                    {FMT(d.price)} {up?'▲':'▼'} {(d.changePercent??0).toFixed(2)}%
                  </span>
                ) : (
                  <span style={{ fontSize:11,color:'var(--muted)',fontFamily:'var(--mono)' }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hero section ── */}
      <div style={{ background:'linear-gradient(135deg,#f0fff9 0%,#f0f2ff 100%)',borderBottom:'1px solid var(--border)',padding:'44px 24px 40px' }}>
        <div style={{ maxWidth:680,margin:'0 auto',textAlign:'center' }}>
          <p className="fade-up" style={{ fontSize:12,fontWeight:700,color:'var(--green-d)',letterSpacing:'1.5px',textTransform:'uppercase',marginBottom:14 }}>
            Virtual Stock Market Trading
          </p>
          <h1 className="fade-up stagger-1" style={{ fontSize:36,fontWeight:800,color:'var(--text)',letterSpacing:'-1px',lineHeight:1.2,marginBottom:12 }}>
            Practice trading with<br/><span style={{ color:'var(--green)' }}>real NSE prices</span>
          </h1>
          <p className="fade-up stagger-2" style={{ fontSize:15,color:'var(--text2)',lineHeight:1.7,marginBottom:28 }}>
            Zero risk. Live data. Full experience. The best way to learn investing.
          </p>

          {/* Groww-style search bar */}
          <form onSubmit={doSearch} className="fade-up stagger-3"
            style={{ display:'flex',maxWidth:520,margin:'0 auto',background:'#fff',borderRadius:28,border:'1.5px solid var(--border2)',boxShadow:'0 4px 20px rgba(0,0,0,0.08)',overflow:'hidden' }}>
            <div style={{ flex:1,display:'flex',alignItems:'center',padding:'0 18px',gap:10 }}>
              <Search size={16} color="var(--muted)"/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search stocks, e.g. RELIANCE, TCS…"
                style={{ flex:1,border:'none',outline:'none',fontSize:14,color:'var(--text)',background:'transparent',padding:'13px 0' }}/>
            </div>
            <button type="submit" style={{ padding:'13px 24px',background:'var(--green)',border:'none',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',flexShrink:0,transition:'background 0.15s' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--green-d)'}
              onMouseLeave={e=>e.currentTarget.style.background='var(--green)'}>
              Search
            </button>
          </form>

          {!isLoggedIn && (
            <p className="fade-up stagger-4" style={{ fontSize:13,color:'var(--text2)',marginTop:16 }}>
              <Link to="/register" style={{ color:'var(--green)',fontWeight:600 }}>Create free account</Link> to start trading →
            </p>
          )}

          {/* Analysis CTA */}
          <div className="fade-up stagger-4" style={{ marginTop:20 }}>
            <Link to="/analysis"
              style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 24px', background:'#fff', border:'1.5px solid var(--border2)', borderRadius:28, fontSize:14, fontWeight:600, color:'var(--text)', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', transition:'all 0.15s', textDecoration:'none' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.color='var(--blue)'; e.currentTarget.style.boxShadow='0 4px 16px rgba(83,103,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)'; }}>
              <BarChart2 size={16} color="var(--blue)"/>
              Fundamental Analysis
              <span style={{ fontSize:11, padding:'2px 8px', background:'var(--blue-lt)', color:'var(--blue)', borderRadius:10, fontWeight:700 }}>NEW</span>
            </Link>
          </div>
        </div>
      </div>

      <main className="page">

        {/* ── Most bought stocks (Groww scrolling ticker) ── */}
        <section style={{ marginBottom:40 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
            <h2 style={{ fontSize:17,fontWeight:700,color:'var(--text)' }}>Most traded on Stockify</h2>
            <Link to="/trade" style={{ fontSize:13,color:'var(--green)',fontWeight:600,display:'flex',alignItems:'center',gap:4 }}>
              See all <ChevronRight size={14}/>
            </Link>
          </div>

          {/* Infinite scroll ticker */}
          <div style={{ overflow:'hidden',position:'relative' }}>
            {/* Fade edges */}
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:40,background:'linear-gradient(to right,var(--bg),transparent)',zIndex:1,pointerEvents:'none' }}/>
            <div style={{ position:'absolute',right:0,top:0,bottom:0,width:40,background:'linear-gradient(to left,var(--bg),transparent)',zIndex:1,pointerEvents:'none' }}/>

            <div style={{ display:'flex',gap:12,animation:'ticker 60s linear infinite',width:'max-content' }}
              onMouseEnter={e=>e.currentTarget.style.animationPlayState='paused'}
              onMouseLeave={e=>e.currentTarget.style.animationPlayState='running'}>
              {tickerItems.map((stock,i) => {
                const d   = prices[stock.s];
                const up  = (d?.changePercent??0) >= 0;
                const c   = SEC_CLR[stock.sec]||'#64748b';
                const bg  = SEC_BG[stock.sec]||'#f5f5f5';
                return (
                  <div key={`${stock.s}-${i}`} onClick={()=>navigate(`/stocks?q=${stock.s.replace('.NS','')}`)}
                    style={{ background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--r-md)',padding:'14px 16px',minWidth:160,cursor:'pointer',transition:'all 0.15s',flexShrink:0 }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=c; e.currentTarget.style.boxShadow=`0 4px 16px ${c}22`; e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}>
                    <div style={{ width:38,height:38,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10 }}>
                      <span style={{ fontSize:11,fontWeight:700,color:c }}>{stock.s.replace('.NS','').slice(0,4)}</span>
                    </div>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:128 }}>{stock.n}</p>
                    <p style={{ fontSize:11,color:'var(--muted)',marginBottom:8 }}>{stock.sec}</p>
                    {d ? (
                      <>
                        <p style={{ fontSize:15,fontWeight:700,fontFamily:'var(--mono)',color:'var(--text)',marginBottom:3 }}>₹{FMT(d.price)}</p>
                        <p style={{ fontSize:12,fontWeight:600,color:up?'var(--green-d)':'var(--red)' }}>
                          {up?'▲':'▼'} {(d.changePercent??0).toFixed(2)}%
                        </p>
                      </>
                    ) : (
                      <><div className="skeleton" style={{ height:18,width:'72%',marginBottom:5 }}/><div className="skeleton" style={{ height:14,width:'45%' }}/></>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Market overview grid ── */}
        <section style={{ marginBottom:40 }}>
          <h2 style={{ fontSize:17,fontWeight:700,color:'var(--text)',marginBottom:16 }}>Market Overview</h2>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))',gap:12 }}>
            {POPULAR.slice(0,8).map(stock => {
              const d  = prices[stock.s];
              const up = (d?.changePercent??0) >= 0;
              const c  = SEC_CLR[stock.sec]||'#64748b';
              const bg = SEC_BG[stock.sec]||'#f5f5f5';
              return (
                <div key={stock.s} className="card card-hover" onClick={()=>navigate(`/stocks?q=${stock.s.replace('.NS','')}`)}
                  style={{ padding:'16px',cursor:'pointer' }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                    <div style={{ width:36,height:36,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <span style={{ fontSize:10,fontWeight:700,color:c }}>{stock.s.replace('.NS','').slice(0,4)}</span>
                    </div>
                    {d && <span style={{ fontSize:11,fontWeight:700,color:up?'var(--green-d)':'var(--red)',padding:'2px 6px',background:up?'var(--green-lt)':'var(--red-lt)',borderRadius:4 }}>{up?'+':''}{(d.changePercent??0).toFixed(2)}%</span>}
                  </div>
                  <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2 }}>{stock.n}</p>
                  <p style={{ fontSize:11,color:'var(--muted)',marginBottom:8 }}>{stock.sec}</p>
                  {d ? <p style={{ fontSize:16,fontWeight:700,fontFamily:'var(--mono)',color:'var(--text)' }}>₹{FMT(d.price)}</p>
                     : <div className="skeleton" style={{ height:20,width:'68%' }}/>}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA banner ── */}
        {!isLoggedIn && (
          <section style={{ background:'linear-gradient(135deg,#00d09c,#5367ff)',borderRadius:'var(--r-xl)',padding:'36px 32px',textAlign:'center',color:'#fff' }}>
            <h2 style={{ fontSize:24,fontWeight:800,letterSpacing:'-0.5px',marginBottom:8 }}>Start your investing journey</h2>
            <p style={{ fontSize:15,opacity:0.9,marginBottom:24,lineHeight:1.6 }}>Practice with ₹10,00,000 virtual money. Zero risk. Full learning.</p>
            <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
              <Link to="/register" style={{ padding:'12px 32px',background:'#fff',color:'var(--green)',borderRadius:28,fontWeight:700,fontSize:14,display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>
                Get Started Free <ArrowRight size={15}/>
              </Link>
              <Link to="/login" style={{ padding:'12px 28px',background:'rgba(255,255,255,0.2)',color:'#fff',borderRadius:28,fontWeight:600,fontSize:14,border:'1.5px solid rgba(255,255,255,0.5)' }}>
                Login
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
