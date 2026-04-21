import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Search, ArrowRight, ChevronRight, BarChart2, RefreshCw } from 'lucide-react';
import Header from '../components/Header';
// import SEO from '../components/SEO';
import { getStockData, getIndex } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const FMT = v => v==null?'—':new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);

// All 8 indices from backend /api/stocks/index/{symbol}
const INDICES = [
  { key:'nifty50',       name:'NIFTY 50',       short:'NIFTY',   color:'#5367ff' },
  { key:'sensex-bse',    name:'SENSEX',          short:'SENSEX',  color:'#ea580c' },
  { key:'bank-nifty',    name:'BANK NIFTY',      short:'BANKNF',  color:'#0891b2' },
  { key:'nifty-it',      name:'NIFTY IT',        short:'IT',      color:'#7c3aed' },
  { key:'finnifty',      name:'FIN NIFTY',       short:'FINNF',   color:'#00b386' },
  { key:'nifty-midcap-50',name:'NIFTY MIDCAP 50',short:'MIDCAP', color:'#db2777' },
  { key:'nifty-smallcap',name:'NIFTY SMALLCAP',  short:'SMCAP',  color:'#d97706' },
  { key:'india-vix',     name:'INDIA VIX',       short:'VIX',     color:'#64748b' },
];

const POPULAR = [
  { s:'RELIANCE.NS',  n:'Reliance Industries',      sec:'Energy',   fb:1413  },
  { s:'TCS.NS',       n:'Tata Consultancy Services', sec:'IT',       fb:3870  },
  { s:'HDFCBANK.NS',  n:'HDFC Bank',                sec:'Banking',  fb:1690  },
  { s:'INFY.NS',      n:'Infosys',                  sec:'IT',       fb:1510  },
  { s:'ICICIBANK.NS', n:'ICICI Bank',               sec:'Banking',  fb:1360  },
  { s:'SBIN.NS',      n:'SBI',                      sec:'Banking',  fb:782   },
  { s:'BAJFINANCE.NS',n:'Bajaj Finance',             sec:'Finance',  fb:8910  },
  { s:'WIPRO.NS',     n:'Wipro',                    sec:'IT',       fb:255   },
  { s:'TATAMOTORS.NS',n:'Tata Motors',              sec:'Auto',     fb:665   },
  { s:'BHARTIARTL.NS',n:'Bharti Airtel',            sec:'Telecom',  fb:1640  },
  { s:'IRFC.NS',      n:'IRFC',                     sec:'Finance',  fb:148   },
  { s:'RVNL.NS',      n:'RVNL',                     sec:'Infra',    fb:295   },
  { s:'SUNPHARMA.NS', n:'Sun Pharma',               sec:'Pharma',   fb:1720  },
  { s:'MARUTI.NS',    n:'Maruti Suzuki',             sec:'Auto',     fb:11900 },
  { s:'LTIM.NS',      n:'LTIMindtree',              sec:'IT',       fb:5120  },
  { s:'KOTAKBANK.NS', n:'Kotak Mahindra Bank',      sec:'Banking',  fb:1960  },
];

const SEC_BG  = { IT:'#EEF0FF',Banking:'#E6F4FF',Finance:'#E6FFF9',Energy:'#FFF3E8',Auto:'#FFF0F8',Telecom:'#F3EEFF',Pharma:'#EDFFF5',Infra:'#E6FFFD',Services:'#F5F5F5' };
const SEC_CLR = { IT:'#5367ff',Banking:'#0891b2',Finance:'#00b386',Energy:'#ea580c',Auto:'#db2777',Telecom:'#7c3aed',Pharma:'#16a34a',Infra:'#0f766e',Services:'#64748b' };

function IndexCard({ idx, data, loading }) {
  const up = (data?.changePercent ?? 0) >= 0;
  return (
    <div style={{ flex:'1 1 160px', minWidth:150, padding:'14px 16px', background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-md)', boxShadow:'var(--shadow-xs)', transition:'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = idx.color; e.currentTarget.style.boxShadow = `0 4px 16px ${idx.color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontSize:11, fontWeight:700, color:idx.color, letterSpacing:'0.3px', textTransform:'uppercase' }}>{idx.name}</span>
        {data && (
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4,
            background: up ? 'var(--green-lt)' : 'var(--red-lt)',
            color: up ? 'var(--green-d)' : 'var(--red)' }}>
            {up?'+':''}{(data.changePercent??0).toFixed(2)}%
          </span>
        )}
      </div>
      {loading || !data ? (
        <>
          <div className="skeleton" style={{ height:22, width:'75%', marginBottom:5 }}/>
          <div className="skeleton" style={{ height:14, width:'50%' }}/>
        </>
      ) : (
        <>
          <p style={{ fontSize:20, fontWeight:800, fontFamily:'var(--mono)', color:'var(--text)', letterSpacing:'-0.5px', marginBottom:3 }}>
            {FMT(data.price)}
          </p>
          <p style={{ fontSize:12, fontWeight:600, color: up?'var(--green-d)':'var(--red)' }}>
            {up?'▲':'▼'} {FMT(Math.abs(data.change??0))}
          </p>
        </>
      )}
    </div>
  );
}

export default function Explore() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [prices,    setPrices]    = useState({});
  const [indices,   setIndices]   = useState({});
  const [idxLoading,setIdxLoading]= useState(true);
  const [query,     setQuery]     = useState('');
  const [refreshing,setRefreshing]= useState(false);

  const fetchIndices = async () => {
    setIdxLoading(true);
    const r = {};
    await Promise.allSettled(INDICES.map(async idx => {
      try {
        const d = await getIndex(idx.key, '1d', '1h');
        if (d?.meta) r[idx.key] = d.meta;
      } catch {}
    }));
    setIndices(r);
    setIdxLoading(false);
  };

  const fetchStocks = async () => {
    const r = {};
    await Promise.allSettled(POPULAR.slice(0,12).map(async s => {
      try {
        const d = await getStockData(s.s,'1d','1m');
        if (d?.meta) r[s.s] = { price:d.meta.price, changePercent:d.meta.changePercent??0, change:d.meta.change??0 };
      } catch {}
    }));
    setPrices(r);
  };

  useEffect(() => {
    fetchIndices();
    fetchStocks();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchIndices(), fetchStocks()]);
    setRefreshing(false);
  };

  const doSearch = e => {
    e.preventDefault();
    if (query.trim()) navigate(`/stocks?q=${encodeURIComponent(query.trim())}`);
  };

  const tickerItems = [...POPULAR, ...POPULAR];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* <SEO
        title="Stockify — Free Virtual Stock Trading with Live NSE Prices"
        description="Practice stock trading for free with live NSE & BSE prices. ₹10,00,0 virtual money. MARKET & LIMIT orders, portfolio analytics, fundamental analysis. Best virtual trading platform India."
        keywords="virtual stock trading India, paper trading NSE, free stock market simulator, learn stock trading, NSE live prices, virtual trading app India"
        url="https://www.mystockify.in/"
      /> */}
      <Header/>

      {/* ── Hero ── */}
      <div style={{ background:'linear-gradient(135deg,#f0fff9 0%,#f0f2ff 100%)', borderBottom:'1px solid var(--border)', padding:'36px 24px 32px' }}>
        <div style={{ maxWidth:680, margin:'0 auto', textAlign:'center' }}>
          <p className="fade-up" style={{ fontSize:12, fontWeight:700, color:'var(--green-d)', letterSpacing:'1.5px', textTransform:'uppercase', marginBottom:12 }}>
            Virtual Stock Market Trading
          </p>
          <h1 className="fade-up stagger-1" style={{ fontSize:34, fontWeight:800, color:'var(--text)', letterSpacing:'-1px', lineHeight:1.2, marginBottom:10 }}>
            Invest smarter with<br/><span style={{ color:'var(--green)' }}>virtual trading</span>
          </h1>
          <p className="fade-up stagger-2" style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, marginBottom:24 }}>
            Practice with live NSE prices. No real money, full brokerage experience.
          </p>

          {/* Search bar */}
          <form onSubmit={doSearch} className="fade-up stagger-3"
            style={{ display:'flex', maxWidth:500, margin:'0 auto', background:'#fff', borderRadius:28, border:'1.5px solid var(--border2)', boxShadow:'0 4px 20px rgba(0,0,0,0.08)', overflow:'hidden' }}>
            <div style={{ flex:1, display:'flex', alignItems:'center', padding:'0 16px', gap:8 }}>
              <Search size={15} color="var(--muted)"/>
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search RELIANCE, TCS, NIFTY…"
                style={{ flex:1, border:'none', outline:'none', fontSize:14, color:'var(--text)', background:'transparent', padding:'13px 0' }}/>
            </div>
            <button type="submit"
              style={{ padding:'13px 22px', background:'var(--green)', border:'none', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Search
            </button>
          </form>

          {/* Analysis CTA */}
          <div className="fade-up stagger-4" style={{ marginTop:18 }}>
            <Link to="/analysis"
              style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'10px 22px', background:'#fff', border:'1.5px solid var(--border2)', borderRadius:28, fontSize:13, fontWeight:600, color:'var(--text)', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--blue)'; e.currentTarget.style.color='var(--blue)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.color='var(--text)'; }}>
              <BarChart2 size={15} color="var(--blue)"/>
              Fundamental Analysis
              <span style={{ fontSize:10, padding:'2px 7px', background:'var(--blue-lt)', color:'var(--blue)', borderRadius:10, fontWeight:700 }}>NEW</span>
            </Link>
          </div>

          {!isLoggedIn && (
            <p className="fade-up stagger-4" style={{ fontSize:13, color:'var(--text2)', marginTop:14 }}>
              <Link to="/register" style={{ color:'var(--green)', fontWeight:600 }}>Create free account</Link> to start trading →
            </p>
          )}
        </div>
      </div>

      <main className="page">

        {/* ── Market Indices ── */}
        <section style={{ marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Market Indices</h2>
            <button onClick={handleRefresh} disabled={refreshing}
              style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--muted)', background:'none', border:'none', cursor:'pointer' }}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}/>
              Refresh
            </button>
          </div>

          {/* Top row — 4 main indices */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
            {INDICES.slice(0,4).map(idx => (
              <IndexCard key={idx.key} idx={idx} data={indices[idx.key]} loading={idxLoading}/>
            ))}
          </div>

          {/* Bottom row — 4 more indices */}
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            {INDICES.slice(4,8).map(idx => (
              <IndexCard key={idx.key} idx={idx} data={indices[idx.key]} loading={idxLoading}/>
            ))}
          </div>

          {/* Indices table — detailed view */}
          <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden', marginTop:14, boxShadow:'var(--shadow-xs)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'10px 16px', background:'#fafafa', borderBottom:'1px solid var(--border)' }}>
              {['INDEX','PRICE','CHANGE','1D RETURN'].map(h => (
                <p key={h} style={{ fontSize:10, color:'var(--muted)', fontWeight:700, letterSpacing:'0.5px' }}>{h}</p>
              ))}
            </div>
            {INDICES.map((idx, i) => {
              const d  = indices[idx.key];
              const up = (d?.changePercent ?? 0) >= 0;
              return (
                <div key={idx.key} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:8, padding:'12px 16px', borderBottom: i<INDICES.length-1?'1px solid var(--border)':'none', alignItems:'center', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:idx.color, flexShrink:0 }}/>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{idx.name}</p>
                      {d?.exchange && <p style={{ fontSize:10, color:'var(--muted)' }}>{d.exchange}</p>}
                    </div>
                  </div>
                  <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>
                    {d ? FMT(d.price) : idxLoading ? <span className="skeleton" style={{ display:'inline-block', width:60, height:14, borderRadius:4 }}/> : '—'}
                  </p>
                  <p style={{ fontSize:12, fontWeight:600, color: up?'var(--green-d)':'var(--red)' }}>
                    {d ? `${up?'+':''}${FMT(d.change)}` : '—'}
                  </p>
                  <p style={{ fontSize:12, fontWeight:700, color: up?'var(--green-d)':'var(--red)' }}>
                    {d ? `${up?'+':''}${(d.changePercent??0).toFixed(2)}%` : '—'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Scrolling ticker ── */}
        <section style={{ marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)' }}>Most Traded</h2>
            <Link to="/trade" style={{ fontSize:13, color:'var(--green)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
              See all <ChevronRight size={14}/>
            </Link>
          </div>
          <div style={{ overflow:'hidden', position:'relative' }}>
            <div style={{ position:'absolute',left:0,top:0,bottom:0,width:40,background:'linear-gradient(to right,var(--bg),transparent)',zIndex:1,pointerEvents:'none' }}/>
            <div style={{ position:'absolute',right:0,top:0,bottom:0,width:40,background:'linear-gradient(to left,var(--bg),transparent)',zIndex:1,pointerEvents:'none' }}/>
            <div style={{ display:'flex', gap:12, animation:'ticker 60s linear infinite', width:'max-content' }}
              onMouseEnter={e => e.currentTarget.style.animationPlayState='paused'}
              onMouseLeave={e => e.currentTarget.style.animationPlayState='running'}>
              {tickerItems.map((stock, i) => {
                const d  = prices[stock.s];
                const up = (d?.changePercent ?? 0) >= 0;
                const c  = SEC_CLR[stock.sec] || '#64748b';
                const bg = SEC_BG[stock.sec]  || '#f5f5f5';
                return (
                  <div key={`${stock.s}-${i}`} onClick={() => navigate(`/stocks?q=${stock.s.replace('.NS','')}`)}
                    style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'14px 16px', minWidth:155, cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=c; e.currentTarget.style.boxShadow=`0 4px 16px ${c}22`; e.currentTarget.style.transform='translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}>
                    <div style={{ width:36,height:36,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10 }}>
                      <span style={{ fontSize:10,fontWeight:700,color:c }}>{stock.s.replace('.NS','').slice(0,4)}</span>
                    </div>
                    <p style={{ fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:123 }}>{stock.n}</p>
                    <p style={{ fontSize:11,color:'var(--muted)',marginBottom:8 }}>{stock.sec}</p>
                    {d ? (
                      <>
                        <p style={{ fontSize:14,fontWeight:700,fontFamily:'var(--mono)',color:'var(--text)',marginBottom:3 }}>₹{FMT(d.price)}</p>
                        <p style={{ fontSize:12,fontWeight:600,color:up?'var(--green-d)':'var(--red)' }}>{up?'▲':'▼'} {(d.changePercent??0).toFixed(2)}%</p>
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
        <section style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:14 }}>Market Overview</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12 }}>
            {POPULAR.slice(0,8).map(stock => {
              const d  = prices[stock.s];
              const up = (d?.changePercent ?? 0) >= 0;
              const c  = SEC_CLR[stock.sec] || '#64748b';
              const bg = SEC_BG[stock.sec]  || '#f5f5f5';
              return (
                <div key={stock.s} className="card card-hover" onClick={() => navigate(`/stocks?q=${stock.s.replace('.NS','')}`)}
                  style={{ padding:'16px', cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
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
          <section style={{ background:'linear-gradient(135deg,#00d09c,#5367ff)', borderRadius:'var(--r-xl)', padding:'36px 32px', textAlign:'center', color:'#fff' }}>
            <h2 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.5px', marginBottom:8 }}>Start your investing journey</h2>
            <p style={{ fontSize:15, opacity:0.9, marginBottom:24, lineHeight:1.6 }}>Start with ₹10,00,000 virtual money. Build confidence before you invest real money.</p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <Link to="/register" style={{ padding:'12px 32px', background:'#fff', color:'var(--green)', borderRadius:28, fontWeight:700, fontSize:14, display:'inline-flex', alignItems:'center', gap:8, boxShadow:'0 4px 20px rgba(0,0,0,0.2)' }}>
                Get Started Free <ArrowRight size={15}/>
              </Link>
              <Link to="/login" style={{ padding:'12px 28px', background:'rgba(255,255,255,0.2)', color:'#fff', borderRadius:28, fontWeight:600, fontSize:14, border:'1.5px solid rgba(255,255,255,0.5)' }}>
                Login
              </Link>
            </div>
          </section>
        )}

        {/* SEO content */}
        <section style={{ marginTop:40, padding:'32px 0', borderTop:'1px solid var(--border)' }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:10 }}>Learn Stock Market Trading — Free Virtual Trading Platform India</h2>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8, marginBottom:16 }}>
            Stockify is India's free virtual stock trading platform where you can practice buying and selling NSE and BSE listed stocks using live real-time prices — without risking any real money. Start with ₹10,00,000 virtual capital and experience real stock market mechanics including MARKET orders, LIMIT orders, pending order tracking, and live portfolio P&amp;L.
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14, marginBottom:20 }}>
            {[
              { title:'Live NSE & BSE Prices', desc:'Real-time data for RELIANCE, TCS, HDFC Bank, INFY, SBIN and 5000+ stocks via Yahoo Finance.' },
              { title:'MARKET & LIMIT Orders', desc:'Place orders exactly like a real broker. Pending orders execute automatically via scheduler.' },
              { title:'Portfolio Analytics', desc:'Track holdings, average buy price, live P&L, 1D returns, and total portfolio value.' },
              { title:'Fundamental Analysis', desc:'Score stocks using ROE, ROCE, PE ratio, Debt-to-Equity and 10 financial metrics.' },
            ].map(f => (
              <div key={f.title} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'14px 16px' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:5 }}>{f.title}</p>
                <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
