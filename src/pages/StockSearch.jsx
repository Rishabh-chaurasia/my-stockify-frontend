import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, TrendingUp, TrendingDown, X, Zap, Clock, AlertCircle, Lock, ArrowLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Header from '../components/Header';
import { getStockData, fetchChartData, buyStock, getUserProfile, saveLocalOrder } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const POPULAR = ['RELIANCE','TCS','INFY','HDFCBANK','SBIN','WIPRO','TATAMOTORS','ICICIBANK','IRFC','RVNL','IRCTC','LTIM','SUNPHARMA','MARUTI','BHARTIARTL'];
const RANGES  = [
  {label:'1D',range:'1d'},{label:'5D',range:'5d'},{label:'1M',range:'1mo'},
  {label:'3M',range:'3mo'},{label:'6M',range:'6mo'},{label:'1Y',range:'1y'},{label:'5Y',range:'5y'},
];

const FMT = v => v==null?'—':new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
const INR = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v??0);

// calcOrderOutcome — local UI prediction only, backend status is source of truth
function calcOrderOutcome(orderType, livePrice, limitPrice) {
  if (orderType === 'MARKET') return { isPending: false, executedAt: livePrice };
  if (orderType === 'LIMIT') {
    if (livePrice > limitPrice) return { isPending: true, executedAt: null };
    return { isPending: false, executedAt: Math.min(livePrice, limitPrice) };
  }
  return { isPending: false, executedAt: livePrice };
}

function ChartTip({ active, payload, label }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:'9px 13px', boxShadow:'var(--shadow)' }}>
      <p style={{ fontSize:11, color:'var(--muted)', marginBottom:3 }}>{label}</p>
      <p style={{ fontSize:15, fontWeight:700, color:'var(--green)', fontFamily:'var(--mono)' }}>₹{FMT(payload[0].value)}</p>
    </div>
  );
}

// Persist state in sessionStorage so page refresh keeps the search
const SS_QUERY = 'ss_query';
const SS_STOCK = 'ss_stock';
const SS_RANGE = 'ss_range';

export default function StockSearch() {
  const { username, isLoggedIn } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  // Restore from sessionStorage on mount
  const [query,     setQuery]     = useState(() => sessionStorage.getItem(SS_QUERY) || '');
  const [stock,     setStock]     = useState(() => { try { return JSON.parse(sessionStorage.getItem(SS_STOCK)||'null'); } catch { return null; } });
  const [range,     setRange]     = useState(() => sessionStorage.getItem(SS_RANGE) || '1y');
  const [chart,     setChart]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [chartLoad, setChartLoad] = useState(false);
  const [error,     setError]     = useState('');
  const [wallet,    setWallet]    = useState(null);
  const [otype,     setOtype]     = useState('MARKET');
  const [lim,       setLim]       = useState('');
  const [qty,       setQty]       = useState('');
  const [buying,    setBuying]    = useState(false);
  const [msg,       setMsg]       = useState(null);

  // Load chart for already-stored stock on mount
  useEffect(() => {
    // Check URL param first
    const params = new URLSearchParams(location.search);
    const urlQ = params.get('q');
    if (urlQ) {
      const sym = urlQ.trim().toUpperCase();
      setQuery(sym);
      doSearch(sym);
    } else if (stock) {
      // Restore chart from session
      loadChart(stock.symbol, range);
    }
    if (isLoggedIn && username) {
      getUserProfile(username).then(p => setWallet(p?.wallet||null)).catch(()=>{});
    }
  }, []); // eslint-disable-line

  const doSearch = async sym => {
    const raw = (sym||query).trim().toUpperCase().replace(/\.NS$/,'');
    if (!raw) return;
    setLoading(true); setError(''); setStock(null); setChart([]);
    sessionStorage.setItem(SS_QUERY, raw);
    try {
      const d = await getStockData(raw+'.NS');
      if (!d?.meta) throw new Error('No data');
      setStock(d.meta);
      sessionStorage.setItem(SS_STOCK, JSON.stringify(d.meta));
      loadChart(d.meta.symbol, range);
      if (isLoggedIn && username) getUserProfile(username).then(p=>setWallet(p?.wallet||null)).catch(()=>{});
    } catch {
      setError(`"${raw}" not found. Try RELIANCE, TCS, INFY…`);
      sessionStorage.removeItem(SS_STOCK);
    }
    setLoading(false);
  };

  const loadChart = async (symbol, r) => {
    setChartLoad(true);
    try {
      const data = await fetchChartData(symbol, r);
      setChart(data||[]);
    } catch(e) {
      console.warn('Chart failed:', e.message);
      setChart([]);
    }
    setChartLoad(false);
  };

  const changeRange = r => {
    setRange(r);
    sessionStorage.setItem(SS_RANGE, r);
    if (stock) loadChart(stock.symbol, r);
  };

  const handleBuy = async () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    const snapQty = parseInt(qty)||0;
    const snapLim = parseFloat(lim)||0;
    if (snapQty<=0) { setMsg({text:'Enter a valid quantity',ok:false}); return; }
    if (otype==='LIMIT'&&snapLim<=0) { setMsg({text:'Enter a valid limit price',ok:false}); return; }
    const mktPrice = stock?.price||0;
    setBuying(true); setMsg(null);
    try {
      const result = await buyStock(username, { symbol:stock.symbol, quantity:snapQty, orderType:otype, price:otype==='LIMIT'?snapLim:mktPrice });
      const backendStatus = result?.status || 'PENDING';
      saveLocalOrder(username, {
        symbol: stock.symbol, stockName: stock.name||stock.symbol, quantity: snapQty,
        orderType: otype, limitPrice: otype==='LIMIT'?snapLim:null,
        marketPriceAtOrder: mktPrice, executedPrice: backendStatus==='EXECUTED'?(result?.price||mktPrice):null,
        price: result?.price||mktPrice, status: backendStatus,
      });
      if (backendStatus==='EXECUTED') {
        setMsg({ text:`✅ Bought ${snapQty} share${snapQty!==1?'s':''} at ₹${FMT(result?.price||mktPrice)}`, ok:true });
      } else {
        setMsg({ text:`⏳ Order placed — executes when market opens / price drops to ₹${FMT(snapLim||mktPrice)}`, ok:true });
      }
      setQty(''); setLim('');
      if (username) getUserProfile(username).then(p=>setWallet(p?.wallet||null)).catch(()=>{});
    } catch(e) { setMsg({text:e.message||'Order failed',ok:false}); }
    finally { setBuying(false); }
  };

  const isUp      = (stock?.changePercent??0) >= 0;
  const lmPrice   = parseFloat(lim)||0;
  const quantity  = parseInt(qty)||0;
  const outcome   = stock&&(otype==='MARKET'||lmPrice>0) ? calcOrderOutcome(otype,stock.price||0,lmPrice) : null;
  const chartColor = isUp ? '#00b386' : '#eb5757';

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page" style={{ maxWidth:960 }}>

        {/* Search bar */}
        <div className="fade-up" style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', marginBottom:16 }}>Search Stocks</h1>
          <form onSubmit={e=>{e.preventDefault();doSearch();}} style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1, position:'relative' }}>
              <Search size={15} color="var(--muted)" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
              <input value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="Enter stock symbol — RELIANCE, TCS, INFY…"
                style={{ width:'100%', padding:'12px 40px 12px 42px', background:'#fff', border:'1.5px solid var(--border2)', borderRadius:'var(--r)', color:'var(--text)', fontSize:15, boxSizing:'border-box', boxShadow:'var(--shadow-sm)' }}/>
              {query&&<button type="button" onClick={()=>{setQuery('');setStock(null);setError('');sessionStorage.removeItem(SS_QUERY);sessionStorage.removeItem(SS_STOCK);}}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', padding:4, background:'none', border:'none', cursor:'pointer' }}><X size={14}/></button>}
            </div>
            <button type="submit" className="btn btn-green" style={{ padding:'12px 24px' }}>Search</button>
          </form>

          {/* Popular chips */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
            {POPULAR.map(s => (
              <button key={s} onClick={()=>{setQuery(s);doSearch(s);}}
                style={{ padding:'5px 12px', borderRadius:20, border:'1px solid var(--border)', background:'#fff', color:'var(--text2)', fontSize:12, fontWeight:500, cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--green)';e.currentTarget.style.color='var(--green-d)';e.currentTarget.style.background='var(--green-lt)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='var(--text2)';e.currentTarget.style.background='#fff';}}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)' }}>
            <div style={{ width:28,height:28,border:'3px solid var(--border)',borderTopColor:'var(--green)',borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 12px' }}/>
            <p style={{ fontSize:14 }}>Looking up {query.toUpperCase()}…</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ background:'var(--red-lt)', border:'1px solid rgba(235,87,87,0.2)', borderRadius:'var(--r)', padding:'14px 18px', color:'var(--red)', fontSize:14 }}>{error}</div>
        )}

        {/* Stock result — two-column layout */}
        {stock && !loading && (
          <div className="fade-in" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>

            {/* Left — chart & details */}
            <div>
              {/* Price header */}
              <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px 22px', marginBottom:12, boxShadow:'var(--shadow-sm)' }}>
                <p style={{ fontSize:11, color:'var(--muted)', fontWeight:600, letterSpacing:'0.3px', textTransform:'uppercase', marginBottom:4 }}>{stock.exchange} · {stock.symbol}</p>
                <h2 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{stock.name || stock.symbol.replace('.NS','')}</h2>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:16 }}>
                  <span style={{ fontSize:32, fontWeight:800, fontFamily:'var(--mono)', color:'var(--text)', letterSpacing:'-1px' }}>₹{FMT(stock.price)}</span>
                  <span className={isUp?'tag-green':'tag-red'} style={{ fontSize:13, padding:'4px 10px' }}>
                    {isUp?<TrendingUp size={12}/>:<TrendingDown size={12}/>}
                    {isUp?'+':''}{FMT(stock.change)} ({isUp?'+':''}{(stock.changePercent??0).toFixed(2)}%)
                  </span>
                </div>

                {/* Range selector */}
                <div style={{ display:'flex', gap:4, marginBottom:16 }}>
                  {RANGES.map(r => (
                    <button key={r.label} onClick={()=>changeRange(r.range)}
                      style={{ padding:'5px 12px', borderRadius:6, border:'none', fontSize:12, fontWeight:range===r.range?700:400, cursor:'pointer', transition:'all 0.15s',
                        background:range===r.range?'var(--green)':'transparent', color:range===r.range?'#fff':'var(--text2)' }}>
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Chart */}
                {chartLoad ? (
                  <div className="skeleton" style={{ height:200 }}/>
                ) : chart.length > 1 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chart} margin={{ top:4, right:4, bottom:0, left:0 }}>
                      <XAxis dataKey="date" tick={{fontSize:10,fill:'var(--muted)'}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                      <YAxis domain={['auto','auto']} tick={{fontSize:10,fill:'var(--muted)'}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${FMT(v)}`} width={70}/>
                      <Tooltip content={<ChartTip/>}/>
                      <Line type="monotone" dataKey="close" stroke={chartColor} strokeWidth={2} dot={false} activeDot={{r:4,fill:chartColor}}/>
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:13 }}>
                    {chartLoad ? 'Loading chart…' : 'Chart data unavailable for this range'}
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 22px', boxShadow:'var(--shadow-sm)' }}>
                <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.4px' }}>Stock Details</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
                  {[
                    ['Previous Close', `₹${FMT(stock.previousClose)}`],
                    ['Day High',       `₹${FMT(stock.dayHigh)}`],
                    ['Day Low',        `₹${FMT(stock.dayLow)}`],
                    ['52W High',       `₹${FMT(stock.week52High)}`],
                    ['52W Low',        `₹${FMT(stock.week52Low)}`],
                    ['Volume',          stock.volume ? new Intl.NumberFormat('en-IN').format(stock.volume) : '—'],
                  ].map(([k,v],i) => (
                    <div key={k} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', paddingRight:i%2===0?24:0, paddingLeft:i%2===1?24:0 }}>
                      <span style={{ fontSize:12, color:'var(--muted)' }}>{k}</span>
                      <span style={{ fontSize:13, fontWeight:600, fontFamily:'var(--mono)', color:'var(--text)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — buy panel */}
            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px', boxShadow:'var(--shadow-sm)', position:'sticky', top:80 }}>
              {!isLoggedIn ? (
                <div style={{ textAlign:'center', padding:'24px 0' }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--green-lt)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', border:'1.5px solid rgba(0,179,134,0.25)' }}>
                    <Lock size={22} color="var(--green-d)"/>
                  </div>
                  <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Login to Trade</h3>
                  <p style={{ fontSize:13, color:'var(--muted)', marginBottom:20, lineHeight:1.5 }}>Create a free account to buy and sell stocks</p>
                  <a href="/register" className="btn btn-green" style={{ width:'100%', justifyContent:'center', display:'flex', marginBottom:10 }}>Create Free Account</a>
                  <a href="/login" className="btn btn-outline" style={{ width:'100%', justifyContent:'center', display:'flex' }}>Log in</a>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)' }}>Buy {stock.symbol.replace('.NS','')}</h3>
                    {wallet && <span style={{ fontSize:12, color:'var(--muted)' }}>Balance: <strong style={{ color:'var(--green-d)', fontFamily:'var(--mono)' }}>{INR(wallet.amount)}</strong></span>}
                  </div>

                  {/* Order type toggle */}
                  <div style={{ display:'flex', background:'var(--bg)', borderRadius:'var(--r)', padding:3, marginBottom:14, gap:3 }}>
                    {[{t:'MARKET',label:'Market'},{t:'LIMIT',label:'Limit'}].map(({t,label})=>(
                      <button key={t} onClick={()=>{setOtype(t);setLim('');}}
                        style={{ flex:1, padding:'8px 0', borderRadius:'var(--r-sm)', border:'none', fontSize:13, fontWeight:otype===t?700:400, cursor:'pointer', transition:'all 0.15s',
                          background:otype===t?'#fff':'transparent', color:otype===t?'var(--text)':'var(--muted)',
                          boxShadow:otype===t?'var(--shadow-sm)':'none' }}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Limit price */}
                  {otype==='LIMIT' && (
                    <div style={{ marginBottom:12 }}>
                      <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.3px' }}>Limit Price (₹)</label>
                      <input type="number" value={lim} onChange={e=>setLim(e.target.value)}
                        placeholder={`e.g. ${FMT(Math.round((stock.price||0)*0.97))}`}
                        className="input" style={{ fontSize:18, fontFamily:'var(--mono)', fontWeight:700 }}/>
                      {lim&&outcome && (
                        <p style={{ fontSize:11, marginTop:6, color:outcome.isPending?'#f4a100':'var(--green-d)', fontWeight:600 }}>
                          {outcome.isPending ? `⏳ PENDING — market ₹${FMT(stock.price)} > limit ₹${FMT(lmPrice)}` : `✅ Executes at ₹${FMT(outcome.executedAt)}`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quantity */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:11, color:'var(--muted)', display:'block', marginBottom:6, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.3px' }}>Quantity</label>
                    <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0"
                      className="input" style={{ fontSize:18, fontFamily:'var(--mono)', fontWeight:700 }}/>
                  </div>

                  {/* Summary */}
                  {quantity>0&&outcome && (
                    <div style={{ background:'var(--bg)', borderRadius:'var(--r)', padding:'10px 14px', marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:12, color:'var(--muted)' }}>Estimated total</span>
                        <span style={{ fontSize:15, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>
                          {outcome.isPending ? INR(quantity*(lmPrice||0)) : INR(quantity*(outcome.executedAt||0))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {msg && (
                    <div style={{ background:msg.ok?'var(--green-lt)':'var(--red-lt)', border:`1px solid ${msg.ok?'rgba(0,179,134,0.25)':'rgba(235,87,87,0.25)'}`, borderRadius:'var(--r)', padding:'10px 13px', marginBottom:12, fontSize:12, color:msg.ok?'var(--green-d)':'var(--red)', lineHeight:1.5 }}>
                      {msg.text}
                    </div>
                  )}

                  <button onClick={handleBuy} disabled={buying||quantity<=0||(otype==='LIMIT'&&lmPrice<=0)}
                    style={{ width:'100%', padding:'14px 0', border:'none', borderRadius:'var(--r)', fontSize:15, fontWeight:700,
                      cursor:buying||quantity<=0?'not-allowed':'pointer', opacity:buying?0.7:1, transition:'all 0.15s',
                      background:buying||quantity<=0?'var(--muted2)':'var(--green)', color:'#fff',
                      boxShadow:buying||quantity<=0?'none':'0 4px 14px rgba(0,179,134,0.3)' }}>
                    {buying ? 'Placing…' : outcome?.isPending ? `Place Limit · ₹${FMT(lmPrice)}` : `Buy · ${INR((outcome?.executedAt||0)*quantity)}`}
                  </button>
                  <p style={{ fontSize:11, color:'var(--muted)', textAlign:'center', marginTop:8 }}>Virtual trading only</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Mobile responsive */}
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @media(max-width:700px){
            .ss-grid{grid-template-columns:1fr!important}
          }
        `}</style>
      </main>
    </div>
  );
}
