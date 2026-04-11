import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, X, RefreshCw, TrendingUp, TrendingDown, ChevronRight,
  Zap, Clock, AlertCircle, CheckCircle, AlertTriangle, ShoppingCart,
  TrendingDown as SellIcon, Package, ArrowDownCircle
} from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { buyStock, sellStock, getUserProfile, getPortfolio, getStockData, saveLocalOrder, getMarketStatus } from '../lib/api';

// calcOrderOutcome — local UI prediction only; backend status is always source of truth
function calcOrderOutcome(orderType, livePrice, limitPrice) {
  if (orderType === 'MARKET') return { isPending: false, executedAt: livePrice };
  if (orderType === 'LIMIT') {
    if (livePrice > limitPrice) return { isPending: true, executedAt: null };
    return { isPending: false, executedAt: Math.min(livePrice, limitPrice) };
  }
  return { isPending: false, executedAt: livePrice };
}

const FMT = v => v==null?'—':new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
const INR = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v??0);

const STOCKS = [
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
  { s:'ADANIENT.NS',  n:'Adani Enterprises',        sec:'Conglom',  fb:2200  },
  { s:'IRCTC.NS',     n:'IRCTC',                    sec:'Services', fb:750   },
  { s:'TITAN.NS',     n:'Titan Company',            sec:'Consumer', fb:3230  },
  { s:'HCLTECH.NS',   n:'HCL Technologies',         sec:'IT',       fb:1470  },
];

const SEC_BG  = { IT:'#EEF0FF',Banking:'#E6F4FF',Finance:'#E6FFF9',Energy:'#FFF3E8',Auto:'#FFF0F8',Telecom:'#F3EEFF',Pharma:'#EDFFF5',Infra:'#E6FFFD',Conglom:'#FFF5F5',Consumer:'#FFFBEB',Services:'#F5F5F5' };
const SEC_CLR = { IT:'#5367ff',Banking:'#0891b2',Finance:'#00b386',Energy:'#ea580c',Auto:'#db2777',Telecom:'#7c3aed',Pharma:'#16a34a',Infra:'#0f766e',Conglom:'#dc2626',Consumer:'#d97706',Services:'#64748b' };

// ── Order result sheet ─────────────────────────────────────────
function ResultSheet({ r, onClose, onOrders }) {
  if (r.error) {
    // Map backend error messages to user-friendly text
    let title = 'Order Failed';
    let icon = <AlertCircle size={26} color="var(--red)"/>;
    let iconBg = 'var(--red-lt)';
    let msg = r.error;
    let hint = null;

    if (r.error.toLowerCase().includes('no stocks found')) {
      title = 'No Shares to Sell';
      icon = <Package size={26} color="var(--red)"/>;
      msg = `You don't hold any shares of ${r.symbol?.replace('.NS','')} in your portfolio.`;
      hint = 'You can only sell stocks that you own. Buy this stock first.';
    } else if (r.error.toLowerCase().includes('less quantity')) {
      title = 'Not Enough Shares';
      icon = <AlertTriangle size={26} color="var(--yellow)"/>;
      iconBg = 'var(--yellow-lt)';
      msg = `You don't have enough shares to sell.`;
      hint = `Requested: ${r.quantity} share${r.quantity!==1?'s':''}. Check your portfolio for the quantity you hold.`;
    } else if (r.error.toLowerCase().includes('insufficient balance')) {
      title = 'Insufficient Balance';
      msg = `You don't have enough wallet balance to place this buy order.`;
      hint = 'Try reducing the quantity or wait for some orders to complete.';
    }

    return (
      <div style={{ padding:'32px 20px 36px', textAlign:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 16px', background:iconBg, display:'flex', alignItems:'center', justifyContent:'center' }}>
          {icon}
        </div>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:8 }}>{title}</h3>
        <p style={{ fontSize:13, color:'var(--text2)', marginBottom: hint ? 8 : 24, lineHeight:1.6 }}>{msg}</p>
        {hint && <p style={{ fontSize:12, color:'var(--muted)', marginBottom:24, lineHeight:1.6, background:'var(--bg)', padding:'10px 14px', borderRadius:'var(--r)' }}>{hint}</p>}
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>onClose(true)} className="btn btn-outline" style={{ flex:1 }}>Try Again</button>
          <button onClick={onClose} className="btn" style={{ flex:1, background:'var(--red)', color:'#fff' }}>Close</button>
        </div>
      </div>
    );
  }

  const isPending = r.status === 'PENDING';
  const isSell = r.type === 'SELL';

  return (
    <div style={{ padding:'8px 20px 32px' }}>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', margin:'0 auto 16px',
          background: isPending ? 'var(--yellow-lt)' : isSell ? 'var(--red-lt)' : 'var(--green-lt)',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {isPending
            ? <Clock size={28} color="var(--yellow)"/>
            : isSell
              ? <ArrowDownCircle size={28} color="var(--red)"/>
              : <CheckCircle size={28} color="var(--green)"/>
          }
        </div>
        <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:6 }}>
          {isPending ? 'Order Placed!' : isSell ? 'Sold Successfully!' : 'Order Executed!'}
        </h3>
        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
          {isPending
            ? `Your ${isSell ? 'sell' : 'limit'} order for ${r.symbol?.replace('.NS','')} is active`
            : isSell
              ? `${r.quantity} share${r.quantity!==1?'s':''} of ${r.symbol?.replace('.NS','')} sold · ₹${FMT(r.price * r.quantity)} credited`
              : `${r.quantity} share${r.quantity!==1?'s':''} of ${r.symbol?.replace('.NS','')} added to portfolio`
          }
        </p>
      </div>

      {/* Order summary card */}
      <div style={{ background:'var(--bg)', borderRadius:'var(--r-md)', overflow:'hidden', border:'1px solid var(--border)', marginBottom:16 }}>
        {[
          ['Stock',    r.symbol?.replace('.NS','')],
          ['Action',   isSell ? '🔴 SELL' : '🟢 BUY'],
          ['Order',    r.orderType],
          ['Quantity', `${r.quantity} share${r.quantity!==1?'s':''}`],
          ['Price',    `₹${FMT(r.price)}`],
          ['Total',    INR((r.price||0) * (r.quantity||0))],
          ['Status',   isPending ? '⏳ Pending' : '✅ Executed'],
        ].map(([k,v], i, arr) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 16px', borderBottom:i<arr.length-1?'1px solid var(--border)':'none' }}>
            <span style={{ fontSize:12, color:'var(--muted)' }}>{k}</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)' }}>{v}</span>
          </div>
        ))}
      </div>

      {isSell && !isPending && (
        <div style={{ background:'var(--red-lt)', border:'1px solid rgba(235,87,87,0.2)', borderRadius:'var(--r)', padding:'10px 14px', marginBottom:16, fontSize:12, color:'var(--red)', lineHeight:1.5 }}>
          💰 ₹{INR((r.price||0)*(r.quantity||0))} has been credited to your wallet.
        </div>
      )}

      {isPending && (
        <div style={{ background:'var(--yellow-lt)', border:'1px solid rgba(244,161,0,0.2)', borderRadius:'var(--r)', padding:'10px 14px', marginBottom:16, fontSize:12, color:'#92400e', lineHeight:1.5 }}>
          💡 {isSell ? 'Shares will be deducted when the sell order executes.' : 'Funds will be deducted when the limit price is reached.'}
        </div>
      )}

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onClose} className="btn btn-outline" style={{ flex:1 }}>Continue</button>
        <button onClick={onOrders} className="btn btn-green" style={{ flex:1 }}>View Orders</button>
      </div>
    </div>
  );
}

export default function Trade() {
  const { username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [prices,  setPrices]  = useState({});
  const [wallet,  setWallet]  = useState(null);
  const [held,    setHeld]    = useState([]);
  const [q,       setQ]       = useState('');
  const [sel,     setSel]     = useState(null);
  const [sPrice,  setSPrice]  = useState(null);
  const [sFetch,  setSFetch]  = useState(false);
  // BUY or SELL tab
  const [tradeType, setTradeType] = useState('BUY');
  const [otype,   setOtype]   = useState('MARKET');
  const [qty,     setQty]     = useState('');
  const [lim,     setLim]     = useState('');
  const [placing, setPlacing] = useState(false);
  const [conf,    setConf]    = useState(null);

  const loadUser = useCallback(() => {
    if (!username) return;
    getUserProfile(username).then(p => setWallet(p?.wallet||null)).catch(()=>{});
    getPortfolio(username).then(r => setHeld(r.holdings)).catch(()=>{});
  }, [username]);

  useEffect(() => {
    loadUser();
    // Handle ?sell=SYMBOL.NS from Portfolio page
    const params = new URLSearchParams(location.search);
    const sellSym = params.get('sell');
    if (sellSym) {
      const stock = STOCKS.find(s => s.s === sellSym || s.s === sellSym + '.NS');
      if (stock) openSheet(stock, 'SELL');
    }
    Promise.allSettled(STOCKS.slice(0,12).map(async s => {
      try {
        const d = await getStockData(s.s,'1d','1m');
        if (d?.meta?.price) setPrices(p => ({...p,[s.s]:{price:d.meta.price,changePercent:d.meta.changePercent??0}}));
      } catch {}
    }));
  }, [loadUser]);

  useEffect(() => {
    if (!sel) { setSPrice(null); return; }
    setSPrice(prices[sel.s]?.price ?? sel.fb);
    setSFetch(true);
    getStockData(sel.s,'1d','1m')
      .then(d => {
        if (d?.meta?.price) {
          setSPrice(d.meta.price);
          setPrices(p => ({...p,[sel.s]:{price:d.meta.price,changePercent:d.meta.changePercent??0}}));
        }
      })
      .catch(()=>{})
      .finally(() => setSFetch(false));
  }, [sel?.s]);

  const livePrice = sPrice ?? prices[sel?.s]?.price ?? sel?.fb ?? 0;
  const limPrice  = parseFloat(lim) || 0;
  const quantity  = parseInt(qty) || 0;
  const walBal    = wallet?.amount ?? 0;
  const heldEntry = held.find(h => h.symbol === sel?.s);
  const heldQty   = heldEntry?.qty ?? 0;

  const outcome = sel && livePrice > 0 && (otype==='MARKET' || limPrice>0)
    ? calcOrderOutcome(otype, livePrice, limPrice)
    : null;
  const isPending = outcome?.isPending ?? false;
  const execAt    = outcome?.executedAt ?? null;
  const total     = quantity > 0 && execAt != null ? quantity * execAt : 0;

  // BUY: check wallet balance; SELL: check held quantity
  const notEnoughBuy  = tradeType==='BUY' && !isPending && total>0 && total>walBal;
  const notEnoughSell = tradeType==='SELL' && quantity>0 && quantity>heldQty;
  const hasBlocked    = notEnoughBuy || notEnoughSell;

  const openSheet = (stock, defaultType = 'BUY') => {
    setSel(stock);
    setTradeType(defaultType);
    setOtype('MARKET');
    setQty('');
    setLim('');
    setConf(null);
  };

  const close = (keepOpen = false) => {
    if (keepOpen) { setConf(null); return; }
    setSel(null); setConf(null); setQty(''); setLim(''); setOtype('MARKET');
  };

  const place = async () => {
    setPlacing(true);
    const snapLive = sPrice ?? prices[sel?.s]?.price ?? sel.fb ?? 0;
    const snapLim  = parseFloat(lim) || 0;
    const snapQty  = parseInt(qty) || 0;
    try {
      let result;
      if (tradeType === 'SELL') {
        result = await sellStock(username, {
          symbol: sel.s,
          quantity: snapQty,
          orderType: otype,
          price: otype==='LIMIT' ? snapLim : snapLive,
        });
      } else {
        result = await buyStock(username, {
          symbol: sel.s,
          quantity: snapQty,
          orderType: otype,
          price: otype==='LIMIT' ? snapLim : snapLive,
        });
      }

      const backendStatus = result?.status || 'PENDING';
      const record = {
        id:        Date.now(),
        symbol:    result?.symbol || sel.s,
        stockName: sel.n,
        quantity:  result?.quantity || snapQty,
        orderType: result?.orderType || otype,
        type:      result?.type || tradeType,
        price:     result?.price || snapLive,
        status:    backendStatus,
        createdAt: new Date().toISOString(),
      };
      saveLocalOrder(username, record);
      setConf(record);
      loadUser();
    } catch (e) {
      setConf({
        error:    e.message || 'Order failed. Please try again.',
        symbol:   sel.s,
        quantity: parseInt(qty) || 0,
      });
    } finally {
      setPlacing(false);
    }
  };

  const filtered = STOCKS.filter(s =>
    s.s.toLowerCase().includes(q.toLowerCase()) ||
    s.n.toLowerCase().includes(q.toLowerCase()) ||
    s.sec.toLowerCase().includes(q.toLowerCase())
  );

  const isSell = tradeType === 'SELL';
  const btnColor = isSell ? 'var(--red)' : 'var(--green)';
  const btnDisabled = placing || hasBlocked || quantity <= 0 || (otype==='LIMIT' && limPrice <= 0);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page">

        {/* Page header */}
        <div className="fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:3 }}>Stocks</h1>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              {(() => { const ms = getMarketStatus(); return (
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:ms.color }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:ms.color, display:'inline-block', animation:ms.open?'pulse 2s ease infinite':'none' }}/>
                  {ms.label}
                </span>
              );})()}
              <span style={{ fontSize:12, color:'var(--muted)' }}>NSE · Live prices</span>
            </div>
          </div>
          {wallet && (
            <div style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'10px 18px', textAlign:'right' }}>
              <p style={{ fontSize:11, color:'var(--muted)', marginBottom:3, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.3px' }}>Available Balance</p>
              <p style={{ fontSize:18, fontWeight:700, fontFamily:'var(--mono)', color:'var(--green)', letterSpacing:'-0.5px' }}>{INR(walBal)}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="fade-up stagger-1" style={{ position:'relative', marginBottom:16 }}>
          <Search size={15} color="var(--muted)" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search stocks by name, symbol or sector…" className="input" style={{ paddingLeft:42, paddingRight:q?40:14, background:'#fff', boxShadow:'var(--shadow-xs)', fontSize:14 }}/>
          {q && <button onClick={()=>setQ('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', padding:4 }}><X size={14}/></button>}
        </div>

        {/* Stock list */}
        <div className="fade-up stagger-2">
          {filtered.map(stock => {
            const d       = prices[stock.s];
            const up      = (d?.changePercent??0) >= 0;
            const holding = held.find(h => h.symbol === stock.s);
            const heldQty = holding?.qty ?? 0;
            const c       = SEC_CLR[stock.sec] || '#64748b';
            const bg      = SEC_BG[stock.sec]  || '#f5f5f5';
            return (
              <div key={stock.s}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-md)', marginBottom:8, cursor:'pointer', transition:'all 0.12s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,208,156,0.1)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; }}>

                {/* Ticker icon */}
                <div onClick={() => openSheet(stock, 'BUY')} style={{ width:42, height:42, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:c }}>{stock.s.replace('.NS','').slice(0,4)}</span>
                </div>

                {/* Info */}
                <div onClick={() => openSheet(stock, 'BUY')} style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2, flexWrap:'wrap' }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{stock.s.replace('.NS','')}</span>
                    <span style={{ fontSize:11, color:c, background:bg, padding:'1px 7px', borderRadius:4, fontWeight:500 }}>{stock.sec}</span>
                    {heldQty > 0 && <span style={{ fontSize:11, background:'var(--green-lt)', color:'var(--green-d)', padding:'1px 7px', borderRadius:4, fontWeight:600 }}>{heldQty} held</span>}
                  </div>
                  <p style={{ fontSize:12, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:200 }}>{stock.n}</p>
                </div>

                {/* Price */}
                <div onClick={() => openSheet(stock, 'BUY')} style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontSize:15, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)', marginBottom:3 }}>
                    {d?.price ? `₹${FMT(d.price)}` : <span style={{ color:'var(--muted)' }}>₹{FMT(stock.fb)}</span>}
                  </p>
                  {d?.changePercent != null
                    ? <span style={{ fontSize:12, fontWeight:600, color:up?'var(--green-d)':'var(--red)', padding:'1px 6px', background:up?'var(--green-lt)':'var(--red-lt)', borderRadius:4 }}>
                        {up?'▲':'▼'} {(d.changePercent??0).toFixed(2)}%
                      </span>
                    : <span style={{ fontSize:11, color:'var(--muted)' }}>—</span>
                  }
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', flexDirection:'column', gap:5, flexShrink:0 }}>
                  <button onClick={() => openSheet(stock, 'BUY')}
                    style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'var(--green-lt)', color:'var(--green-d)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    BUY
                  </button>
                  {heldQty > 0 && (
                    <button onClick={() => openSheet(stock, 'SELL')}
                      style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'var(--red-lt)', color:'var(--red)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      SELL
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Trade Bottom Sheet ── */}
      {sel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center', backdropFilter:'blur(4px)' }}
          onClick={e => e.target===e.currentTarget && !placing && close()}>
          <div className="slide-up" style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:540, maxHeight:'94vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* Handle */}
            <div style={{ textAlign:'center', padding:'12px 0 4px', flexShrink:0 }}>
              <div style={{ width:40, height:4, background:'var(--border2)', borderRadius:2, display:'inline-block' }}/>
            </div>

            {/* Result state */}
            {conf ? (
              <ResultSheet r={conf} onClose={close} onOrders={() => { close(); navigate('/orders'); }}/>
            ) : (
              <div style={{ overflowY:'auto', flex:1, padding:'4px 20px 32px' }}>

                {/* Stock header */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ width:44, height:44, borderRadius:10, background:SEC_BG[sel.sec]||'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:SEC_CLR[sel.sec]||'#64748b' }}>{sel.s.replace('.NS','').slice(0,4)}</span>
                    </div>
                    <div>
                      <p style={{ fontSize:17, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>{sel.s.replace('.NS','')}</p>
                      <p style={{ fontSize:12, color:'var(--muted)' }}>{sel.n}</p>
                    </div>
                  </div>
                  <button onClick={close} style={{ padding:8, borderRadius:8, color:'var(--muted)', background:'var(--bg)', border:'1px solid var(--border)' }}>
                    <X size={15}/>
                  </button>
                </div>

                {/* ── BUY / SELL tab ── */}
                <div style={{ display:'flex', background:'var(--bg)', borderRadius:'var(--r)', padding:4, marginBottom:16, border:'1px solid var(--border)' }}>
                  {[{t:'BUY',label:'Buy'},{t:'SELL',label:'Sell'}].map(({t,label}) => (
                    <button key={t} onClick={() => { setTradeType(t); setOtype('MARKET'); setQty(''); setLim(''); }}
                      style={{
                        flex:1, padding:'9px 0', borderRadius:'var(--r-sm)', border:'none', fontSize:14, fontWeight:tradeType===t?700:400,
                        cursor:'pointer', transition:'all 0.15s',
                        background: tradeType===t ? (t==='BUY' ? 'var(--green)' : 'var(--red)') : 'transparent',
                        color: tradeType===t ? '#fff' : 'var(--muted)',
                        boxShadow: tradeType===t ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Holdings info for SELL */}
                {isSell && (
                  <div style={{ background: heldQty > 0 ? 'var(--green-lt)' : 'var(--red-lt)', border:`1px solid ${heldQty>0?'rgba(0,208,156,0.2)':'rgba(235,87,87,0.2)'}`, borderRadius:'var(--r)', padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
                    {heldQty > 0
                      ? <>
                          <CheckCircle size={14} color="var(--green-d)"/>
                          <span style={{ fontSize:12, color:'#065f46' }}>
                            You hold <strong>{heldQty} shares</strong> of {sel.s.replace('.NS','')} · avg ₹{FMT(heldEntry?.avgPrice)}
                          </span>
                        </>
                      : <>
                          <AlertCircle size={14} color="var(--red)"/>
                          <span style={{ fontSize:12, color:'var(--red)' }}>
                            You don't hold any shares of {sel.s.replace('.NS','')}. Buy first to sell.
                          </span>
                        </>
                    }
                  </div>
                )}

                {/* Live price */}
                <div style={{ background:'var(--bg)', borderRadius:'var(--r-md)', padding:'16px', marginBottom:16, border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
                    <div>
                      <p style={{ fontSize:11, color:'var(--muted)', fontWeight:500, letterSpacing:'0.3px', textTransform:'uppercase', marginBottom:6 }}>
                        Current Price {sFetch && <span style={{ color:'var(--green)' }}>· updating</span>}
                      </p>
                      <p style={{ fontSize:30, fontWeight:800, fontFamily:'var(--mono)', color:'var(--text)', letterSpacing:'-1px', lineHeight:1 }}>₹{FMT(livePrice)}</p>
                      {prices[sel.s]?.changePercent != null && (
                        <p style={{ fontSize:12, fontWeight:600, color:(prices[sel.s].changePercent??0)>=0?'var(--green-d)':'var(--red)', marginTop:6 }}>
                          {(prices[sel.s].changePercent??0)>=0?'▲':'▼'} {(prices[sel.s].changePercent??0).toFixed(2)}% today
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      {isSell
                        ? <><p style={{ fontSize:11, color:'var(--muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:6 }}>You Hold</p>
                            <p style={{ fontSize:18, fontWeight:700, fontFamily:'var(--mono)', color: heldQty>0?'var(--green-d)':'var(--red)', letterSpacing:'-0.5px' }}>{heldQty} shares</p></>
                        : wallet && <><p style={{ fontSize:11, color:'var(--muted)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.3px', marginBottom:6 }}>Available</p>
                            <p style={{ fontSize:18, fontWeight:700, fontFamily:'var(--mono)', color:'var(--green)', letterSpacing:'-0.5px' }}>{INR(walBal)}</p></>
                      }
                    </div>
                  </div>
                </div>

                {/* Order type tabs — MARKET / LIMIT */}
                <div style={{ display:'flex', background:'var(--bg)', borderRadius:'var(--r)', padding:4, marginBottom:14, border:'1px solid var(--border)' }}>
                  {[{t:'MARKET',label:'Market Order'},{t:'LIMIT',label:'Limit Order'}].map(({t,label}) => (
                    <button key={t} onClick={() => { setOtype(t); setLim(''); }}
                      style={{ flex:1, padding:'9px 0', borderRadius:'var(--r-sm)', border:'none', fontSize:13, fontWeight:otype===t?600:400, cursor:'pointer', transition:'all 0.15s', background:otype===t?'#fff':'transparent', color:otype===t?'var(--text)':'var(--muted)', boxShadow:otype===t?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>
                      {label}
                    </button>
                  ))}
                </div>

                {/* Market order info */}
                {otype === 'MARKET' && (
                  <div style={{ background:isSell?'var(--red-lt)':'var(--green-lt)', border:`1px solid ${isSell?'rgba(235,87,87,0.2)':'rgba(0,208,156,0.2)'}`, borderRadius:'var(--r)', padding:'10px 14px', marginBottom:14, fontSize:12, color:isSell?'var(--red)':'#065f46', lineHeight:1.5, display:'flex', gap:8, alignItems:'flex-start' }}>
                    <Zap size={13} color={isSell?'var(--red)':'var(--green)'} style={{ flexShrink:0, marginTop:1 }}/>
                    <span>
                      {isSell
                        ? <>Order will sell at current market price of <strong>₹{FMT(livePrice)}</strong>.</>
                        : <>Order will execute at current market price of <strong>₹{FMT(livePrice)}</strong>.</>
                      }
                    </span>
                  </div>
                )}

                {/* Limit price input */}
                {otype === 'LIMIT' && (
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:7, fontWeight:600 }}>
                      {isSell ? 'Minimum Sell Price (₹)' : 'Limit Price (₹)'}
                    </label>
                    <input type="number" value={lim} onChange={e=>setLim(e.target.value)}
                      placeholder={`e.g. ${FMT(Math.round((livePrice||100)*0.97))}`}
                      className="input" style={{ fontSize:18, fontFamily:'var(--mono)', fontWeight:700 }}/>
                    {lim && outcome && (
                      <div style={{ marginTop:8, padding:'9px 12px', borderRadius:'var(--r)', border:`1px solid ${outcome.isPending?'rgba(244,161,0,0.25)':'rgba(0,208,156,0.25)'}`, background:outcome.isPending?'var(--yellow-lt)':'var(--green-lt)', fontSize:12 }}>
                        {outcome.isPending
                          ? <span style={{ color:'#92400e' }}>⏳ <strong>PENDING</strong> — Market ₹{FMT(livePrice)} &gt; limit ₹{FMT(limPrice)}. Will wait for price to drop.</span>
                          : <span style={{ color:'#065f46' }}>✅ Will execute immediately at ₹{FMT(outcome.executedAt)}</span>
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:12, color:'var(--text2)', display:'block', marginBottom:7, fontWeight:600 }}>Quantity (Shares)</label>
                  <input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="0" className="input" style={{ fontSize:22, fontFamily:'var(--mono)', fontWeight:700 }}/>
                  {isSell && heldQty > 0 && (
                    <button onClick={() => setQty(String(heldQty))} style={{ marginTop:6, fontSize:11, color:'var(--green-d)', background:'var(--green-lt)', border:'none', padding:'3px 10px', borderRadius:4, cursor:'pointer', fontWeight:600 }}>
                      Sell all ({heldQty})
                    </button>
                  )}
                </div>

                {/* Order summary */}
                {quantity > 0 && outcome && (
                  <div style={{ background:'var(--bg)', borderRadius:'var(--r)', padding:'12px 14px', marginBottom:16, border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                      <span style={{ fontSize:13, color:'var(--text2)' }}>
                        {quantity} × ₹{FMT(isPending ? limPrice : execAt)} =
                      </span>
                      <span style={{ fontSize:17, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>
                        {INR(quantity * (isPending ? limPrice : execAt || 0))}
                      </span>
                    </div>

                    {/* BUY: insufficient wallet */}
                    {notEnoughBuy && (
                      <p style={{ fontSize:12, color:'var(--red)', display:'flex', alignItems:'center', gap:5 }}>
                        <AlertTriangle size={12}/> Insufficient balance. Need ₹{FMT((total - walBal).toFixed(2))} more.
                      </p>
                    )}

                    {/* SELL: more than held */}
                    {notEnoughSell && (
                      <p style={{ fontSize:12, color:'var(--red)', display:'flex', alignItems:'center', gap:5 }}>
                        <AlertTriangle size={12}/> You only hold {heldQty} share{heldQty!==1?'s':''}. Can't sell {quantity}.
                      </p>
                    )}

                    {/* BUY: remaining balance */}
                    {!notEnoughBuy && !isPending && !isSell && wallet && (
                      <p style={{ fontSize:12, color:'var(--muted)' }}>Remaining balance: {INR(walBal - (quantity*(execAt||0)))}</p>
                    )}

                    {/* SELL: proceeds */}
                    {isSell && !notEnoughSell && !isPending && (
                      <p style={{ fontSize:12, color:'var(--green-d)', display:'flex', alignItems:'center', gap:5 }}>
                        <CheckCircle size={12}/> ₹{INR(quantity * (execAt||0))} will be credited to wallet
                      </p>
                    )}

                    {isPending && (
                      <p style={{ fontSize:12, color:'#f4a100', display:'flex', alignItems:'center', gap:5 }}>
                        <Clock size={12}/> {isSell ? 'Shares deducted when order executes' : 'Funds reserved when order executes'}
                      </p>
                    )}
                  </div>
                )}

                {/* Action button */}
                <button onClick={place}
                  disabled={btnDisabled}
                  style={{
                    width:'100%', padding:'14px 0', border:'none', borderRadius:'var(--r-md)',
                    fontSize:15, fontWeight:700, transition:'all 0.15s',
                    cursor: btnDisabled ? 'not-allowed' : 'pointer',
                    opacity: placing ? 0.6 : 1,
                    background: btnDisabled ? 'var(--muted2)' : btnColor,
                    color: '#fff',
                    boxShadow: btnDisabled ? 'none' : `0 4px 14px ${isSell ? 'rgba(235,87,87,0.3)' : 'rgba(0,179,134,0.3)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  }}>
                  {placing
                    ? <><div style={{ width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.7s linear infinite' }}/> Placing order…</>
                    : isPending
                      ? <><Clock size={15}/> Place {isSell?'Sell':'Limit'} Order · ₹{FMT(limPrice)}</>
                      : quantity > 0
                        ? isSell
                          ? <><ArrowDownCircle size={15}/> Sell {quantity} share{quantity!==1?'s':''} · {INR(total)}</>
                          : <><ShoppingCart size={15}/> Buy {quantity} share{quantity!==1?'s':''} · {INR(total)}</>
                        : `Enter quantity to continue`
                  }
                </button>
                <p style={{ fontSize:11, color:'var(--muted)', textAlign:'center', marginTop:8 }}>Virtual trading only · No real money involved</p>
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .btn-outline{background:#fff;border:1.5px solid var(--border2);color:var(--text2);}
      `}</style>
    </div>
  );
}
