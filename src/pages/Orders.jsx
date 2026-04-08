import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Clock, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, Info, TrendingDown } from 'lucide-react';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { getOrders, getStockData, getMarketStatus } from '../lib/api';

const FMT = v => v==null?'—':new Intl.NumberFormat('en-IN',{maximumFractionDigits:2}).format(v);
const INR = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(v??0);
const fmtDate = s => { try { return new Date(s).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}); } catch { return '—'; }};

const ST = {
  PENDING:   { label:'Pending',   bg:'#fffbeb', border:'rgba(244,161,0,0.3)',   text:'#92400e', dot:'#f4a100', Icon:Clock       },
  EXECUTED:  { label:'Executed',  bg:'#f0fdf4', border:'rgba(0,183,134,0.3)',   text:'#065f46', dot:'#00b386', Icon:CheckCircle },
  CANCELLED: { label:'Cancelled', bg:'#f8fafc', border:'rgba(148,163,184,0.3)', text:'#475569', dot:'#94a3b8', Icon:XCircle     },
};
const TABS = ['ALL','PENDING','EXECUTED'];

export default function Orders() {
  const { username } = useAuth();
  const [data,     setData]     = useState({ orders:[], totalOrders:0, pendingOrders:0, executedOrders:0 });
  const [livePx,   setLivePx]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('ALL');
  const [expanded, setExpanded] = useState(null);
  const market = getMarketStatus();

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const result = await getOrders(username, 'ALL');
      setData(result);
      // Fetch live prices for pending orders
      const pending = result.orders.filter(o => o.status === 'PENDING');
      const syms = [...new Set(pending.map(o=>o.symbol).filter(Boolean))];
      if (syms.length > 0) {
        const r = {};
        await Promise.allSettled(syms.map(async s => {
          try { const d = await getStockData(s,'1d','1m'); if(d?.meta?.price) r[s]=d.meta.price; } catch {}
        }));
        setLivePx(r);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [username]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(iv);
  }, [load]);

  const shown = tab==='ALL' ? data.orders : data.orders.filter(o=>o.status===tab);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <Header/>
      <main className="page" style={{ maxWidth:760 }}>

        {/* Header */}
        <div className="fade-up" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px', marginBottom:4 }}>Orders</h1>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>Total: <strong style={{ color:'var(--text)' }}>{data.totalOrders}</strong></span>
              <span style={{ fontSize:12, color:'#f4a100' }}>Pending: <strong>{data.pendingOrders}</strong></span>
              <span style={{ fontSize:12, color:'var(--green-d)' }}>Executed: <strong>{data.executedOrders}</strong></span>
            </div>
          </div>
          <button onClick={load} style={{ width:38, height:38, border:'1.5px solid var(--border)', background:'#fff', borderRadius:'var(--r)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <RefreshCw size={14} color="var(--text2)" style={{ animation:loading?'spin 0.8s linear infinite':'none' }}/>
          </button>
        </div>

        {/* Market status banner */}
        <div className="fade-up" style={{ background: market.open ? '#f0fdf4' : '#fffbeb', border:`1px solid ${market.open ? 'rgba(0,183,134,0.2)' : 'rgba(244,161,0,0.2)'}`, borderRadius:'var(--r)', padding:'10px 14px', marginBottom:16, display:'flex', gap:9, alignItems:'center' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:market.color, display:'inline-block', flexShrink:0, animation: market.open ? 'pulse 2s ease infinite' : 'none' }}/>
          <div>
            <span style={{ fontSize:12, fontWeight:600, color: market.open ? '#065f46' : '#92400e' }}>{market.label}</span>
            {!market.open && data.pendingOrders > 0 && (
              <span style={{ fontSize:11, color:'#92400e', marginLeft:8 }}>
                · {data.pendingOrders} pending order{data.pendingOrders!==1?'s':''} will execute when market opens
              </span>
            )}
            {market.open && data.pendingOrders > 0 && (
              <span style={{ fontSize:11, color:'#065f46', marginLeft:8 }}>
                · Scheduler checking pending orders every 10s
              </span>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="fade-up" style={{ background:'var(--blue-lt)', border:'1px solid rgba(83,103,255,0.15)', borderRadius:'var(--r)', padding:'10px 14px', marginBottom:16, display:'flex', gap:9, alignItems:'flex-start' }}>
          <Info size={13} color="var(--blue)" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ fontSize:12, color:'#1e3a8a', lineHeight:1.6 }}>
            <strong>MARKET orders</strong> execute immediately during 9:15 AM – 3:30 PM IST. Outside hours → PENDING, executes at open.
            <strong> LIMIT orders</strong> execute when market price ≤ your limit price. Scheduler runs every 10s during market hours.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
          {TABS.map(t => {
            const count = t==='ALL' ? data.totalOrders : t==='PENDING' ? data.pendingOrders : data.executedOrders;
            return (
              <button key={t} onClick={()=>setTab(t)} style={{ padding:'6px 16px', borderRadius:20, border:tab===t?'none':'1.5px solid var(--border)', fontSize:13, fontWeight:tab===t?700:400, cursor:'pointer', flexShrink:0, transition:'all 0.15s', background:tab===t?'var(--green)':'#fff', color:tab===t?'#fff':'var(--text2)' }}>
                {t}{count>0&&<span style={{ marginLeft:5, opacity:0.85, fontSize:11 }}>({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Orders list */}
        {loading && data.orders.length===0 ? (
          Array(3).fill(0).map((_,i) => <div key={i} className="skeleton" style={{ height:72, borderRadius:'var(--r-md)', marginBottom:8 }}/>)
        ) : shown.length===0 ? (
          <div style={{ textAlign:'center', padding:'56px 20px', background:'#fff', borderRadius:'var(--r-lg)', border:'1px solid var(--border)' }}>
            <ClipboardList size={44} color="var(--muted2)" style={{ margin:'0 auto 14px', display:'block' }}/>
            <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{tab==='ALL'?'No orders yet':`No ${tab.toLowerCase()} orders`}</p>
            {tab==='ALL'&&<p style={{ fontSize:13, color:'var(--muted)' }}>Place orders from the Trade or Search page</p>}
          </div>
        ) : (
          <div>
            {shown.map((o, idx) => {
              const isOpen = expanded===(o.id||idx);
              const sym    = (o.symbol||'').replace('.NS','');
              const st     = ST[o.status]||ST.PENDING;
              const StIc   = st.Icon;
              const live   = livePx[o.symbol];
              const pending = o.status==='PENDING';
              const total  = (o.executedPrice||o.price||0) * (o.quantity||0);

              return (
                <div key={o.id||idx} style={{ background:'#fff', border:'1px solid var(--border)', borderRadius:'var(--r-md)', marginBottom:8, overflow:'hidden', boxShadow:'var(--shadow-xs)', transition:'border-color 0.12s' }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border2)'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>

                  <button onClick={()=>setExpanded(isOpen?null:(o.id||idx))}
                    style={{ width:'100%', display:'flex', alignItems:'center', padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', gap:12, textAlign:'left' }}>
                    <div style={{ width:38, height:38, borderRadius:9, background:st.bg, border:`1px solid ${st.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <StIc size={17} color={st.dot}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{sym}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background:st.bg, color:st.text, border:`1px solid ${st.border}` }}>{st.label}</span>
                        <span style={{ fontSize:11, color:'var(--muted)', background:'var(--bg)', padding:'1px 7px', borderRadius:4 }}>{o.orderType}</span>
                      </div>
                      <p style={{ fontSize:11, color:'var(--muted)' }}>{o.quantity} share{o.quantity!==1?'s':''} · {fmtDate(o.createdAt)}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginRight:8 }}>
                      <p style={{ fontSize:14, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)', marginBottom:2 }}>
                        ₹{FMT(o.executedPrice||o.limitPrice||o.price)}
                      </p>
                      {total > 0 && <p style={{ fontSize:11, color:'var(--muted)' }}>{INR(total)}</p>}
                      {live&&pending&&<p style={{ fontSize:11, color: live<=(o.limitPrice||o.price) ? 'var(--green-d)' : '#f4a100' }}>Live ₹{FMT(live)}</p>}
                    </div>
                    {isOpen?<ChevronUp size={14} color="var(--muted)"/>:<ChevronDown size={14} color="var(--muted)"/>}
                  </button>

                  {isOpen && (
                    <div style={{ padding:'0 18px 18px', borderTop:'1px solid var(--border)' }}>
                      {/* Pending status explanation */}
                      {pending && (
                        <div style={{ margin:'14px 0', padding:'12px 14px', borderRadius:'var(--r)', background: market.open ? 'var(--green-lt)' : '#fffbeb', border:`1px solid ${market.open ? 'rgba(0,183,134,0.2)' : 'rgba(244,161,0,0.2)'}` }}>
                          <p style={{ fontSize:12, fontWeight:600, color: market.open ? '#065f46' : '#92400e', marginBottom:4 }}>
                            {market.open
                              ? '🔄 Market is OPEN — scheduler checking this order every 10 seconds'
                              : `⏰ Market CLOSED — order will execute when market opens at 9:15 AM IST`
                            }
                          </p>
                          {o.orderType==='LIMIT' && live && (
                            <>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:11 }}>
                                <span style={{ color:'var(--muted)' }}>Your limit: <strong style={{ fontFamily:'var(--mono)' }}>₹{FMT(o.limitPrice||o.price)}</strong></span>
                                <span style={{ color:'var(--muted)' }}>Live now: <strong style={{ fontFamily:'var(--mono)' }}>₹{FMT(live)}</strong></span>
                              </div>
                              <div style={{ height:4, background:'var(--border)', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
                                <div style={{ height:'100%', width:`${Math.min(100,Math.max(5,((o.limitPrice||o.price)/live)*100))}%`, background:live<=(o.limitPrice||o.price)?'var(--green-d)':'#f4a100', borderRadius:3, transition:'width 0.4s' }}/>
                              </div>
                              <p style={{ fontSize:11, color: live<=(o.limitPrice||o.price)?'#065f46':'#92400e' }}>
                                {live<=(o.limitPrice||o.price) ? '✅ Condition met — will execute in next scheduler run' : `₹${FMT(live-(o.limitPrice||o.price))} above your limit`}
                              </p>
                            </>
                          )}
                          {o.orderType==='MARKET' && (
                            <p style={{ fontSize:11, color:'#92400e', marginTop:4 }}>
                              Market order placed outside trading hours. Will execute at market open price.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Detail grid */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:8, marginTop: pending ? 0 : 14 }}>
                        {[
                          ['Order Type', o.orderType],
                          ['Quantity',   `${o.quantity} shares`],
                          ['Status',     o.status],
                          ['Price',      `₹${FMT(o.price)}`],
                          ['Executed',   o.executedPrice?`₹${FMT(o.executedPrice)}`:pending?'Pending':'—'],
                          ['Total',      total>0?INR(total):'—'],
                        ].map(([k,v])=>(
                          <div key={k} style={{ background:'var(--bg)', borderRadius:'var(--r-sm)', padding:'9px 11px', border:'1px solid var(--border)' }}>
                            <p style={{ fontSize:10, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>{k}</p>
                            <p style={{ fontSize:12, fontWeight:700, fontFamily:'var(--mono)', color:'var(--text)' }}>{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
