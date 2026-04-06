import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Clock, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, X, TrendingDown, TrendingUp, Info } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getLocalOrders, cancelLocalOrder, getStockData } from '../lib/api';

const FMT = v => v==null?'—':new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
const INR = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v??0);
const fmtDate = s => { try { return new Date(s).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}); } catch { return '—'; } };

const STATUS = {
  PENDING:   { label:'Pending',   bg:'#fff8e6', border:'rgba(244,161,0,0.3)',  text:'#92400e', dot:'#f4a100', Icon:Clock       },
  EXECUTED:  { label:'Executed',  bg:'#e8fdf7', border:'rgba(0,183,134,0.3)',  text:'#065f46', dot:'#00b386', Icon:CheckCircle },
  CANCELLED: { label:'Cancelled', bg:'#f3f4f6', border:'rgba(100,116,139,0.3)',text:'#475569', dot:'#94a3b8', Icon:XCircle     },
};

const TABS = ['ALL','PENDING','EXECUTED','CANCELLED'];

export default function Orders() {
  const { username } = useAuth();
  const [orders,   setOrders]   = useState([]);
  const [livePx,   setLivePx]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState('ALL');
  const [expanded, setExpanded] = useState(null);
  const [cancelId, setCancelId] = useState(null);

  const load = useCallback(() => {
    if (!username) return;
    const all = getLocalOrders(username);
    setOrders(all);
    return all;
  }, [username]);

  const refreshLive = useCallback(async (list) => {
    const pending = (list||[]).filter(o => o.status==='PENDING');
    const syms = [...new Set(pending.map(o => o.symbol))];
    if (!syms.length) return;
    setLoading(true);
    const r = {};
    await Promise.allSettled(syms.map(async s => {
      try { const d = await getStockData(s,'1d','1m'); if(d?.meta?.price) r[s]=d.meta.price; } catch {}
    }));
    setLivePx(p => ({...p,...r}));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!username) return;
    const all = getLocalOrders(username);
    setOrders(all);
    refreshLive(all);
    const iv = setInterval(() => {
      const fresh = getLocalOrders(username);
      setOrders(fresh);
      refreshLive(fresh);
    }, 30000);
    return () => clearInterval(iv);
  }, [username, refreshLive]);

  const doCancel = id => {
    // Cancel locally - no wallet refund since backend hasn't deducted yet
    // (PENDING orders haven't deducted wallet balance per backend logic)
    cancelLocalOrder(username, id);
    setCancelId(null);
    load();
  };

  const shown  = tab==='ALL' ? orders : orders.filter(o=>o.status===tab);
  const counts = TABS.reduce((a,t) => { a[t] = t==='ALL'?orders.length:orders.filter(o=>o.status===t).length; return a; }, {});

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page" style={{ maxWidth:760 }}>

        <div className="fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:3 }}>Orders</h1>
            <p style={{ fontSize:12, color:'var(--muted)' }}>{orders.length} total orders</p>
          </div>
          <button onClick={() => { const a = load(); refreshLive(a||[]); }} style={{ width:38, height:38, borderRadius:'var(--r)', border:'1.5px solid var(--border)', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <RefreshCw size={14} color="var(--text2)" style={{ animation:loading?'spin 0.8s linear infinite':'none' }}/>
          </button>
        </div>

        {/* Backend behaviour info */}
        <div className="fade-up" style={{ background:'#fffbeb', border:'1px solid rgba(244,161,0,0.25)', borderRadius:'var(--r)', padding:'11px 14px', marginBottom:20, display:'flex', gap:10, alignItems:'flex-start' }}>
          <Info size={14} color="#f4a100" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:12, color:'#92400e', lineHeight:1.6 }}>
            All orders are placed as <strong>PENDING</strong>. The backend executes them when the market opens and price conditions are met. Executed orders appear in your Portfolio. Pending orders haven't deducted your wallet balance yet.
          </p>
        </div>

        {/* Tabs */}
        <div className="fade-up stagger-1" style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:2 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:'7px 16px', borderRadius:20, border: tab===t?'none':'1px solid var(--border)', fontSize:13, fontWeight:tab===t?700:400, cursor:'pointer', flexShrink:0, transition:'all 0.15s', background:tab===t?'var(--green)':'#fff', color:tab===t?'#fff':'var(--text2)' }}>
              {t} {counts[t]>0 && <span style={{ marginLeft:4, fontSize:11, opacity:0.8 }}>({counts[t]})</span>}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {shown.length === 0 ? (
          <div className="fade-up stagger-2" style={{ textAlign:'center', padding:'60px 20px', background:'#fff', borderRadius:'var(--r-lg)', border:'1px solid var(--border)' }}>
            <ClipboardList size={44} color="var(--muted2)" style={{ margin:'0 auto 14px', display:'block' }}/>
            <p style={{ color:'var(--text)', fontSize:15, fontWeight:700, marginBottom:6 }}>{tab==='ALL'?'No orders yet':`No ${tab.toLowerCase()} orders`}</p>
            {tab==='ALL' && <p style={{ color:'var(--muted)', fontSize:13 }}>Place orders from the Trade page to see them here</p>}
          </div>
        ) : (
          <div className="fade-up stagger-2">
            {shown.map((o, idx) => {
              const isOpen = expanded === o.id;
              const sym    = (o.symbol||'').replace('.NS','');
              const st     = STATUS[o.status] || STATUS.CANCELLED;
              const StIc   = st.Icon;
              const live   = livePx[o.symbol];
              const pending = o.status==='PENDING';
              const limitDiff = pending && o.limitPrice && live ? (live - o.limitPrice) : null;

              return (
                <div key={o.id||idx} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-md)', marginBottom:8, overflow:'hidden', transition:'border-color 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='var(--border2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>

                  {/* Summary row */}
                  <button onClick={() => setExpanded(isOpen?null:o.id)}
                    style={{ width:'100%', display:'flex', alignItems:'center', padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', gap:12, textAlign:'left' }}>
                    {/* Type icon */}
                    <div style={{ width:38, height:38, borderRadius:9, background:o.orderType==='MARKET'?'#eef0ff':'#fff8e6', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <StIc size={16} color={o.orderType==='MARKET'?'#5367ff':'#f4a100'}/>
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{sym}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:st.bg, color:st.text, border:`1px solid ${st.border}` }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:st.dot, display:'inline-block', marginRight:4, verticalAlign:'middle' }}/>
                          {st.label}
                        </span>
                        <span style={{ fontSize:11, color:'var(--muted)', background:'var(--bg)', padding:'1px 7px', borderRadius:4, border:'1px solid var(--border)' }}>{o.orderType}</span>
                      </div>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>
                        {o.quantity} share{o.quantity!==1?'s':''} · {fmtDate(o.createdAt)}
                      </p>
                    </div>

                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {o.orderType==='LIMIT' && o.limitPrice && (
                        <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)', marginBottom:2 }}>₹{FMT(o.limitPrice)}</p>
                      )}
                      {o.executedPrice && (
                        <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)', marginBottom:2 }}>₹{FMT(o.executedPrice)}</p>
                      )}
                      {live && pending && (
                        <p style={{ fontSize:11, color:'var(--muted)' }}>Live: ₹{FMT(live)}</p>
                      )}
                      {isOpen ? <ChevronUp size={14} color="var(--muted)"/> : <ChevronDown size={14} color="var(--muted)"/>}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div style={{ padding:'0 18px 18px', borderTop:'1px solid var(--border)' }}>
                      {/* Pending limit order — show price progress */}
                      {pending && o.orderType==='LIMIT' && live && (
                        <div style={{ background:'#fffbeb', borderRadius:'var(--r)', padding:'12px 14px', margin:'14px 0', border:'1px solid rgba(244,161,0,0.2)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                            <span style={{ fontSize:12, color:'var(--muted)' }}>Your limit: <strong style={{ color:'var(--text)', fontFamily:'var(--mono)' }}>₹{FMT(o.limitPrice)}</strong></span>
                            <span style={{ fontSize:12, color:'var(--muted)' }}>Current: <strong style={{ color:'var(--text)', fontFamily:'var(--mono)' }}>₹{FMT(live)}</strong></span>
                          </div>
                          <div style={{ height:4, background:'var(--border)', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
                            <div style={{ height:'100%', width:`${Math.min(100, Math.max(0, (o.limitPrice/live)*100))}%`, background:live<=o.limitPrice?'var(--green-d)':'#f4a100', borderRadius:3, transition:'width 0.4s' }}/>
                          </div>
                          <p style={{ fontSize:11, color:'#92400e' }}>
                            {live <= o.limitPrice
                              ? '✅ Price condition met — will execute shortly'
                              : `⏳ ₹${FMT(live - o.limitPrice)} above your limit — waiting`
                            }
                          </p>
                        </div>
                      )}

                      {/* Market pending explanation */}
                      {pending && o.orderType==='MARKET' && (
                        <div style={{ background:'var(--blue-lt)', borderRadius:'var(--r)', padding:'10px 14px', margin:'14px 0', border:'1px solid rgba(83,103,255,0.2)', fontSize:12, color:'#1e3a8a' }}>
                          ⏳ Market order queued. Will execute at market price when market opens.
                        </div>
                      )}

                      {/* Detail grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:pending?0:14 }}>
                        {[
                          ['Order Type',   o.orderType],
                          ['Quantity',     `${o.quantity} shares`],
                          ['Status',       o.status],
                          ['Limit Price',  o.limitPrice?`₹${FMT(o.limitPrice)}`:'—'],
                          ['Mkt at Order', o.marketPriceAtOrder?`₹${FMT(o.marketPriceAtOrder)}`:'—'],
                          ['Executed At',  o.executedPrice?`₹${FMT(o.executedPrice)}`:pending?'Pending':'—'],
                        ].map(([k,v]) => (
                          <div key={k} style={{ background:'var(--bg)', borderRadius:'var(--r-sm)', padding:'9px 11px', border:'1px solid var(--border)' }}>
                            <p style={{ fontSize:10, color:'var(--muted)', fontWeight:600, letterSpacing:'0.4px', textTransform:'uppercase', marginBottom:4 }}>{k}</p>
                            <p style={{ fontSize:12, fontWeight:600, fontFamily:'var(--mono)', color:'var(--text)' }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Cancel button for pending */}
                      {pending && (
                        <button onClick={() => setCancelId(o.id)} style={{ marginTop:12, width:'100%', padding:'10px 0', background:'var(--red-lt)', border:'1px solid rgba(235,87,87,0.3)', borderRadius:'var(--r)', color:'var(--red)', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7 }}>
                          <X size={13}/> Cancel Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancel modal */}
      {cancelId && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(4px)' }}
          onClick={e => e.target===e.currentTarget && setCancelId(null)}>
          <div className="scale-in" style={{ background:'#fff', borderRadius:'var(--r-xl)', padding:'24px 22px', width:'100%', maxWidth:360, border:'1px solid var(--border)' }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:6 }}>Cancel this order?</h3>
            <p style={{ fontSize:13, color:'var(--muted)', marginBottom:6, lineHeight:1.6 }}>
              This removes the order from your history. Since it's still PENDING, <strong>no money has been deducted</strong> from your wallet — cancelling has no financial impact.
            </p>
            <p style={{ fontSize:12, color:'#92400e', background:'#fffbeb', padding:'9px 12px', borderRadius:'var(--r)', marginBottom:20, border:'1px solid rgba(244,161,0,0.2)' }}>
              ⚠️ The backend order may still be active since there's no cancel API endpoint.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setCancelId(null)} className="btn btn-outline" style={{ flex:1 }}>Keep it</button>
              <button onClick={() => doCancel(cancelId)} style={{ flex:1, padding:'11px 0', background:'var(--red)', border:'none', borderRadius:'var(--r)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
